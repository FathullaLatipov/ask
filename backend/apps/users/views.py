from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    LoginSerializer, TelegramAuthSerializer
)
from rest_framework.authtoken.models import Token
import jwt
from django.conf import settings

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'role', 'is_active']
    search_fields = ['first_name', 'last_name', 'email']
    ordering_fields = ['id', 'first_name', 'created_at']
    ordering = ['-id']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == 'me':
            return [IsAuthenticated()]
        elif self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]  # Manager и Admin могут видеть список
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        # Сотрудники видят только себя
        if self.request.user.role == 'employee':
            return queryset.filter(id=self.request.user.id)
        # Руководители видят свой отдел
        elif self.request.user.role == 'manager':
            if self.request.user.department:
                return queryset.filter(department=self.request.user.department)
            return queryset.none()
        # Администраторы видят всех
        return queryset

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[])
    def login(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Создаем или получаем токен
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })

    @action(detail=False, methods=['post'], permission_classes=[])
    def telegram(self, request):
        serializer = TelegramAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Создаем или получаем токен
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })

