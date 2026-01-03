from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from config.mixins import TenantFilterMixin
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    LoginSerializer, TelegramAuthSerializer
)
from rest_framework.authtoken.models import Token

User = get_user_model()


class UserListCreateView(TenantFilterMixin, generics.ListCreateAPIView):
    """Список и создание пользователей"""
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'role', 'is_active']
    search_fields = ['first_name', 'last_name', 'email']
    ordering_fields = ['id', 'first_name', 'created_at']
    ordering = ['-id']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminUser()]

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
        # Администраторы видят всех в своей компании
        return queryset


class UserRetrieveUpdateDestroyView(TenantFilterMixin, generics.RetrieveUpdateDestroyAPIView):
    """Детали, обновление и удаление пользователя"""
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminUser()]

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
        # Администраторы видят всех в своей компании
        return queryset


class UserMeView(APIView):
    """Получить текущего пользователя"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserLoginView(APIView):
    """Авторизация пользователя"""
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Создаем или получаем токен
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })


class UserTelegramView(APIView):
    """Авторизация через Telegram"""
    permission_classes = []

    def post(self, request):
        serializer = TelegramAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Создаем или получаем токен
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })
