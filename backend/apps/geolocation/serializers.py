from rest_framework import serializers
from .models import WorkLocation


class WorkLocationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = WorkLocation
        fields = [
            'id', 'name', 'address', 'latitude', 'longitude',
            'radius', 'department', 'department_name', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class GeolocationVerifySerializer(serializers.Serializer):
    latitude = serializers.DecimalField(max_digits=10, decimal_places=8)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8)

