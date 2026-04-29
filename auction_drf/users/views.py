from rest_framework.response import Response
from rest_framework import generics, permissions
from rest_framework.views import APIView
from .serializers import UserSerializer
from .models import User
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password

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
