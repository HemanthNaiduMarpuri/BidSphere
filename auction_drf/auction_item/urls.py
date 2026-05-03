from django.urls import path
from .views import BidView, AuctionItemView, AuctionRoomView, ChatMessageView, WishListView
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'rooms', AuctionRoomView, basename='auction_room')


urlpatterns = [
    path('rooms/<int:auction_pk>/items/', AuctionItemView.as_view({
        'get': 'list',
        'post': 'create'
    }), name='auction-items'),

    path('rooms/<int:auction_pk>/items/current_item/', AuctionItemView.as_view({
        'get': 'current_item',
    }), name='auction-current-item'),

    path('rooms/<int:auction_pk>/items/<int:pk>/', AuctionItemView.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='auction-item-detail'),

    path('rooms/<int:auction_pk>/items/<int:pk>/sold/', AuctionItemView.as_view({
        'post': 'sold'
    }), name='auction-item-sold'),

    path('rooms/<int:auction_pk>/items/<int:pk>/unsold/', AuctionItemView.as_view({
        'post': 'unsold'
    }), name='auction-item-unsold'),

    path('rooms/<int:auction_pk>/items/<int:pk>/item_pass/', AuctionItemView.as_view({
        'post': 'item_pass'
    }), name='auction-item-pass'),

    path('rooms/<int:auction_pk>/items/next_item/', AuctionItemView.as_view({
        'post': 'next_item'
    }), name='auction-next-item'),

    path('rooms/<int:auction_pk>/items/<int:item_id>/activate_item/', AuctionItemView.as_view({
        'post': 'activate_item'
    }), name='activate-item'),

    path('rooms/<int:auction_pk>/items/<int:item_id>/changeStatus/', AuctionItemView.as_view({
        'post': 'changeStatus'
    }), name='changeStatus'),
    
    path('rooms/<int:auction_pk>/items/<int:item_id>/extendTime/', AuctionItemView.as_view({
        'post': 'extendTime'
    }), name='extendTime'),

    path('rooms/<int:auction_pk>/items/<int:item_id>/retractBid/', AuctionItemView.as_view({
        'post': 'retractBid'
    }), name='retractBid'),

    path('rooms/<int:auction_pk>/items/bid_history/', AuctionItemView.as_view({
        'get': 'bid_history'
    }), name='bid-history'),

    path('bids/my/', BidView.as_view(), name='my_bids'),
    path('bids/', BidView.as_view(), name='bid'),
    path('rooms/<int:auction_id>/chat/', ChatMessageView.as_view(), name='chat'),

    path('wishlist/', WishListView.as_view({
        'get':'list'
    })),

    path('wishlist/<int:auction_pk>/items/<int:item_id>/toggle/', WishListView.as_view({
        'post':'toggle'
    }))

]

urlpatterns += router.urls
