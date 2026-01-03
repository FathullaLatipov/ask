from django.urls import path
from .views import (
    AttendanceListCreateView, AttendanceRetrieveUpdateDestroyView,
    AttendanceCheckinView, AttendanceCheckoutView,
    AttendanceCurrentView, AttendanceActiveView
)

urlpatterns = [
    path('', AttendanceListCreateView.as_view(), name='attendance-list-create'),
    path('<int:pk>/', AttendanceRetrieveUpdateDestroyView.as_view(), name='attendance-detail'),
    path('checkin/', AttendanceCheckinView.as_view(), name='attendance-checkin'),
    path('checkout/', AttendanceCheckoutView.as_view(), name='attendance-checkout'),
    path('current/', AttendanceCurrentView.as_view(), name='attendance-current'),
    path('active/', AttendanceActiveView.as_view(), name='attendance-active'),
    path('history/', AttendanceListCreateView.as_view(), name='attendance-history'),
]
