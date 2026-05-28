from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import AuctionRoom, AuctionItem, Bid, ChatMessage, Wishlist, RequestPanel
from rest_framework import serializers
from cloudinary.utils import cloudinary_url

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

class AuctionRoomCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuctionRoom
        fields = ['id', 'title', 'sector', 'reserve_price', 'is_private', 'access_code', 'start_time', 'end_time']

    def create(self, validated_data):
        request = self.context['request']
        validated_data['created_by'] = request.user
        validated_data['status'] = AuctionRoom.Status.DRAFT
        return super().create(validated_data)

class AuctionRoomDetailSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField()

    end_time_iso = serializers.SerializerMethodField()

    def get_end_time_iso(self, obj):
        if not obj.end_time:
            return None
        return obj.end_time.isoformat()
    class Meta:
        model = AuctionRoom
        fields = ['id' ,'created_by', 'title', 'sector', 'status', 'reserve_price', 'start_time', 'end_time', 'is_private' ,'created_at', 'end_time_iso']

class AuctionItemSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)
    class Meta:
        model = AuctionItem
        fields = ['id' ,'auction_room', 'name', 'description', 'image', 'base_price', 'is_sold', 'duration', 'ends_at', 'extension_count']
        read_only_fields = ['is_sold','extension_count']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.image:
            ret['image'] = getattr(instance.image, 'url', str(instance.image))
        return ret
    
class BidSerializer(serializers.ModelSerializer):
    auction_item_name = serializers.CharField(source='auction_item.name', read_only=True)
    auction_room_name = serializers.CharField(source='auction_room.title', read_only=True)
    class Meta:
        model = Bid
        fields = ['id', 'auction_room', 'auction_item', 'bid_amount', 'placed_at', 'auction_item_name', 'auction_room_name', 'payment_status']
        read_only_fields = ['placed_at', 'is_winning', 'status']
    
    def validate(self, data):
        auction_item = data['auction_item']
        bid_amount = data['bid_amount']
        auction_room = data['auction_room'] 

        if auction_room.status != AuctionRoom.Status.LIVE:
            raise serializers.ValidationError("Auction is not live.")

        current_highest = Bid.objects.filter(auction_item=auction_item, is_winning=True).order_by('-bid_amount').first()
        if current_highest and bid_amount <= current_highest.bid_amount:
            raise serializers.ValidationError(f"Bid must be higher than current highest: {current_highest.bid_amount}")
        
        if bid_amount < auction_item.base_price:
            raise serializers.ValidationError(f"Bid must be at least the base price: {auction_item.base_price}")
        
        return data

class ChatMessageSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.first_name')
    email = serializers.CharField(source='user.email')

    class Meta:
        model = ChatMessage
        fields = ['id', 'message', 'username', 'email', 'created_at']

class WishListSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='auction_item.name', read_only=True)
    base_price = serializers.DecimalField(source='auction_item.base_price', max_digits=10, decimal_places=2, read_only=True)
    image = serializers.ImageField(source='auction_item.image', read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'auction_room', 'auction_item', 'user', 'item_name', 'base_price', 'image' ,'is_wishlist']
        read_only_fields = ['user']

class RequestPanelSerializer(serializers.ModelSerializer):
    score = serializers.IntegerField(read_only=True)
    auction_item_name = serializers.CharField(source='auction_item.name', read_only=True)
    class Meta:
        model = RequestPanel
        fields = ['id', 'auction_room', 'auction_item', 'auction_item_name' , 'is_accepted', 'likes', 'dislikes', 'score', 'created_at']

class VoteItemSerializer(serializers.Serializer):
    vote = serializers.ChoiceField(choices=['like', 'dislike'])

