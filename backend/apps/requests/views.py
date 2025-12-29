from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Request
from .serializers import (
    RequestSerializer, RequestApproveSerializer, RequestRejectSerializer
)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()


class RequestViewSet(viewsets.ModelViewSet):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['user', 'status', 'request_type']
    search_fields = ['reason']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Сотрудники видят только свои заявки
        if user.role == 'employee':
            queryset = queryset.filter(user=user)
        # Руководители видят свой отдел
        elif user.role == 'manager' and user.department:
            queryset = queryset.filter(user__department=user.department)
        # Администраторы видят все
        
        # Дополнительные фильтры
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(start_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(end_date__lte=end_date)
        
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Утвердить заявку (Manager/Admin)"""
        if request.user.role == 'employee':
            return Response({
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'Недостаточно прав доступа'
                }
            }, status=status.HTTP_403_FORBIDDEN)
        
        req = self.get_object()
        serializer = RequestApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        req.status = 'approved'
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.review_comment = serializer.validated_data.get('comment', '')
        req.save()
        
        # Отправляем WebSocket событие
        self.send_request_event(req, 'approved')
        
        return Response(RequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Отклонить заявку (Manager/Admin)"""
        if request.user.role == 'employee':
            return Response({
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'Недостаточно прав доступа'
                }
            }, status=status.HTTP_403_FORBIDDEN)
        
        req = self.get_object()
        serializer = RequestRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        req.status = 'rejected'
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.review_comment = serializer.validated_data['comment']
        req.save()
        
        # Отправляем WebSocket событие
        self.send_request_event(req, 'rejected')
        
        return Response(RequestSerializer(req).data)

    def send_request_event(self, request_obj, action):
        """Отправка WebSocket события"""
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'dashboard',
                {
                    'type': f'request_{action}',
                    'request_id': request_obj.id,
                    'user_id': request_obj.user.id,
                    'user_name': str(request_obj.user),
                    'reviewed_by': request_obj.reviewed_by.id if request_obj.reviewed_by else None
                }
            )

