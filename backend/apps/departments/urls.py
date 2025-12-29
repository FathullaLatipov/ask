from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepartmentViewSet, WorkScheduleViewSet

router = DefaultRouter()
router.register(r'', DepartmentViewSet, basename='department')

urlpatterns = [
    path('', include(router.urls)),
]

# Work schedules
urlpatterns += [
    path('work-schedules/', WorkScheduleViewSet.as_view({'get': 'list', 'post': 'create'}), name='work-schedule-list'),
    path('work-schedules/<int:pk>/', WorkScheduleViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='work-schedule-detail'),
]

