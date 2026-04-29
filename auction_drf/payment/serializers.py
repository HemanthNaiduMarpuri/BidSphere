from rest_framework import serializers
from .models import Payment, TopUp


class PaymentHistorySerializer(serializers.ModelSerializer):
    bid_amount = serializers.DecimalField(source='bid.bid_amount', max_digits=10, decimal_places=2, read_only=True)
    auction_name = serializers.CharField(source='auction.title', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'auction_name',
            'bid_amount',
            'payment_status',
            'transaction_id',
            'paid_at',
            'created_at'
        ]

class TopupHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TopUp
        fields = [
            'id',
            'amount',
            'payment_status',
            'transaction_id',
            'paid_at',
            'created_at'
        ]