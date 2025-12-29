from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['id', 'email', 'telegram_id', 'first_name', 'last_name', 'role', 'department', 'is_active']
    list_filter = ['role', 'is_active', 'department', 'salary_type']
    search_fields = ['email', 'first_name', 'last_name', 'telegram_id']
    ordering = ['-id']
    
    fieldsets = (
        (None, {'fields': ('email', 'telegram_id', 'password')}),
        ('Персональная информация', {'fields': ('first_name', 'last_name', 'middle_name', 'phone')}),
        ('Работа', {'fields': ('role', 'department', 'position', 'work_schedule', 'hire_date')}),
        ('Зарплата', {'fields': ('salary_type', 'hourly_rate', 'fixed_salary')}),
        ('Права доступа', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Важные даты', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'telegram_id', 'first_name', 'last_name', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ['last_login', 'created_at', 'updated_at']

