from django.urls import path
from .views import (
    RequestListCreateView, RequestRetrieveUpdateDestroyView,
    RequestApproveView, RequestRejectView
)

urlpatterns = [
    path('', RequestListCreateView.as_view(), name='request-list-create'),
    path('<int:pk>/', RequestRetrieveUpdateDestroyView.as_view(), name='request-detail'),
    path('<int:pk>/approve/', RequestApproveView.as_view(), name='request-approve'),
    path('<int:pk>/reject/', RequestRejectView.as_view(), name='request-reject'),
]
