from django.urls import path
from .views import (
    FacePhotoListCreateView, FacePhotoRetrieveUpdateDestroyView,
    FaceVerifyView, FaceRegisterView
)

urlpatterns = [
    path('', FacePhotoListCreateView.as_view(), name='face-photo-list-create'),
    path('<int:pk>/', FacePhotoRetrieveUpdateDestroyView.as_view(), name='face-photo-detail'),
    path('verify/', FaceVerifyView.as_view(), name='face-verify'),
    path('register/', FaceRegisterView.as_view(), name='face-register'),
]
