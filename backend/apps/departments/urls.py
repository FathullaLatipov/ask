from django.urls import path
from .views import (
    DepartmentListCreateView, DepartmentRetrieveUpdateDestroyView,
    WorkScheduleListCreateView, WorkScheduleRetrieveUpdateDestroyView
)

urlpatterns = [
    # Departments
    path('', DepartmentListCreateView.as_view(), name='department-list-create'),
    path('<int:pk>/', DepartmentRetrieveUpdateDestroyView.as_view(), name='department-detail'),
    
    # Work schedules
    path('work-schedules/', WorkScheduleListCreateView.as_view(), name='work-schedule-list-create'),
    path('work-schedules/<int:pk>/', WorkScheduleRetrieveUpdateDestroyView.as_view(), name='work-schedule-detail'),
]
