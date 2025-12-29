"""
URL configuration for Employee Management System.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
   openapi.Info(
      title="Employee Management API",
      default_version='v1',
      description="REST API для системы учета сотрудников",
      terms_of_service="https://www.google.com/policies/terms/",
      contact=openapi.Contact(email="contact@example.com"),
      license=openapi.License(name="BSD License"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/departments/', include('apps.departments.urls')),
    path('api/salary/', include('apps.salary.urls')),
    path('api/requests/', include('apps.requests.urls')),
    path('api/face-id/', include('apps.face_id.urls')),
    path('api/geolocation/', include('apps.geolocation.urls')),
    path('api/reports/', include('apps.attendance.urls')),
    
    # API Documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # Health check
    path('health/', lambda request: __import__('django.http').JsonResponse({'status': 'ok'})),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

