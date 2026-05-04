from django.utils import timezone
from channels.generic.websocket import AsyncWebsocketConsumer
import json
from asgiref.sync import sync_to_async
from users.models import User
from auction_item.models import AuctionRoom, ChatMessage


class AuctionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_uuid']
        self.group_name = f'auction_{self.room_id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        highest_bid = await self.get_highest_bid()
        await self.send(text_data=json.dumps({
            'type':'init',
            'bidder_id': highest_bid.bidder.id if highest_bid else None,
            'bidder': highest_bid.bidder.email if highest_bid else None,
            'highest_bid': str(highest_bid.bid_amount) if highest_bid else None
        }))

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    @sync_to_async
    def get_highest_bid(self):
        from auction_item.models import Bid, AuctionItem
        try:
            active_item = AuctionItem.objects.filter(
                auction_room_id=self.room_id,
                is_sold=AuctionItem.Status.ACTIVE
            ).first()
            if not active_item:
                return None
            bid = Bid.objects.filter(
                auction_item=active_item,
                is_winning=True
            ).select_related('bidder').order_by('-bid_amount').first()
            return bid if bid else None
        except Exception:
            return None
        
    async def bid_update(self, event):
        await self.send(text_data=json.dumps({
            'type':'bid_update',
            'bid_amount':float(event['bid_amount']) if event['bid_amount'] else 0,
            'bidder':event['bidder'] if event['bidder'] else None,
            'item':event['item']
        }))

    async def retract_bid(self, event):
        await self.send(text_data=json.dumps({
            'type':'retract_bid',
            'item':event['item'],
            'bidder':event['bidder']
        }))

    async def item_changed(self, event):
        await self.send(text_data=json.dumps({
            'type':'item_changed',
            'item_id':str(event['id']),
            'item_name':event['name'],
            'base_price':float(event['base_price']),
            'highest_bid':float(event['highest_bid']) if event.get('highest_bid') is not None else None,
            'ends_at': event['ends_at'].isoformat() if event.get('ends_at') else None, 
        }))

    async def auction_status(self, event):
        await self.send(text_data=json.dumps({
            'type':'auction_status',
            'status':event['status']
        }))

    async def item_status(self, event):
        await self.send(text_data=json.dumps({
            'type':'item_status',
            'status':event['status'],
            'item_id':str(event['item_id'])
        }))

    async def timer_extended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'timer_extended',
            'item_id': str(event['item_id']),
            'ends_at': event['ends_at'].isoformat() if event.get('ends_at') else None,
        }))

    @sync_to_async
    def get_auctioneer_email(self):
        return AuctionRoom.objects.get(id=self.room_id).created_by.email

    @sync_to_async
    def save_message(self, user_id, auction_id, message):
        user = User.objects.get(id=user_id)
        auction = AuctionRoom.objects.get(id=auction_id)

        return ChatMessage.objects.create(auction=auction, user=user, message=message)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get('message')
        username = data.get('username')
        email = data.get('email')
        user_id = data.get('user_id')
        auction_id = data.get('auction_id')

        msg_type = data.get('type')

        if msg_type == 'item_request':
            auctioneer_email = await self.get_auctioneer_email()

            if data.get('user') == auctioneer_email:
                return 

            await self.channel_layer.group_send(self.group_name, {
                'type': 'item_request',
                'item': data.get('item'),
                'user': data.get('user'),
            })
            return

        if not message:
            return
        
        chat = await self.save_message(user_id, auction_id, message)

        await self.channel_layer.group_send(
            self.group_name,{
                'type':'chat_message',
                'message':message,
                'username':username,
                'email': email,
                'time': chat.created_at.strftime("%H:%M:%S")
            }
        )
    
    async def chat_message(self, event):
        message = event['message']
        username = event['username']
        email = event['email']
        time = event['time']
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message,
            'username': username,
            'email': email,
            'time': time
        }))

    async def item_request(self, event):
        await self.send(text_data=json.dumps({
            'type':'item_request',
            'item':event['item'],
            'user':event['user']
        }))