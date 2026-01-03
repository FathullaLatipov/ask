from rest_framework import serializers
from django.utils import translation
from .models import WorkLocation


class WorkLocationSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkLocation
        fields = [
            'id', 'name', 'address', 'latitude', 'longitude',
            'radius', 'department', 'department_name', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_name(self, obj):
        """Возвращает название на текущем языке"""
        lang = translation.get_language() or 'ru'
        if lang == 'uz' and hasattr(obj, 'name_uz') and obj.name_uz:
            return obj.name_uz
        elif lang == 'ru' and hasattr(obj, 'name_ru') and obj.name_ru:
            return obj.name_ru
        return obj.name
    
    def get_address(self, obj):
        """Возвращает адрес на текущем языке"""
        if not obj.address:
            return None
        lang = translation.get_language() or 'ru'
        if lang == 'uz' and hasattr(obj, 'address_uz') and obj.address_uz:
            return obj.address_uz
        elif lang == 'ru' and hasattr(obj, 'address_ru') and obj.address_ru:
            return obj.address_ru
        return obj.address
    
    def get_department_name(self, obj):
        """Возвращает название отдела на текущем языке"""
        if not obj.department:
            return None
        lang = translation.get_language() or 'ru'
        if lang == 'uz' and hasattr(obj.department, 'name_uz') and obj.department.name_uz:
            return obj.department.name_uz
        elif lang == 'ru' and hasattr(obj.department, 'name_ru') and obj.department.name_ru:
            return obj.department.name_ru
        return obj.department.name


class GeolocationVerifySerializer(serializers.Serializer):
    latitude = serializers.DecimalField(max_digits=10, decimal_places=8)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8)

