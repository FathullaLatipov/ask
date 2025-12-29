from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkLocationViewSet

router = DefaultRouter()
router.register(r'locations', WorkLocationViewSet, basename='work-location')

urlpatterns = [
    path('', include(router.urls)),
    path('verify/', WorkLocationViewSet.as_view({'post': 'verify'}), name='geolocation-verify'),
]

