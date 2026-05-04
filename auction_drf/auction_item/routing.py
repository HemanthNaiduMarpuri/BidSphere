from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/auction/(?P<room_uuid>[a-f0-9-]{36})/$", consumers.AuctionConsumer.as_asgi()),
]