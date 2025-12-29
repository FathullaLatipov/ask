from django.contrib import admin
from .models import Department, WorkSchedule


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'manager', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name']


@admin.register(WorkSchedule)
class WorkScheduleAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'start_time', 'end_time', 'late_threshold']
    list_filter = ['start_time']

