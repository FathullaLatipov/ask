from django.urls import path
from .views import (
    SalaryListCreateView, SalaryRetrieveUpdateDestroyView,
    SalaryCalculateView
)

urlpatterns = [
    path('', SalaryListCreateView.as_view(), name='salary-list-create'),
    path('<int:pk>/', SalaryRetrieveUpdateDestroyView.as_view(), name='salary-detail'),
    path('calculate/', SalaryCalculateView.as_view(), name='salary-calculate'),
]
