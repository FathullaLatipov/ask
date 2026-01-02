from rest_framework import serializers
from .models import Salary, SalaryCalculation
from apps.users.serializers import UserSerializer


class SalaryCalculationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryCalculation
        fields = ['id', 'calculation_type', 'description', 'amount', 'created_at']


class SalarySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.__str__', read_only=True)
    user_department = serializers.CharField(source='user.department.name', read_only=True, allow_null=True)
    user_department_id = serializers.IntegerField(source='user.department.id', read_only=True, allow_null=True)
    breakdown = SalaryCalculationSerializer(source='calculations', many=True, read_only=True)
    
    class Meta:
        model = Salary
        fields = [
            'id', 'user', 'user_name', 'user_department', 'user_department_id', 'period',
            'base_hours', 'base_amount',
            'overtime_hours', 'overtime_amount',
            'penalties_amount', 'advances_amount',
            'total_amount', 'status', 'paid_at', 'notes',
            'breakdown', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SalaryCalculateSerializer(serializers.Serializer):
    period = serializers.CharField()  # YYYY-MM format

