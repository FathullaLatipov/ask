from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count, Avg
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from datetime import date, timedelta
from .models import Attendance
from .serializers import (
    AttendanceSerializer, AttendanceCheckinSerializer,
    AttendanceCheckoutSerializer, CurrentStatusSerializer
)
from apps.departments.models import WorkSchedule
from apps.geolocation.models import WorkLocation
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['user', 'is_late']
    ordering_fields = ['checkin_time']
    ordering = ['-checkin_time']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Сотрудники видят только свои записи
        if user.role == 'employee':
            queryset = queryset.filter(user=user)
        # Руководители видят свой отдел
        elif user.role == 'manager' and user.department:
            queryset = queryset.filter(user__department=user.department)
        # Администраторы видят все
        
        # Фильтры
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        user_id = self.request.query_params.get('user_id')
        
        if start_date:
            queryset = queryset.filter(checkin_time__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(checkin_time__date__lte=end_date)
        if user_id and (user.role in ['manager', 'admin']):
            queryset = queryset.filter(user_id=user_id)
        
        return queryset

    @action(detail=False, methods=['post'])
    def checkin(self, request):
        try:
            serializer = AttendanceCheckinSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user = request.user
            today = timezone.now().date()
            
            # Проверяем, не отмечен ли уже приход
            existing = Attendance.objects.filter(
                user=user,
                checkin_time__date=today,
                checkout_time__isnull=True
            ).first()
            
            if existing:
                return Response({
                    'error': {
                        'code': 'ALREADY_CHECKED_IN',
                        'message': 'Вы уже отметили приход сегодня'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Определяем опоздание
            is_late = False
            late_minutes = 0
            work_location = None
            
            try:
                if hasattr(user, 'work_schedule') and user.work_schedule:
                    schedule = user.work_schedule
                    checkin_time = timezone.now()
                    scheduled_time = timezone.now().replace(
                        hour=schedule.start_time.hour,
                        minute=schedule.start_time.minute,
                        second=0,
                        microsecond=0
                    )
                    
                    if checkin_time > scheduled_time:
                        diff = checkin_time - scheduled_time
                        late_minutes = int(diff.total_seconds() / 60)
                        is_late = late_minutes > (getattr(schedule, 'late_threshold', None) or 15)
            except Exception as e:
                # Игнорируем ошибки при определении опоздания
                pass
            
            # Находим рабочую локацию (опционально)
            try:
                if serializer.validated_data.get('latitude') and hasattr(user, 'department') and user.department:
                    work_location = WorkLocation.objects.filter(
                        department=user.department,
                        is_active=True
                    ).first()
            except Exception as e:
                # Игнорируем ошибки при поиске локации
                work_location = None
            
            # Преобразуем координаты в Decimal
            latitude = serializer.validated_data.get('latitude')
            longitude = serializer.validated_data.get('longitude')
            
            # Создаем запись
            attendance = Attendance.objects.create(
                user=user,
                checkin_time=timezone.now(),
                checkin_photo_url=serializer.validated_data.get('photo_url'),
                checkin_latitude=latitude,
                checkin_longitude=longitude,
                work_location=work_location,
                is_late=is_late,
                late_minutes=late_minutes,
                face_verified=serializer.validated_data.get('face_verified', False),
                location_verified=serializer.validated_data.get('location_verified', False)
            )
            
            # Отправляем WebSocket событие (опционально)
            try:
                self.send_checkin_event(attendance)
            except Exception as e:
                # Игнорируем ошибки WebSocket
                pass
            
            return Response(AttendanceSerializer(attendance).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': f'Ошибка при создании отметки: {str(e)}'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        try:
            serializer = AttendanceCheckoutSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user = request.user
            today = timezone.now().date()
            
            # Находим активную отметку прихода
            attendance = Attendance.objects.filter(
                user=user,
                checkin_time__date=today,
                checkout_time__isnull=True
            ).order_by('-checkin_time').first()
            
            if not attendance:
                return Response({
                    'error': {
                        'code': 'NOT_CHECKED_IN',
                        'message': 'Вы не отметили приход сегодня'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Преобразуем координаты в Decimal
            latitude = serializer.validated_data.get('latitude')
            longitude = serializer.validated_data.get('longitude')
            
            # Обновляем запись
            attendance.checkout_time = timezone.now()
            attendance.checkout_photo_url = serializer.validated_data.get('photo_url')
            attendance.checkout_latitude = latitude
            attendance.checkout_longitude = longitude
            attendance.save()
            
            # Отправляем WebSocket событие (опционально)
            try:
                self.send_checkout_event(attendance)
            except Exception as e:
                # Игнорируем ошибки WebSocket
                pass
            
            return Response(AttendanceSerializer(attendance).data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': f'Ошибка при создании отметки: {str(e)}'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def current(self, request):
        user = request.user
        today = timezone.now().date()
        
        attendance = Attendance.objects.filter(
            user=user,
            checkin_time__date=today
        ).order_by('-checkin_time').first()
        
        if not attendance:
            return Response({
                'is_checked_in': False,
                'checkin_time': None,
                'hours_worked': 0,
                'attendance_id': None
            })
        
        is_checked_in = attendance.checkout_time is None
        
        if is_checked_in:
            hours_worked = (timezone.now() - attendance.checkin_time).total_seconds() / 3600
        else:
            hours_worked = attendance.total_hours or 0
        
        return Response({
            'is_checked_in': is_checked_in,
            'checkin_time': attendance.checkin_time,
            'hours_worked': round(hours_worked, 2),
            'attendance_id': attendance.id
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def active(self, request):
        """Получить активных сотрудников"""
        user = request.user
        today = timezone.now().date()
        
        # Определяем queryset в зависимости от роли
        if user.role == 'employee':
            # Сотрудники видят только себя, если они на работе
            queryset = Attendance.objects.filter(
                user=user,
                checkin_time__date=today,
                checkout_time__isnull=True
            )
        elif user.role == 'manager' and user.department:
            # Руководители видят свой отдел
            queryset = Attendance.objects.filter(
                user__department=user.department,
                checkin_time__date=today,
                checkout_time__isnull=True
            )
        else:
            # Администраторы видят всех
            queryset = Attendance.objects.filter(
                checkin_time__date=today,
                checkout_time__isnull=True
            )
        
        # Фильтр по отделу (для админов и менеджеров)
        department_id = request.query_params.get('department_id')
        if department_id and user.role in ['manager', 'admin']:
            queryset = queryset.filter(user__department_id=department_id)
        
        data = []
        user_ids_in_list = set()  # Для отслеживания, какие пользователи уже добавлены
        
        for att in queryset.select_related('user', 'user__department'):
            hours_worked = (timezone.now() - att.checkin_time).total_seconds() / 3600
            user_data = {
                'user_id': att.user.id,
                'full_name': f'{att.user.first_name} {att.user.last_name}',
                'department': att.user.department.name if att.user.department else None,
                'checkin_time': att.checkin_time,
                'hours_worked': round(hours_worked, 2),
                'location': {
                    'latitude': float(att.checkin_latitude) if att.checkin_latitude else None,
                    'longitude': float(att.checkin_longitude) if att.checkin_longitude else None
                }
            }
            data.append(user_data)
            user_ids_in_list.add(att.user.id)
        
        # ВАЖНО: Если текущий пользователь на работе, но его нет в списке, добавляем его
        # Это гарантирует, что пользователь всегда видит себя в списке активных
        current_user_attendance = Attendance.objects.filter(
            user=user,
            checkin_time__date=today,
            checkout_time__isnull=True
        ).order_by('-checkin_time').first()
        
        if current_user_attendance and user.id not in user_ids_in_list:
            hours_worked = (timezone.now() - current_user_attendance.checkin_time).total_seconds() / 3600
            data.append({
                'user_id': user.id,
                'full_name': f'{user.first_name} {user.last_name}',
                'department': user.department.name if user.department else None,
                'checkin_time': current_user_attendance.checkin_time,
                'hours_worked': round(hours_worked, 2),
                'location': {
                    'latitude': float(current_user_attendance.checkin_latitude) if current_user_attendance.checkin_latitude else None,
                    'longitude': float(current_user_attendance.checkin_longitude) if current_user_attendance.checkin_longitude else None
                }
            })
        
        return Response(data)

    def send_checkin_event(self, attendance):
        """Отправка WebSocket события о приходе"""
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'dashboard',
                {
                    'type': 'employee_checkin',
                    'user_id': attendance.user.id,
                    'user_name': f'{attendance.user.first_name} {attendance.user.last_name}',
                    'department_id': attendance.user.department_id,
                    'checkin_time': attendance.checkin_time.isoformat(),
                    'is_late': attendance.is_late,
                    'late_minutes': attendance.late_minutes
                }
            )

    def send_checkout_event(self, attendance):
        """Отправка WebSocket события об уходе"""
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'dashboard',
                {
                    'type': 'employee_checkout',
                    'user_id': attendance.user.id,
                    'user_name': f'{attendance.user.first_name} {attendance.user.last_name}',
                    'checkout_time': attendance.checkout_time.isoformat(),
                    'total_hours': float(attendance.total_hours or 0)
                }
            )

