from django.contrib import admin
from .models import WorkLocation


@admin.register(WorkLocation)
class WorkLocationAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'department', 'latitude', 'longitude', 'radius', 'is_active']
    list_filter = ['department', 'is_active']
    search_fields = ['name', 'address']

