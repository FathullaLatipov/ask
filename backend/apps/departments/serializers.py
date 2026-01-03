from rest_framework import serializers
from django.utils import translation
from .models import Department, WorkSchedule


class DepartmentSerializer(serializers.ModelSerializer):
    manager_name = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = ['id', 'company', 'company_name', 'name', 'description', 'manager', 'manager_name', 'employee_count', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_name(self, obj):
        """Возвращает название на текущем языке"""
        lang = translation.get_language() or 'ru'
        if lang == 'uz' and hasattr(obj, 'name_uz') and obj.name_uz:
            return obj.name_uz
        elif lang == 'ru' and hasattr(obj, 'name_ru') and obj.name_ru:
            return obj.name_ru
        # Fallback на основное поле
        return obj.name
    
    def get_description(self, obj):
        """Возвращает описание на текущем языке"""
        if not obj.description:
            return None
        lang = translation.get_language() or 'ru'
        if lang == 'uz' and hasattr(obj, 'description_uz') and obj.description_uz:
            return obj.description_uz
        elif lang == 'ru' and hasattr(obj, 'description_ru') and obj.description_ru:
            return obj.description_ru
        # Fallback на основное поле
        return obj.description
    
    def get_company_name(self, obj):
        """Возвращает название компании на текущем языке"""
        if not obj.company:
            return None
        lang = translation.get_language() or 'ru'
        if lang == 'uz' and hasattr(obj.company, 'name_uz') and obj.company.name_uz:
            return obj.company.name_uz
        elif lang == 'ru' and hasattr(obj.company, 'name_ru') and obj.company.name_ru:
            return obj.company.name_ru
        return obj.company.name
    
    def get_manager_name(self, obj):
        if obj.manager:
            return str(obj.manager)
        return None
    
    def get_employee_count(self, obj):
        return obj.employees.count()


class WorkScheduleSerializer(serializers.ModelSerializer):
    company_name = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkSchedule
        fields = ['id', 'company', 'company_name', 'name', 'start_time', 'end_time', 'break_duration', 'work_days', 'late_threshold', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_name(self, obj):
        """Возвращает название на текущем языке"""
        lang = translation.get_language() or 'ru'
        if lang == 'uz' and hasattr(obj, 'name_uz') and obj.name_uz:
            return obj.name_uz
        elif lang == 'ru' and hasattr(obj, 'name_ru') and obj.name_ru:
            return obj.name_ru
        return obj.name
    
    def get_company_name(self, obj):
        """Возвращает название компании на текущем языке"""
        if not obj.company:
            return None
        lang = translation.get_language() or 'ru'
        if lang == 'uz' and hasattr(obj.company, 'name_uz') and obj.company.name_uz:
            return obj.company.name_uz
        elif lang == 'ru' and hasattr(obj.company, 'name_ru') and obj.company.name_ru:
            return obj.company.name_ru
        return obj.company.name

