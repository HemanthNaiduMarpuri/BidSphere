from rest_framework import serializers
from .models import User, Otp, Contact
from dj_rest_auth.serializers import PasswordResetSerializer
from allauth.account.forms import ResetPasswordForm as AllAuthPasswordResetForm
from allauth.account.utils import filter_users_by_email, user_pk_to_url_str
from allauth.account.forms import default_token_generator
from django.contrib.sites.shortcuts import get_current_site

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','email', 'first_name', 'last_name', 'wallet_balance', 'password', 'is_auctioner', 'is_superuser']
        extra_kwargs = {
            'password': {'write_only': True},
            'wallet_balance': {'read_only': True}
            }


    def create(self, validated_data):
        is_auctioner = validated_data.get('is_auctioner', False)
        if is_auctioner:
            return User.objects.create_auctioner(**validated_data)
        return User.objects.create_user(**validated_data)
    
class OtpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'user', 'subject', 'message', 'image', 'owner', 'reply', 'status', 'created_at', 'reply_at']

class ContactPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'user', 'subject', 'message', 'image']
        read_only_fields = ['user']

class ContactSuperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'owner', 'reply', 'status']
    


FRONTEND_URL = 'http://localhost:3000'

class CustomAllAuthPasswordResetForm(AllAuthPasswordResetForm):

    def save(self, request, **kwargs):

        email = self.cleaned_data['email']
        token_generator = kwargs.get('token_generator', default_token_generator)

        for user in filter_users_by_email(email, is_active=True):
            uid = user_pk_to_url_str(user)
            token = token_generator.make_token(user)

            reset_url = f"{FRONTEND_URL}/reset-password/{uid}/{token}/"

            from django.core.mail import send_mail
            send_mail(
                subject='Reset Your Password',
                message=(
                    f"You requested a password reset.\n\n"
                    f"Click the link below to reset your password:\n{reset_url}\n\n"
                    f"If you did not request this, ignore this email."
                ),
                from_email=None,  
                recipient_list=[email],
                html_message=f"""
                    <p>You requested a password reset.</p>
                    <p><a href="{reset_url}">Click here to reset your password</a></p>
                    <p>Or copy this link:<br>{reset_url}</p>
                    <p>If you did not request this, ignore this email.</p>
                """
            )


class CustomPasswordResetSerializer(PasswordResetSerializer):
    password_reset_form_class = CustomAllAuthPasswordResetForm