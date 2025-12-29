from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet

router = DefaultRouter()
router.register(r'', AttendanceViewSet, basename='attendance')

urlpatterns = [
    path('', include(router.urls)),
    path('checkin/', AttendanceViewSet.as_view({'post': 'checkin'}), name='attendance-checkin'),
    path('checkout/', AttendanceViewSet.as_view({'post': 'checkout'}), name='attendance-checkout'),
    path('current/', AttendanceViewSet.as_view({'get': 'current'}), name='attendance-current'),
    path('active/', AttendanceViewSet.as_view({'get': 'active'}), name='attendance-active'),
    path('history/', AttendanceViewSet.as_view({'get': 'list'}), name='attendance-history'),
]

