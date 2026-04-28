# BidSphere — Auction Frontend

React frontend for the Django auction system.

## Setup

```bash
npm install
npm start
```

Runs on http://localhost:3000

## Backend required

Make sure your Django backend is running on http://localhost:8000

Add this to Django settings.py:
```python
CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]
CORS_ALLOW_CREDENTIALS = True
```

Install django-cors-headers:
```bash
pip install django-cors-headers
```

Add to INSTALLED_APPS:
```python
'corsheaders',
```

Add to MIDDLEWARE (before CommonMiddleware):
```python
'corsheaders.middleware.CorsMiddleware',
```

## Pages

| Route | Description | Access |
|---|---|---|
| /login | Login page | Public |
| /register | Register page | Public |
| /home | Auction listing | Authenticated |
| /auction/:id | Access gate (public enters directly, private asks for code) | Authenticated |
| /auction/:id/live | Live bidding room with WebSocket | Authenticated |
| /profile | Edit profile | Authenticated |
| /wallet | Wallet balance + top-up | Authenticated |
| /dashboard | Auctioneer auction list | Auctioneer only |
| /dashboard/create | Create new auction | Auctioneer only |
| /dashboard/room/:id | Manage auction — items, next/sold/unsold | Auctioneer only |

## Backend API needed

Add this endpoint to your Django backend:

```python
# POST /api/auctions/rooms/<id>/verify-access/
@action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
def verify_access(self, request, pk=None):
    auction = self.get_object()
    if not auction.is_private:
        return Response({'message': 'Public auction'}, status=200)
    code = request.data.get('access_code', '')
    if code == auction.access_code:
        return Response({'message': 'Access granted'}, status=200)
    return Response({'error': 'Invalid access code'}, status=403)
```

Also add to AuctionRoom model:
```python
is_private = models.BooleanField(default=False)
access_code = models.CharField(max_length=20, blank=True, null=True)
```

## Tech stack

- React 18
- React Router v6
- Axios (HTTP)
- react-use-websocket (WebSocket)
- DM Serif Display + DM Sans fonts
- Custom CSS design system (dark theme)
