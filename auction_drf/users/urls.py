from .views import ProfileView, RegisterView, LogoutView
from django.urls import path

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('me/', ProfileView.as_view()),
    path('logout/', LogoutView.as_view())
]
