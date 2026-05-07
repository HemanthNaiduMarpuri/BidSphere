from datetime import time, timedelta
import uuid6
from django.db import models
from users.models import User
from django.db import transaction
from django.db.models import Max


class AuctionRoom(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'Draft', 'Draft'
        SCHEDULED = 'Scheduled', 'Scheduled'
        LIVE = "Live", 'Live'
        CLOSED = 'Closed', 'Closed'
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='auction_rooms') 
    title = models.CharField(max_length=255, blank=False, null=False)
    sector = models.CharField(max_length=255, blank=False, null=False)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.DRAFT)
    reserve_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_private = models.BooleanField(default=False)
    access_code = models.CharField(max_length=50, null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.created_by} -> {self.title} -> {self.status}"
    
class AuctionItem(models.Model):
    class Status(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        ACTIVE = 'Active', 'Active'
        SOLD = 'Sold', 'Sold'
        NOT_SOLD = 'Not Sold', 'Not Sold'
        PASS = 'Pass', 'Pass'
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    auction_room = models.ForeignKey(AuctionRoom, on_delete=models.SET_NULL, null=True, related_name='items')
    name = models.CharField(max_length=255, blank=False)
    description = models.TextField()
    order = models.IntegerField(default=0)
    image = models.ImageField(upload_to='auction_items/', blank=True, null=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_sold = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    duration = models.IntegerField(default=60)
    ends_at = models.DateTimeField(null=True)
    extension_count = models.IntegerField(default=0)

    def save(self, *args, **kwargs):
        if not self.pk:
            last = AuctionItem.objects.filter(auction_room=self.auction_room).select_for_update().order_by('-order').first()
            self.order = (last.order + 1) if last else 1
        super().save(*args, **kwargs)


    def __str__(self):
        return f"{self.name} -> {self.base_price} -> {self.is_sold}"
    
class Bid(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        OUTBID = 'Outbid', 'Outbid'
        WON = 'Won', 'Won'
    
    class PAYMENT_STATUS(models.TextChoices):
        PENDING = 'pending', 'pending'
        PAID = 'paid', 'paid'
        CANCELLED = 'cancelled', 'cancelled'
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    auction_room = models.ForeignKey(AuctionRoom, on_delete=models.SET_NULL, null=True ,related_name='bids')
    auction_item = models.ForeignKey(AuctionItem, on_delete=models.SET_NULL, null=True ,related_name='bids')
    bidder = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='bids')
    bid_amount = models.DecimalField(max_digits=10 ,decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OUTBID)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS.choices, default=PAYMENT_STATUS.PENDING)
    is_winning = models.BooleanField(default=False)
    placed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-bid_amount']

    def __str__(self):
        return f"{self.bidder} -> {self.bid_amount}"
    
class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    auction = models.ForeignKey(AuctionRoom, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.first_name} - {self.message[:20]}"

class Wishlist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    auction_room = models.ForeignKey(AuctionRoom, on_delete=models.SET_NULL, null=True,related_name='auction_wishlist')
    auction_item = models.ForeignKey(AuctionItem, on_delete=models.SET_NULL, null=True,related_name='item_wishlist')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_wishlist')
    is_wishlist = models.BooleanField(default=False)

    class Meta:
        unique_together = ['user', 'auction_item']

    def __str__(self):
        return f"{self.auction_item} -> {self.is_wishlist}"
    

class RequestPanel(models.Model):
    class REQUEST_CHOICES(models.TextChoices):
        ACCEPTED = 'Accepted', 'Accepted'
        PENDING = 'Pending', 'Pending'
        REJECTED = 'Rejected', 'Rejected'

    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    auction_room = models.ForeignKey(AuctionRoom, on_delete=models.CASCADE, related_name='request_panel_room')
    auction_item = models.ForeignKey(AuctionItem, on_delete=models.CASCADE, related_name='request_item')
    likes = models.PositiveIntegerField(default=0)
    dislikes = models.PositiveIntegerField(default=0)
    is_accepted = models.CharField(max_length=15, choices=REQUEST_CHOICES.choices, default=REQUEST_CHOICES.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['auction_room', 'auction_item']

    def __str__(self):
        return f"{self.auction_item} -> {self.likes}"
    

class VoteItem(models.Model):
    class VOTE(models.TextChoices):
        LIKE = 'Like', 'Like'
        DISLIKE = 'DISLIKE', 'DISLIKE'

    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    request_panel = models.ForeignKey(RequestPanel, on_delete=models.CASCADE, related_name='votes')
    vote =  models.CharField(max_length=10, choices=VOTE.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['user', 'request_panel']]
    

