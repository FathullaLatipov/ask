from django.contrib import admin
from .models import FacePhoto


@admin.register(FacePhoto)
class FacePhotoAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'is_primary', 'created_at']
    list_filter = ['is_primary', 'created_at']
    search_fields = ['user__first_name', 'user__last_name']

