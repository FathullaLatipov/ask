from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from .models import WorkLocation
from .serializers import WorkLocationSerializer, GeolocationVerifySerializer
import math


def haversine_distance(lat1, lon1, lat2, lon2):
    """Расчет расстояния между двумя точками в метрах"""
    R = 6371000  # Радиус Земли в метрах
    
    lat1_rad = math.radians(float(lat1))
    lat2_rad = math.radians(float(lat2))
    dlat = math.radians(float(lat2) - float(lat1))
    dlon = math.radians(float(lon2) - float(lon1))
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


class WorkLocationListCreateView(generics.ListCreateAPIView):
    """Список и создание рабочих локаций"""
    queryset = WorkLocation.objects.all()
    serializer_class = WorkLocationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['department', 'is_active']

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminUser()]


class WorkLocationRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """Детали, обновление и удаление рабочей локации"""
    queryset = WorkLocation.objects.all()
    serializer_class = WorkLocationSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminUser()]


class GeolocationVerifyView(APIView):
    """Проверка геолокации сотрудника"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GeolocationVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        latitude = serializer.validated_data['latitude']
        longitude = serializer.validated_data['longitude']
        
        if not user.department:
            return Response({
                'error': {
                    'code': 'NO_DEPARTMENT',
                    'message': 'У сотрудника не указан отдел'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Ищем рабочие локации отдела
        locations = WorkLocation.objects.filter(
            department=user.department,
            is_active=True
        )
        
        if not locations.exists():
            return Response({
                'verified': False,
                'message': 'Рабочая локация не найдена'
            })
        
        # Находим ближайшую локацию
        min_distance = float('inf')
        nearest_location = None
        
        for location in locations:
            distance = haversine_distance(
                latitude, longitude,
                location.latitude, location.longitude
            )
            if distance < min_distance:
                min_distance = distance
                nearest_location = location
        
        # Проверяем радиус
        if min_distance <= nearest_location.radius:
            return Response({
                'verified': True,
                'work_location': {
                    'id': nearest_location.id,
                    'name': nearest_location.name,
                    'distance': round(min_distance, 2)
                },
                'message': 'Сотрудник находится на рабочем месте'
            })
        else:
            return Response({
                'verified': False,
                'work_location': {
                    'id': nearest_location.id,
                    'name': nearest_location.name,
                    'distance': round(min_distance, 2)
                },
                'message': f'Сотрудник находится слишком далеко ({round(min_distance, 0)}м > {nearest_location.radius}м)'
            })
