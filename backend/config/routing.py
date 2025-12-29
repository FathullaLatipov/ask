from django.urls import path
from apps.attendance import consumers

websocket_urlpatterns = [
    path('ws/dashboard/', consumers.DashboardConsumer.as_asgi()),
]

