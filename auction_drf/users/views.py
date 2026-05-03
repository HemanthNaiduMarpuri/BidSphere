from rest_framework.response import Response
from rest_framework import generics, permissions
from rest_framework.views import APIView
from .serializers import UserSerializer, OtpSerializer, ContactSerializer, ContactPostSerializer,ContactSuperSerializer
from .models import User, Otp, Contact
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
import random
from django.utils import timezone
from django.core.mail import send_mail
from rest_framework.permissions import AllowAny
from django.db import transaction
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from datetime import timedelta
from django.conf import settings

class RegisterView(generics.CreateAPIView):
    query_set = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=400)
        
class ChangePasswordView(APIView):
    def post(self, request):
        try:
            old_password = request.data.get('old_password')
            new_password = request.data.get('new_password')

            user = request.user

            if not old_password or not new_password:
                return Response({'error': 'Both fields required'}, status=400)
            
            if not user.check_password(old_password):
                return Response({'error': 'Old password is incorrect'}, status=400)
            
            validate_password(new_password, user)
            
            user.set_password(new_password)
            user.save()

            return Response({'message': 'Password updated successfully'}, status=200)
        
        except Exception as e:
            return Response({'message':str(e)}, status=500)


class RequestOtpView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        data = request.data
        serializer = OtpSerializer(data=data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            user = authenticate(email=email, password=password)

            if user:
                with transaction.atomic():
                    last_otp = (
                        Otp.objects
                        .select_for_update()  
                        .filter(user=user)
                        .order_by('-created_at')
                        .first()
                    )
                    if last_otp and (timezone.now() - last_otp.created_at).seconds < 30:
                        return Response({"error": "Wait before requesting OTP again"}, status=429)

                    Otp.objects.filter(user=user).delete()

                    otp = f"{random.randint(100000, 999999)}"
                    
                    otp_obj = Otp(user=user)
                    otp_obj.set_otp(otp)
                    otp_obj.save()
                
                send_mail(
                'Your Login Code',
                f'Your 2FA code is {otp}',
                'noreply@myapp.com',
                [user.email],
                )
                return Response({"detail": "OTP sent to your email."}, status=200)
        return Response({"error": "Invalid credentials"}, status=401)
    
class VerifyOtpView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email')
        otp_received = request.data.get('otp')
        
        if not email or otp_received is None:
            return Response({'message':"No Otp is Received"}, status=401)

        try:
            with transaction.atomic():
                user = User.objects.get(email=email)
        
                otp =  (
                        Otp.objects
                        .select_for_update() 
                        .filter(user=user)
                        .order_by('-created_at')
                        .first()
                    )

                if not otp:
                    return Response({"error": "No OTP found"}, status=400)
                
                if not otp.is_valid():
                    otp.delete()
                    return Response({"error": "OTP expired"}, status=400)
                
                if otp.attempts >=5:
                    otp.delete()
                    return Response({"error": "Too many attempts"}, status=403)
                
                if not otp.verify_otp(otp_received):
                    otp.attempts += 1
                    otp.save()
                    return Response({"error": f"Invalid OTP ({otp.attempts}/5)"}, status=400)

            refresh = RefreshToken.for_user(user)
            otp.delete()
            return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
            }, status=200)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

class ContactView(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        user = self.request.user
        if self.action in ['create', 'update', 'partial_update']:
            return ContactPostSerializer
        if user.is_superuser and self.action in ['create', 'update']:
            return ContactSuperSerializer
        return ContactSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Contact.objects.all()
        return Contact.objects.filter(user=user)
    
    def perform_create(self, serializer):
        user = self.request.user

        if not user or user.is_anonymous:
            raise ValidationError("Authentication required")

        subject = serializer.validated_data.get('subject')
        message = serializer.validated_data.get('message')
        image = serializer.validated_data.get('image')

        if not subject or not message:
            raise ValidationError("Subject and message are required")

        if len(subject) < 5:
            raise ValidationError("Subject too short")

        if len(message) < 10:
            raise ValidationError("Message too short")
        
        duplicate_msgs = Contact.objects.filter(user=user, subject=subject, message=message, created_at__gte=timezone.now()-timedelta(minutes=5)).exists()

        if duplicate_msgs:
            raise ValidationError("Duplicate request detected")


        last_ticket = Contact.objects.filter(user=user).order_by('-created_at').first()
        if last_ticket:
            diff = timezone.now() - last_ticket.created_at
            if diff < timedelta(seconds=30):
                raise ValidationError("Please wait before submitting another request")

        open_tickets = Contact.objects.filter(
            user=user,
            status__in=[Contact.STATUS_CHOICES.SUBMITTED, Contact.STATUS_CHOICES.RECEIVED]
        ).count()

        if open_tickets >= 5:
            raise ValidationError("Too many open tickets")

        if image:
            if image.size > 2 * 1024 * 1024:
                raise ValidationError("Image too large")

            if not image.content_type.startswith('image/'):
                raise ValidationError("Invalid file type")

        serializer.save(
            user=user,
            status=Contact.STATUS_CHOICES.SUBMITTED
        )    

    def perform_update(self, serializer):
        instance = self.get_object()

        if instance.user != self.request.user:
            raise ValidationError("You cannot edit this ticket")
        
        if instance.reply:
            raise ValidationError("Cannot edit after reply.")
        
        if instance.status == Contact.STATUS_CHOICES.SOLVED:
            raise ValidationError("You cannot edit this resolved ticket")

        serializer.save(status=Contact.STATUS_CHOICES.SUBMITTED)

    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        try:
            user = self.request.user
            if not user.is_superuser:
                return Response({'error': 'Only admin can reply'}, status=403)

            contact = self.get_object()
            reply_text = request.data.get('reply')
            if not reply_text:
                return Response({'error': 'Reply is required'}, status=400)
            
            with transaction.atomic():
                contact.owner = user
                contact.reply = reply_text
                contact.status = Contact.STATUS_CHOICES.SOLVED
                contact.reply_at = timezone.now()
                contact.save()

            send_mail( "Support Reply",
            contact.reply,
            settings.DEFAULT_FROM_EMAIL,
            [contact.user.email])
            return Response({'message': 'Reply sent'}, status=200)
        except Exception as e:
            return Response({'message':str(e)}, status=500)
        
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_superuser and instance.status == 'Submitted':
            instance.status = Contact.STATUS_CHOICES.RECEIVED
            instance.save()

        return super().retrieve(request, *args, **kwargs)

