from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import FacePhoto
from .serializers import (
    FacePhotoSerializer, FaceVerifySerializer, FaceRegisterSerializer
)


class FacePhotoListCreateView(generics.ListCreateAPIView):
    """Список и создание фото для Face ID"""
    queryset = FacePhoto.objects.all()
    serializer_class = FacePhotoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Сотрудники видят только свои фото
        if self.request.user.role == 'employee':
            queryset = queryset.filter(user=self.request.user)
        return queryset


class FacePhotoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """Детали, обновление и удаление фото для Face ID"""
    queryset = FacePhoto.objects.all()
    serializer_class = FacePhotoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Сотрудники видят только свои фото
        if self.request.user.role == 'employee':
            queryset = queryset.filter(user=self.request.user)
        return queryset


class FaceVerifyView(APIView):
    """Верификация фото через Face ID Service"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FaceVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_id = request.data.get('user_id', request.user.id)
        
        # Проверяем права доступа
        if request.user.role == 'employee' and user_id != request.user.id:
            return Response({
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'Недостаточно прав доступа'
                }
            }, status=status.HTTP_403_FORBIDDEN)
        
        result = serializer.verify(user_id)
        return Response(result)


class FaceRegisterView(APIView):
    """Регистрация эталонного фото"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FaceRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_id = request.data.get('user_id', request.user.id)
        
        # Проверяем права доступа
        if request.user.role == 'employee' and user_id != request.user.id:
            return Response({
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'Недостаточно прав доступа'
                }
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Регистрируем в Face ID Service
        result = serializer.register(user_id)
        
        # Сохраняем в БД
        if result.get('success'):
            face_photo = FacePhoto.objects.create(
                user_id=user_id,
                photo_url=serializer.validated_data['photo_url'],
                encoding=result.get('encoding'),
                is_primary=serializer.validated_data['is_primary']
            )
            
            # Если это основное фото, снимаем флаг с других
            if serializer.validated_data['is_primary']:
                FacePhoto.objects.filter(
                    user_id=user_id,
                    is_primary=True
                ).exclude(id=face_photo.id).update(is_primary=False)
            
            return Response(FacePhotoSerializer(face_photo).data, status=status.HTTP_201_CREATED)
        
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
