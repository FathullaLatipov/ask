from django.contrib import admin
from .models import Request, Penalty


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'request_type', 'start_date', 'end_date', 'status', 'created_at']
    list_filter = ['request_type', 'status', 'created_at']
    search_fields = ['user__first_name', 'user__last_name', 'reason']


@admin.register(Penalty)
class PenaltyAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'penalty_type', 'amount', 'period', 'status', 'created_at']
    list_filter = ['penalty_type', 'status', 'period']
    search_fields = ['user__first_name', 'user__last_name', 'description']

