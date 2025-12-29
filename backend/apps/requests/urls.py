from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RequestViewSet

router = DefaultRouter()
router.register(r'', RequestViewSet, basename='request')

urlpatterns = [
    path('', include(router.urls)),
    path('<int:pk>/approve/', RequestViewSet.as_view({'post': 'approve'}), name='request-approve'),
    path('<int:pk>/reject/', RequestViewSet.as_view({'post': 'reject'}), name='request-reject'),
]

