from django.urls import path
from .views import TopUpView, TopUpSuccessView, TopUpCancelView, PaymentView, StripeSuccessView, StripeCancelView

urlpatterns = [
    path('topup/', TopUpView.as_view(), name='topup'),
    path('topup/success/', TopUpSuccessView.as_view(), name='success'),
    path('topup/cancel/', TopUpCancelView.as_view(), name='cancel'),
    path('pay/<int:bid_id>/', PaymentView.as_view()),
    path('stripe-success/', StripeSuccessView.as_view(), name='stripe-success'),
    path('stripe-cancel/', StripeCancelView.as_view(), name='stripe-cancel')   
]
