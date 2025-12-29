from django.contrib import admin
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'checkin_time', 'checkout_time', 'total_hours', 'is_late', 'created_at']
    list_filter = ['is_late', 'checkin_time', 'created_at']
    search_fields = ['user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at']

