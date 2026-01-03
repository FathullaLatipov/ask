from django.urls import path
from .views import (
    WorkLocationListCreateView, WorkLocationRetrieveUpdateDestroyView,
    GeolocationVerifyView
)

urlpatterns = [
    path('', WorkLocationListCreateView.as_view(), name='work-location-list-create'),
    path('<int:pk>/', WorkLocationRetrieveUpdateDestroyView.as_view(), name='work-location-detail'),
    path('verify/', GeolocationVerifyView.as_view(), name='geolocation-verify'),
]
