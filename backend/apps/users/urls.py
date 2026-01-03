from django.urls import path
from .views import (
    UserListCreateView, UserRetrieveUpdateDestroyView,
    UserMeView, UserLoginView, UserTelegramView
)

urlpatterns = [
    path('', UserListCreateView.as_view(), name='user-list-create'),
    path('<int:pk>/', UserRetrieveUpdateDestroyView.as_view(), name='user-detail'),
    path('me/', UserMeView.as_view(), name='user-me'),
    path('login/', UserLoginView.as_view(), name='user-login'),
    path('telegram/', UserTelegramView.as_view(), name='user-telegram'),
]
