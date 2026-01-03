from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from config.mixins import TenantFilterMixin
from .models import Department, WorkSchedule
from .serializers import DepartmentSerializer, WorkScheduleSerializer


class DepartmentListCreateView(TenantFilterMixin, generics.ListCreateAPIView):
    """Список и создание отделов"""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminUser()]


class DepartmentRetrieveUpdateDestroyView(TenantFilterMixin, generics.RetrieveUpdateDestroyAPIView):
    """Детали, обновление и удаление отдела"""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminUser()]


class WorkScheduleListCreateView(TenantFilterMixin, generics.ListCreateAPIView):
    """Список и создание графиков работы"""
    queryset = WorkSchedule.objects.all()
    serializer_class = WorkScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminUser()]


class WorkScheduleRetrieveUpdateDestroyView(TenantFilterMixin, generics.RetrieveUpdateDestroyAPIView):
    """Детали, обновление и удаление графика работы"""
    queryset = WorkSchedule.objects.all()
    serializer_class = WorkScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminUser()]
