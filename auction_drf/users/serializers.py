from rest_framework import serializers
from .models import User, Otp, Contact

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
    
