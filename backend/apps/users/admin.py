from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'domain', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'domain']
    list_editable = ['is_active']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['id', 'email', 'first_name', 'last_name', 'company', 'role', 'department', 'is_active', 'is_staff']
    list_filter = ['role', 'is_active', 'is_staff', 'company', 'department']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering = ['-id']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Дополнительная информация', {
            'fields': ('company', 'telegram_id', 'phone', 'middle_name', 'role', 'department', 
                      'position', 'salary_type', 'hourly_rate', 'fixed_salary', 'work_schedule', 'hire_date')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Дополнительная информация', {
            'fields': ('company', 'telegram_id', 'phone', 'middle_name', 'role', 'department', 
                      'position', 'salary_type', 'hourly_rate', 'fixed_salary', 'work_schedule', 'hire_date')
        }),
    )
    
    readonly_fields = ['last_login', 'created_at', 'updated_at']
