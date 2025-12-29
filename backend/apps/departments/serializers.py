from rest_framework import serializers
from .models import Department, WorkSchedule


class DepartmentSerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source='manager.__str__', read_only=True)
    employee_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'manager', 'manager_name', 'employee_count', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_employee_count(self, obj):
        return obj.employees.count()


class WorkScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkSchedule
        fields = ['id', 'name', 'start_time', 'end_time', 'break_duration', 'work_days', 'late_threshold', 'created_at']
        read_only_fields = ['id', 'created_at']

