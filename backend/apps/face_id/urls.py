from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FaceIdViewSet

router = DefaultRouter()
router.register(r'', FaceIdViewSet, basename='face-id')

urlpatterns = [
    path('', include(router.urls)),
    path('verify/', FaceIdViewSet.as_view({'post': 'verify'}), name='face-id-verify'),
    path('register/', FaceIdViewSet.as_view({'post': 'register'}), name='face-id-register'),
]

