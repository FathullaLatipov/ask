from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', UserViewSet.as_view({'post': 'login'}), name='login'),
    path('telegram/', UserViewSet.as_view({'post': 'telegram'}), name='telegram-auth'),
    path('me/', UserViewSet.as_view({'get': 'me'}), name='user-me'),
]

