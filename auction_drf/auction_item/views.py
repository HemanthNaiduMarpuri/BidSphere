from datetime import timedelta
from django.shortcuts import get_object_or_404, render
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenObtainPairSerializer
from .serializers import AuctionRoomCreateSerializer, AuctionRoomDetailSerializer, AuctionItemSerializer, BidSerializer, ChatMessageSerializer, WishListSerializer, RequestPanelSerializer, VoteItemSerializer
from .models import AuctionRoom, AuctionItem, Bid, ChatMessage, Wishlist, RequestPanel, VoteItem
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.views import APIView
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework.exceptions import PermissionDenied
from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from users.models import User
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import F

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer



class GoogleLogin(APIView):
    permission_classes = []
    def post(self, request):
        token = request.data.get("credential")

        try:
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                "571794476138-i00ddd62l4ak8l7m9hdho6oauo94l857.apps.googleusercontent.com"
            )
            
            email = idinfo["email"]
            name = idinfo.get("name", "")

            user, _ = User.objects.get_or_create(email=email)
            user.first_name = name
            user.save()

            refresh = RefreshToken.for_user(user)

            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "email": user.email,
                    "name": user.first_name
                }
            })

        except Exception as e:
            return Response({"error": str(e)}, status=401)

def broadcast(room_id, payload):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(f'auction_{room_id}', payload)

class AuctionRoomView(viewsets.ModelViewSet):
    queryset = AuctionRoom.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AuctionRoomCreateSerializer
        return AuctionRoomDetailSerializer
    
    def get_queryset(self):
        user = self.request.user
        res = AuctionRoom.objects.filter(is_private=True)

        if user.is_auctioner:
            return AuctionRoom.objects.filter(created_by=user)
        return AuctionRoom.objects.all()
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def start(self, request, pk=None):
        auction = self.get_object()

        if auction.created_by != request.user:
             return Response({'error': 'Not your auction'}, status=400)
        if auction.status != AuctionRoom.Status.SCHEDULED:
             return Response({'error': 'Auction must be scheduled'}, status=400)
        if auction.start_time > timezone.now():
            return Response({'error': 'Cannot start auction before scheduled time'}, status=400)

        auction.status = AuctionRoom.Status.LIVE
        auction.save()
        broadcast(auction.id, {'type': 'auction_status', 'status': 'Live'})

        return Response({'message': 'Auction is Live'}, status=200)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def close(self, request, pk=None):
        try:
            auction = self.get_object()

            if auction.created_by != request.user:
                return Response({'error': 'Not your auction'}, status=403)
            if auction.status != AuctionRoom.Status.LIVE:
                return Response({'error': 'Auction is not Live'}, status=400)

            auction.status = AuctionRoom.Status.CLOSED
            auction.save()
            broadcast(auction.id, {'type': 'auction_status', 'status': 'Closed'})

            return Response({'message': 'Auction is Closed'}, status=200)
    
        except Exception as e:
            return Response({'message':'hello'},  status=500)
    
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def schedule(self, request, pk=None):
        auction = self.get_object()

        if auction.created_by != request.user:
            return Response({'error': 'Not your auction'}, status=403)
        if auction.status != AuctionRoom.Status.DRAFT:
             return Response({'error': 'Auction is not drafted'}, status=400)

        auction.status = AuctionRoom.Status.SCHEDULED
        auction.save()

        return Response({'message': 'Auction is Scheduled'}, status=200)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def verification(self, request, pk=None):
        auction = self.get_object()

        if not auction.is_private:
            return Response({'message': 'Public auction'}, status=200)

        access_code = request.data.get('access_code', '')

        if not access_code:
            return Response({"error": "No code provided"}, status = 404)
        
        if access_code == auction.access_code:
            return Response({"error": "Access Granted"}, status = 200)
        
        return Response({"error": "Incorrect Code"}, status=403)
        
    
class AuctionItemView(viewsets.ModelViewSet):
    serializer_class = AuctionItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'  
    lookup_url_kwarg = 'item_uuid' 

    def get_queryset(self):
        auction_id = self.kwargs.get('room_uuid')
        return AuctionItem.objects.filter(auction_room__id=auction_id)
    
    def perform_create(self, serializer):
        auction_id = self.kwargs.get('room_uuid')
        auction = AuctionRoom.objects.get(id=auction_id)

        if auction.created_by != self.request.user:
            raise PermissionDenied('You can only add items to your own auctions')
        
        serializer.save(auction_room = auction)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def sold(self, request, room_uuid=None, item_uuid=None):
        try:
            item = self.get_object()
            auction = item.auction_room

            if auction.created_by != request.user:
                raise PermissionDenied('Not your auction')

            if item.is_sold == AuctionItem.Status.SOLD:
                return Response({'error': 'Item already sold'}, status=400)
            
            winning_bid = Bid.objects.filter(auction_item=item, is_winning=True).first()
            if not winning_bid:
                return Response({'message': 'There is no active winning bid'}, status=500)
            if winning_bid:
                with transaction.atomic():
                    winning_bid.status = Bid.Status.WON
                    winning_bid.save()
                
                    item.is_sold = AuctionItem.Status.SOLD
                    item.save()
                broadcast(auction.id, {'type': 'item_status', 'status': 'Sold', 'item_id':item.id})

                return Response({'message': f'{item.name} marked as sold'} ,status=200)
            
        except Exception as e:
            return Response({'message':str(e)}, status=500) 

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unsold(self, request, room_uuid=None, item_uuid=None):
        try:
            item = self.get_object()
            auction = item.auction_room

            if auction.created_by != request.user:
                raise PermissionDenied('Not your auction')

            if item.is_sold == AuctionItem.Status.SOLD:
                return Response({'error': 'Item already sold'}, status=400)
            
            winning_bid = Bid.objects.filter(auction_item=item, is_winning=True).first()
            
            if winning_bid:
                with transaction.atomic():
                    winning_bid.is_winning = False
                    winning_bid.status = Bid.Status.OUTBID
                    winning_bid.save()
            with transaction.atomic():
                    item.is_sold = AuctionItem.Status.NOT_SOLD
                    item.save()
            broadcast(auction.id, {'type': 'item_status', 'status': 'Un Sold', 'item_id':item.id})

            return Response({'message': f'{item.name} marked as not sold'}, status=200)
        
        except Exception as e:
            return Response({'message':str(e)}, status=500) 

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def item_pass(self, request, room_uuid=None, item_uuid=None):
        try:
            item = self.get_object()
            auction = item.auction_room

            if auction.created_by != request.user:
                raise PermissionDenied('Not your auction')

            if item.is_sold == AuctionItem.Status.SOLD:
                return Response({'error': 'Item already sold'}, status=400)
            
            winning_bid = Bid.objects.filter(auction_item=item, is_winning=True).first()
            if winning_bid:
                with transaction.atomic():
                    winning_bid.is_winning = False
                    winning_bid.status = Bid.Status.OUTBID
                    winning_bid.save()

            with transaction.atomic():
                item.is_sold = AuctionItem.Status.PASS
                item.save() 
        
            broadcast(auction.id, {'type': 'item_status', 'status': 'Pass', 'item_id':item.id})
        
            return Response({'message': f'{item.name} marked as passed'}, status=200)
            
        except Exception as e:
            return Response({'message':str(e)}, status=500) 
        

    @action(detail=True, methods=['post'],  permission_classes=[permissions.IsAuthenticated])
    def retractBid(self, request, room_uuid=None, item_uuid=None):
        try:
            auction_item_id = self.kwargs.get('item_uuid')
            auction_id = self.kwargs.get('room_uuid')

            item = get_object_or_404(AuctionItem, id=auction_item_id)
            auction = get_object_or_404(AuctionRoom, id=auction_id)
            
            user = request.user

            if auction.created_by == user:
                return Response({'message':"Auctioneer can't use this feature"}, status=403)
            
            if item.ends_at and timezone.now() > item.ends_at:
                return Response({'message': 'Time is up'}, status=400)
            
            winning_bid = Bid.objects.filter(auction_item=item, is_winning=True).select_related('bidder').first()            

            if not winning_bid:
                return Response({'message': 'No active bid'}, status=400)
            
            if winning_bid.bidder != user:
                return Response({'message':"You can't use this, you are not the top bidder"}, status=403)
            
            with transaction.atomic():
                winning_bid.delete()
            
                next_bid = Bid.objects.filter(auction_item=item, is_winning=False).exclude(id=winning_bid.id).order_by('-bid_amount').first()
                    
                if next_bid:
                    next_bid.is_winning = True
                    next_bid.status = Bid.Status.ACTIVE
                    next_bid.save()

            broadcast(auction.id, {'type':'retract_bid', 'item':item.name, 'bidder':user.first_name})

            if next_bid:
                broadcast(auction.id, {'type':'bid_update','bid_amount':next_bid.bid_amount ,'bidder':next_bid.bidder.email, 'item':item.name})
            else:
                broadcast(auction.id, {'type':'bid_update','bid_amount':None ,'bidder':None, 'item':item.name})
            
                return Response({'message':'Your Bid is successfully retracted'}, status=200)
            return Response({'message': 'Time is up'}, status=400)
        
        except Exception as e:
            return Response({'message':str(e)}, status=500)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def current_item(self, request, room_uuid=None, item_uuid=None):
        active_item = AuctionItem.objects.filter(auction_room__id=room_uuid, is_sold=AuctionItem.Status.ACTIVE).first()
        
        if not active_item:
            return Response({"item": None,"highest_bid": None,"ends_at": None}, status=200)
        
        bid = active_item.bids.filter(is_winning=True).first()
        
        return Response({
            "item": AuctionItemSerializer(active_item).data,
            "highest_bid": bid.bid_amount if bid else None,
            "highest_bidder": bid.bidder.email if bid else None,
            "ends_at": active_item.ends_at.isoformat() if active_item.ends_at else None},
            status=200
        )
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def next_item(self, request, room_uuid=None, item_uuid=None):
        auction_pk = self.kwargs.get('room_uuid')
        auction_room = get_object_or_404(AuctionRoom, id=auction_pk)
        
        if auction_room.created_by != request.user:
            raise PermissionDenied('Not your auction')

        with transaction.atomic():
            active_item = AuctionItem.objects.filter(
                auction_room=auction_room,
                is_sold=AuctionItem.Status.ACTIVE
            ).first()
            if active_item:
                with transaction.atomic():
                    has_bid = active_item.bids.filter(is_winning=True).update(is_winning=False, status=Bid.Status.WON if has_bid else Bid.Status.OUTBID)
                    active_item.is_sold = AuctionItem.Status.SOLD if has_bid else AuctionItem.Status.NOT_SOLD
                    active_item.save()

            next_item = AuctionItem.objects.filter(auction_room=auction_room, is_sold=AuctionItem.Status.PENDING).order_by('order').first()
            if next_item:
                next_item.is_sold = AuctionItem.Status.ACTIVE
                next_item.ends_at = timezone.now() + timedelta(seconds=next_item.duration)
                next_item.save()

                channel_layer = get_channel_layer()
                highest = Bid.objects.filter(auction_item=next_item, is_winning=True).order_by('-bid_amount').first()

                async_to_sync(channel_layer.group_send)(
                    f'auction_{auction_pk}',
                    {
                        'type':'item_changed',
                        'id':next_item.id,
                        'name':next_item.name,
                        'base_price':next_item.base_price,
                        'highest_bid': str(highest.bid_amount) if highest else None,
                        'ends_at': next_item.ends_at if next_item.ends_at else None, 
                    }
                )

                return Response({'next_item':AuctionItemSerializer(next_item).data}, status=200)

            else:
                return Response({'message':'No Items Left'}, status=200)
            
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def activate_item(self, request, room_uuid=None, item_uuid=None):
        auction_pk = self.kwargs.get('room_uuid')
        auction_item_id = self.kwargs.get('item_uuid')

        auction_room = get_object_or_404(AuctionRoom, id=auction_pk)
        auction_item = get_object_or_404(AuctionItem, id=auction_item_id)
        method = request.query_params.get('method')

        if auction_room.created_by != request.user:
            raise PermissionDenied('Not your auction')
    
        if auction_room.status == AuctionRoom.Status.CLOSED:
            raise PermissionDenied('Auction Closed')
        
        if auction_item.is_sold == AuctionItem.Status.ACTIVE:
            return Response({'message':'Item is Active'}, status=200)
        
        if not method == 'request-panel' and auction_item.is_sold != AuctionItem.Status.PENDING:
            return Response({'message': 'Invalid state'}, status=400)

        
        with transaction.atomic():
            auction_item.is_sold = AuctionItem.Status.ACTIVE
            auction_item.ends_at = timezone.now() + timedelta(seconds=auction_item.duration)
            auction_item.save()
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'auction_{auction_pk}',
            {
                'type': 'item_changed',
                'id': auction_item.id,
                'name': auction_item.name,
                'base_price': str(auction_item.base_price),
                'highest_bid': None,
                'ends_at': auction_item.ends_at,
            }
        )


        return Response({'message':'Item Activated'}, status=200)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def changeStatus(self, request, room_uuid=None, item_uuid=None):
        auction_pk = self.kwargs.get('room_uuid')
        item_id = self.kwargs.get('item_uuid')

        auction = get_object_or_404(AuctionRoom, id=auction_pk)
        item = get_object_or_404(AuctionItem, id=item_id)

        user = request.user

        if auction.created_by != user:
            raise PermissionDenied('Not your auction')

        if auction.status != AuctionRoom.Status.LIVE:
            raise PermissionDenied('Auction is not live')
        
        if item.is_sold not in [AuctionItem.Status.PENDING, AuctionItem.Status.SOLD, AuctionItem.Status.ACTIVE]:
            with transaction.atomic():
                item.is_sold = AuctionItem.Status.PENDING
                item.save()

                return Response({'message':'Item status changed to pending'}, status=200)
            
        else:
            return Response({'message':'Item is still active'}, status=403)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def extendTime(self, request, room_uuid=None, item_uuid=None):

        item_id = self.kwargs.get('item_uuid')
        auction_id = self.kwargs.get('room_uuid')

        item = get_object_or_404(AuctionItem, id=item_id)
        auction = get_object_or_404(AuctionRoom, id=auction_id)
        print(item, auction)
        

        if auction.status != AuctionRoom.Status.LIVE:
            raise PermissionDenied('Auction is not live')
        
        if item.is_sold != AuctionItem.Status.ACTIVE:
            return Response({'error': 'Item not active'}, status=400)

        if timezone.now() > item.ends_at:
            return Response({'error': 'Time already ended'}, status=400)

        if item.is_sold == AuctionItem.Status.SOLD:
            raise PermissionDenied('Auction Item is Sold')
        
        MAX_LIMIT = 5
        if item.extension_count >= MAX_LIMIT:
            return Response({'error': 'Extension limit reached'}, status=400)
        
        remaining = (item.ends_at - timezone.now()).total_seconds()
        if remaining > 10:
            return Response({'error': 'You can extend only in last 10 seconds'}, status=400)

        with transaction.atomic():
            item.ends_at = item.ends_at + timedelta(seconds=5)
            item.extension_count += 1
            item.save()

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'auction_{auction_id}',
            {
                'type': 'timer_extended',
                'item_id': item.id,
                'ends_at': item.ends_at,
            }
        )

        return Response({'message': 'Timer extended by 5 seconds', 'ends_at': item.ends_at.isoformat(), 'remaining_extensions': MAX_LIMIT - item.extension_count}, status=200)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def bid_history(self, request, room_uuid=None):
        active_item = AuctionItem.objects.filter(auction_room_id=room_uuid, is_sold=AuctionItem.Status.ACTIVE).first()
        if not active_item:
            return Response([])
        
        bids = Bid.objects.filter(auction_item=active_item).select_related('bidder').order_by('-bid_amount')[:20]
        return Response([
            {
                "bidder": b.bidder.email,
                "bidder_id": b.bidder.id,
                "amount": str(b.bid_amount),
                "time": b.placed_at.strftime("%H:%M:%S")
            } for b in bids
        ])
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def requested_items(self, request, room_uuid=None):
        auction_items = AuctionItem.objects.count()
        if auction_items <= 0:
            return Response([])
        
        request_items = RequestPanel.objects.filter(auction_room=room_uuid).annotate(score=F('likes') - F('dislikes')).order_by('-score', '-likes')
        items = RequestPanelSerializer(request_items, many=True)
        return Response(items.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def request_item(self, request, room_uuid=None, item_uuid=None):
        try:
            requester = request.user
            if not requester.is_authenticated or requester.is_auctioner or requester.is_superuser:
                return Response({'message':"User not allowed to request item"}, status=400)
            
            now = timezone.now()
            
            auction_room = get_object_or_404(AuctionRoom, id=room_uuid)
            auction_item = get_object_or_404(AuctionItem, id=item_uuid)

            if auction_room.status == AuctionRoom.Status.CLOSED:
                return Response({'message':"Can't request item auction is closed"})
            
            if now >= auction_room.end_time:
                return Response({"error": "Auction has already closed."}, status=400)
            
            time_remaining = auction_room.end_time - now
            if time_remaining.total_seconds() < 120:
                return Response({"error": "Bidding is disabled in the final 2 minutes."}, status=403)
            
            if auction_item.is_sold in [AuctionItem.Status.ACTIVE, AuctionItem.Status.SOLD]:
                return Response({"message": "item may be in active stage or sold out"}, status=400) 
            
            with transaction.atomic():
                panel = RequestPanel.objects.filter(auction_room=auction_room, auction_item=auction_item).first()

                if panel:
                    return Response({'message': 'Already requested', 'panel_id':panel.id},status=400)
   
                new_item = RequestPanel.objects.create(auction_room=auction_room, auction_item=auction_item)
                new_item.save()

                return Response({'message':'Item Requested and created'}, status=200)

        except Exception as e:
            return Response({'message':str(e)}, status=500)
        
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject_request_item(self, request, room_uuid=None, item_uuid=None):
        try:
            user = request.user
            auction_room = get_object_or_404(AuctionRoom, id=room_uuid)
            auction_item = get_object_or_404(AuctionItem, id=item_uuid)
            
            if auction_room.created_by != user:
                return Response({'message':"User can't do this action"}, status=403)
            
            with transaction.atomic():
                item = RequestPanel.objects.get(auction_room=auction_room, auction_item=auction_item)
                item.is_accepted = RequestPanel.REQUEST_CHOICES.REJECTED
                item.save()

            return Response({'message':'Item Successfully Rejected'}, status=200)
        
        except Exception as e:
            return Response({'message':str(e)}, status=500)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def vote_item(self, request, panel_uuid=None):
        try:
            user = request.user
            serializer = VoteItemSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            vote = serializer.validated_data['vote']

            panel = get_object_or_404(RequestPanel, id=panel_uuid)

            existing_vote = VoteItem.objects.filter(user=user, request_panel = panel).first()

            if panel.auction_room.status == AuctionRoom.Status.CLOSED:
                return Response({'message': 'Auction closed'}, status=400)

            with transaction.atomic():
                if not existing_vote:
                    if vote == 'like':
                        vote_ = VoteItem.objects.create(user=user, request_panel=panel, vote=VoteItem.VOTE.LIKE)
                        vote_.save()
                        panel.likes = F('likes') + 1
                        panel.save()
                        panel.refresh_from_db()

                    else:
                        vote_ = VoteItem.objects.create(user=user, request_panel=panel, vote=VoteItem.VOTE.DISLIKE)
                        vote_.save()
                        panel.dislikes = F('dislikes') + 1
                        panel.save()
                        panel.refresh_from_db()

                    return Response({'message':'Voted Successfully'}, status=200)
                
                if (existing_vote == VoteItem.VOTE.LIKE and vote == 'like') or (existing_vote == VoteItem.VOTE.DISLIKE and vote == 'dislike'):
                    return Response({'message':'Already Voted'}, status=400)

                if (existing_vote == VoteItem.VOTE.LIKE and vote == 'dislike'):
                    panel.likes = F('likes') - 1
                    panel.dislikes = F('dislikes') + 1

                    existing_vote.vote = VoteItem.VOTE.DISLIKE
                    existing_vote.save()

                if (existing_vote == VoteItem.VOTE.DISLIKE and vote == 'like'):
                    panel.likes = F('dislikes') - 1
                    panel.dislikes = F('likes') + 1

                    existing_vote.vote = VoteItem.VOTE.LIKE
                    existing_vote.save()
                
                panel.save()
                panel.refresh_from_db()

            return Response({'message': 'Vote updated', 'likes': panel.likes, 'dislikes': panel.dislikes})

        except Exception as e:
            return Response({'message':str(e)}, status=500)

class BidView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return Bid.objects.filter(bidder=user)
    
    def post(self, request):
        try:
            serializer = BidSerializer(data = request.data, context={'request': request})
            
            if not serializer.is_valid():
                print(serializer.errors)
                return Response(serializer.errors, status=400)
            
            item_id = serializer.validated_data['auction_item'].id
            
            with transaction.atomic():
                auction_item = AuctionItem.objects.select_for_update().get(id=item_id)
                
                if timezone.now() > auction_item.ends_at:
                    return Response({'error': 'Auction ended'}, status=400)
                
                new_amount = serializer.validated_data['bid_amount']

                if new_amount <= auction_item.base_price:
                    return Response({'error': 'Bid too low'}, status=400)
                
                auction_item.bids.filter(is_winning=True).update(is_winning=False, status=Bid.Status.OUTBID)

                bid = serializer.save(bidder=request.user,is_winning=True, status=Bid.Status.ACTIVE)

                auction_item.base_price = new_amount
                auction_item.save()

            channel_layer = get_channel_layer()

            async_to_sync(channel_layer.group_send)(
                    f'auction_{auction_item.auction_room.id}',
                    {
                        'type':'bid_update',
                        'bid_amount':str(bid.bid_amount),
                        'bidder':bid.bidder.email,
                        'item':bid.auction_item.name
                    }
            )

            return Response(BidSerializer(bid).data, status=201)
        except Exception as e:
            print(e)
            return Response({'message':str(e)}, status=500)
    
    def get(self, request, status=None, *args, **kwargs):
        status = request.query_params.get('status')
        bids = Bid.objects.filter(bidder=request.user).select_related('auction_item', 'auction_room').order_by('-placed_at')
        if status:
            bids = bids.filter(status=status)
            
        serializer = BidSerializer(bids, many=True)
        return Response(serializer.data)
    
class ChatMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, room_uuid):
        messages = ChatMessage.objects.filter(auction=room_uuid).order_by('-created_at')[:50]

        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)
    
class WishListView(viewsets.ModelViewSet):
    serializer_class = WishListSerializer
    authentication_classes = [JWTAuthentication] 
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Wishlist.objects.filter(user=user, is_wishlist=True).select_related('auction_item', 'auction_room')
        
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def toggle(self, request, room_uuid=None, item_uuid=None):
        try:
            user = request.user

            auction_room = get_object_or_404(AuctionRoom, id=room_uuid)
            auction_item = get_object_or_404(AuctionItem, id=item_uuid)

            with transaction.atomic():
                wishlist, created = Wishlist.objects.get_or_create(
                    user=user,
                    auction_item=auction_item,
                    defaults={
                        'auction_room': auction_room,
                        'is_wishlist': True
                    }
                )

                if not created:
                    wishlist.is_wishlist = not wishlist.is_wishlist
                    wishlist.save()

            return Response({
                'message': 'Added to wishlist' if wishlist.is_wishlist else 'Removed from wishlist',
                'wishlisted': wishlist.is_wishlist
            }, status=200)

        except Exception as e:
            return Response({'message': str(e)}, status=500)