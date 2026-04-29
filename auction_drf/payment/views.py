from decimal import Decimal
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.urls import reverse
import stripe
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.utils import timezone
from .models import Payment, TopUp
from auction_item.models import Bid, AuctionRoom
from users.models import User
from .serializers import PaymentHistorySerializer, TopupHistorySerializer
from django.db.models import Q

stripe.api_key = settings.STRIPE_SECRET_KEY

class TopUpView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            amount = int(request.data.get('amount', 0))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount'}, status=400)

        if amount <= 0:
            return Response({'error': 'Amount must be greater than 0'}, status=400)
        
        user = request.user
        
        line_items = [
            {
                'price_data': {
                    'currency': 'inr',
                    'unit_amount': int(amount) * 100,
                    'product_data': {'name': 'Top-Up Amount'}
                },
                'quantity': 1,
            },
        ]

        topup = TopUp.objects.create(
            user=user,
            amount=amount,
        )

        try:
            MY_DOMAIN = "http://localhost:3000"
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url= MY_DOMAIN + '/topup/success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url= MY_DOMAIN + '/topup/cancel',
                metadata={
                    'payment_id': topup.id,
                    'amount': str(amount),
                }
            )
            topup.transaction_id = session.id
            topup.save()

            return Response({'session_url': session.url}, status=200)

        except Exception as e:
            topup.delete()
            return Response({'error': str(e)}, status=500)

class TopUpSuccessView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            session_id = request.GET.get('session_id')

            topup = get_object_or_404(TopUp, transaction_id=session_id)

            if topup.payment_status == TopUp.PAYMENT_CHOICES.SUCCESS:
                return Response({'message': 'Already processed'}, status=200)

            with transaction.atomic():
                topup.payment_status = TopUp.PAYMENT_CHOICES.SUCCESS
                topup.paid_at = timezone.now()
                topup.save()

                user = topup.user
                user.wallet_balance += topup.amount
                user.save()

            return Response({'message': 'TopUp successful'}, status=200)
        except Exception as e:
            return Response({'message':str(e)}, status=500)


class TopUpCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request): 
        session_id = request.GET.get('session_id')

        topup = get_object_or_404(TopUp, transaction_id=session_id)
        topup.payment_status = TopUp.PAYMENT_CHOICES.CANCELLED
        topup.save()

        return Response({'message': 'TopUp cancelled'}, status=200)

class PaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, bid_id):
        try:
            bid = Bid.objects.select_related(
                'bidder', 'auction_room'
            ).get(id=bid_id)
        except Bid.DoesNotExist:
            return Response({'error': 'Bid not found'}, status=404)

        bidder = bid.bidder
        bid_amount = bid.bid_amount
        auction = bid.auction_room
        auctioneer = auction.created_by
        platform_fee = Decimal('100')
        total_amount = bid_amount + platform_fee

        if bidder != request.user:
            return Response({'error': 'You are not the winner'}, status=403)

        if bid.status != Bid.Status.WON:
            return Response({'error': 'This bid has not won'}, status=400)
        

        line_items = [
            {
                'price_data': {
                    'currency': 'inr',
                    'unit_amount': int(bid_amount) * 100,
                    'product_data': {'name': 'Auction item payment'}
                },
                'quantity': 1,
            },
            {
                'price_data': {
                    'currency': 'inr',
                    'unit_amount': int(platform_fee) * 100,
                    'product_data': {'name': 'Platform fee'}
                },
                'quantity': 1,
            }
        ]

        if bidder.wallet_balance >= total_amount:
            if bid.payment_status == Bid.PAYMENT_STATUS.PAID:
                return Response({'message':'Already Paid'}, status=400)
            with transaction.atomic():
                bidder.wallet_balance -= total_amount
                bidder.save()

                bid.payment_status = Bid.PAYMENT_STATUS.PAID
                bid.save()

                auctioneer.wallet_balance += bid_amount  
                auctioneer.save()
                
                payment, created = Payment.objects.get_or_create(
                    bid=bid,
                    defaults={
                        'auction':auction,
                        'user':bidder,
                        'payment_status':Payment.PAYMENT_CHOICES.SUCCESS,
                        'transaction_id':f'wallet_{bid_id}'
                    }
                )
                
                if not created:
                    payment.payment_status = Payment.PAYMENT_CHOICES.SUCCESS
                    payment.transaction_id = f'wallet_{bid.id}'
                    payment.paid_at = timezone.now()
                    payment.save()
                

            return Response({
                'message': 'Payment settled from wallet',
                'winner': bidder.first_name,
                'amount': str(total_amount),
                'payment_id': payment.id
            }, status=200)

        pay, created = Payment.objects.get_or_create(
            auction=auction,
            bid=bid,
            user=bidder,
            payment_status=Payment.PAYMENT_CHOICES.YET_TO_PAY
        )
        if not created:
            try:
                MY_DOMAIN = "http://localhost:3000"
                session = stripe.checkout.Session.create(
                    payment_method_types=['card'],
                    line_items=line_items,
                    mode='payment',
                    success_url= MY_DOMAIN + '/wallet-success?session_id={CHECKOUT_SESSION_ID}',
                    cancel_url= MY_DOMAIN + '/cancel',
                    metadata={
                        'payment_id': pay.id,
                        'bid_amount': str(bid_amount),
                        'auctioneer_id': auctioneer.id
                    }
                )
                pay.transaction_id = session.id
                pay.save()

                return Response({'session_url': session.url}, status=200)

            except Exception as e:
                return Response({'error': str(e)}, status=500)
        elif created:
            pay.delete()
            return Response({'message':'Payment Cancelled, Try to do again'})


class StripeSuccessView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        session_id = request.GET.get('session_id')

        payment = get_object_or_404(Payment, transaction_id=session_id)
        bid = payment.bid

        if payment.payment_status == Payment.PAYMENT_CHOICES.SUCCESS:
            return Response({'message': 'Already processed'}, status=200)

        print("SESSION ID FROM FRONTEND:", session_id)
        print("TOPUP EXISTS:", Payment.objects.filter(transaction_id=session_id).exists())
        with transaction.atomic():
            payment.payment_status = Payment.PAYMENT_CHOICES.SUCCESS
            payment.paid_at = timezone.now()
            payment.save()

            bid.payment_status = Bid.PAYMENT_STATUS.PAID
            bid.save()

            auctioneer = payment.auction.created_by
            auctioneer.wallet_balance += payment.bid.bid_amount
            auctioneer.save()

        return Response({'message': 'Payment successful'}, status=200)


class StripeCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request): 
        session_id = request.GET.get('session_id')

        payment = get_object_or_404(Payment, transaction_id=session_id)
        bid = payment.bid
        payment.payment_status = Payment.Status.CANCELLED
        payment.save()

        bid.payment_status = Bid.PAYMENT_STATUS.CANCELLED

        return Response({'message': 'Payment cancelled'}, status=200)
    
class transactionHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, history_type=None):
        try:
            user = request.user

            if history_type == 'topup':
                topup = TopUp.objects.filter(user=user).order_by('-created_at')
                serializer = TopupHistorySerializer(topup, many=True)
                print(serializer.data)
                return Response({"type": "payment",'data':serializer.data}, status=200)
            
            elif history_type == 'payment':
                if user.is_auctioner:
                    payments = Payment.objects.filter(Q(user=user) | Q(auction__created_by=user)).select_related('bid', 'auction').order_by('-created_at')
                else:
                    payments = Payment.objects.filter(user=user).select_related('bid', 'auction').order_by('-created_at')
                serializer = PaymentHistorySerializer(payments, many=True)
                return Response({"type": "payment",'data':serializer.data}, status=200)
            
            return Response({'error':'Unable to fetch history'}, status=400)
            
        except Exception as e:
            print(str(e))
            return Response({'message':str(e)}, status=500)