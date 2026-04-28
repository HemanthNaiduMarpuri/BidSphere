from django.contrib import admin
from .models import AuctionItem, AuctionRoom, Bid, ChatMessage, Wishlist

admin.site.register(AuctionItem)
admin.site.register(AuctionRoom)
admin.site.register(Bid)
admin.site.register(ChatMessage)
admin.site.register(Wishlist)