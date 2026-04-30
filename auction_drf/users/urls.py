from .views import ProfileView, RegisterView, LogoutView, ChangePasswordView, RequestOtpView, VerifyOtpView
from django.urls import path

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('me/', ProfileView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('change-password/', ChangePasswordView.as_view()),
    path('request-otp/', RequestOtpView.as_view()),
    path('verify-otp/', VerifyOtpView.as_view())
]
