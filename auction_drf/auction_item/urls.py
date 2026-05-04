from django.urls import path
from .views import BidView, AuctionItemView, AuctionRoomView, ChatMessageView, WishListView
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'rooms', AuctionRoomView, basename='auction_room')


urlpatterns = [
    path('rooms/<uuid:room_uuid>/items/', AuctionItemView.as_view({
        'get': 'list',
        'post': 'create'
    }), name='auction-items'),

    path('rooms/<uuid:room_uuid>/items/current_item/', AuctionItemView.as_view({
        'get': 'current_item',
    }), name='auction-current-item'),

    path('rooms/<uuid:room_uuid>/items/<uuid:item_uuid>/', AuctionItemView.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='auction-item-detail'),

    path('rooms/<uuid:room_uuid>/items/<uuid:item_uuid>/sold/', AuctionItemView.as_view({
        'post': 'sold'
    }), name='auction-item-sold'),

    path('rooms/<uuid:room_uuid>/items/<uuid:item_uuid>/unsold/', AuctionItemView.as_view({
        'post': 'unsold'
    }), name='auction-item-unsold'),

    path('rooms/<uuid:room_uuid>/items/<uuid:item_uuid>/item_pass/', AuctionItemView.as_view({
        'post': 'item_pass'
    }), name='auction-item-pass'),

    path('rooms/<uuid:room_uuid>/items/next_item/', AuctionItemView.as_view({
        'post': 'next_item'
    }), name='auction-next-item'),

    path('rooms/<uuid:room_uuid>/items/<uuid:item_uuid>/activate_item/', AuctionItemView.as_view({
        'post': 'activate_item'
    }), name='activate-item'),

    path('rooms/<uuid:room_uuid>/items/<uuid:item_uuid>/changeStatus/', AuctionItemView.as_view({
        'post': 'changeStatus'
    }), name='changeStatus'),
    
    path('rooms/<uuid:room_uuid>/items/<uuid:item_uuid>/extendTime/', AuctionItemView.as_view({
        'post': 'extendTime'
    }), name='extendTime'),

    path('rooms/<uuid:room_uuid>/items/<uuid:item_uuid>/retractBid/', AuctionItemView.as_view({
        'post': 'retractBid'
    }), name='retractBid'),

    path('rooms/<uuid:room_uuid>/items/bid_history/', AuctionItemView.as_view({
        'get': 'bid_history'
    }), name='bid-history'),

    path('bids/my/', BidView.as_view(), name='my_bids'),
    path('bids/', BidView.as_view(), name='bid'),
    path('rooms/<uuid:room_uuid>/chat/', ChatMessageView.as_view(), name='chat'),

    path('wishlist/', WishListView.as_view({
        'get':'list'
    })),

    path('wishlist/<uuid:room_uuid>/items/<uuid:item_uuid>/toggle/', WishListView.as_view({
        'post':'toggle'
    }))

]

urlpatterns += router.urls
