from rest_framework.response import Response
from rest_framework import generics, permissions
from rest_framework.views import APIView
from .serializers import UserSerializer, OtpSerializer
from .models import User, Otp
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
import random
from django.utils import timezone
from django.core.mail import send_mail
from rest_framework.permissions import AllowAny
import hashlib

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
                otp = f"{random.randint(100000, 999999)}"
                Otp.objects.filter(user=user).delete()

                otp_hashed = hashlib.sha256(otp.encode()).hexdigest()

                Otp.objects.create(user=user, otp_hashed=otp_hashed)  
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
        try:
            if otp_received is None:
                return Response({'message':"No Otp is Received"}, status=401)
            user = User.objects.get(email=email)
    
            otp = Otp.objects.filter(user=user).order_by('-created_at').first()

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

