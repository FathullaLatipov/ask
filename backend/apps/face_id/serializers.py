from rest_framework import serializers
from .models import FacePhoto
import requests
from django.conf import settings


class FacePhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacePhoto
        fields = ['id', 'user', 'photo_url', 'encoding', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']


class FaceVerifySerializer(serializers.Serializer):
    photo_url = serializers.URLField()
    check_type = serializers.ChoiceField(choices=['checkin', 'checkout'], default='checkin')

    def verify(self, user_id):
        """Отправка запроса на верификацию в Face ID Service"""
        face_id_service_url = settings.FACE_ID_SERVICE_URL
        try:
            response = requests.post(
                f'{face_id_service_url}/verify',
                json={
                    'user_id': user_id,
                    'photo_url': self.validated_data['photo_url'],
                    'check_type': self.validated_data['check_type']
                },
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {
                'verified': False,
                'confidence': 0.0,
                'message': f'Ошибка при обращении к Face ID сервису: {str(e)}'
            }


class FaceRegisterSerializer(serializers.Serializer):
    photo_url = serializers.URLField()
    is_primary = serializers.BooleanField(default=False)

    def register(self, user_id):
        """Отправка запроса на регистрацию в Face ID Service"""
        face_id_service_url = settings.FACE_ID_SERVICE_URL
        try:
            response = requests.post(
                f'{face_id_service_url}/register',
                json={
                    'user_id': user_id,
                    'photo_url': self.validated_data['photo_url'],
                    'is_primary': self.validated_data['is_primary']
                },
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise serializers.ValidationError(f'Ошибка при обращении к Face ID сервису: {str(e)}')

