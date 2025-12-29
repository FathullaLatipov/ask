from django.contrib import admin
from .models import Salary, SalaryCalculation


@admin.register(Salary)
class SalaryAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'period', 'total_amount', 'status', 'created_at']
    list_filter = ['status', 'period']
    search_fields = ['user__first_name', 'user__last_name']


@admin.register(SalaryCalculation)
class SalaryCalculationAdmin(admin.ModelAdmin):
    list_display = ['id', 'salary', 'calculation_type', 'amount', 'created_at']
    list_filter = ['calculation_type']

