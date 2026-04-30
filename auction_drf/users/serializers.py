from rest_framework import serializers
from .models import User, Otp

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','email', 'first_name', 'last_name', 'wallet_balance', 'password', 'is_auctioner']
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
    
