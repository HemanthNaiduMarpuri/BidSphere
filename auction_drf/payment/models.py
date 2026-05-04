from django.db import models
from auction_item.models import Bid, AuctionRoom
from users.models import User
import uuid6

class Payment(models.Model):
    class PAYMENT_CHOICES(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled'
        YET_TO_PAY = 'yet_to_pay', 'Yet To Pay'
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    auction = models.ForeignKey(AuctionRoom, on_delete=models.SET_NULL, null=True, related_name='payments')
    bid = models.OneToOneField(Bid, on_delete=models.SET_NULL, null=True, related_name='payment')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='payments')
    transaction_id = models.CharField(max_length=255, null=True, blank=True)
    payment_status = models.CharField(max_length=25, choices=PAYMENT_CHOICES, default=PAYMENT_CHOICES.YET_TO_PAY)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def bid_amount(self):
        return self.bid.bid_amount if self.bid else None

    def __str__(self):
        return f"{self.bid} -> {self.payment_status}"
    

class TopUp(models.Model):
    class PAYMENT_CHOICES(models.TextChoices):
        SUCCESS = 'success', 'Success'
        CANCELLED = 'cancelled', 'Cancelled'
        YET_TO_PAY = 'yet_to_pay', 'Yet To Pay'
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='payment_user')
    amount = models.DecimalField(max_digits=100, decimal_places=2)
    transaction_id = models.CharField(max_length=255, null=True, blank=True)
    payment_status = models.CharField(max_length=25, choices=PAYMENT_CHOICES, default=PAYMENT_CHOICES.YET_TO_PAY)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} -> {self.amount} -> {self.payment_status}"
    
