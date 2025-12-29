from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'telegram_id', 'email', 'phone', 'first_name', 'last_name', 'middle_name',
            'role', 'department', 'department_name', 'position', 'salary_type',
            'hourly_rate', 'fixed_salary', 'is_active', 'hire_date'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    
    class Meta:
        model = User
        fields = [
            'telegram_id', 'email', 'password', 'first_name', 'last_name', 'middle_name',
            'department', 'position', 'role', 'salary_type', 'hourly_rate',
            'fixed_salary', 'work_schedule', 'hire_date'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'first_name', 'last_name', 'middle_name',
            'department', 'position', 'role', 'salary_type', 'hourly_rate',
            'fixed_salary', 'work_schedule', 'is_active'
        ]

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            # Поскольку USERNAME_FIELD = 'email', передаем email как username
            user = authenticate(request=self.context.get('request'), username=email, password=password)
            if not user:
                raise serializers.ValidationError('Неверный email или пароль')
            if not user.is_active:
                raise serializers.ValidationError('Аккаунт неактивен')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Необходимо указать email и пароль')
        return attrs


class TelegramAuthSerializer(serializers.Serializer):
    telegram_id = serializers.IntegerField()
    first_name = serializers.CharField()
    last_name = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        telegram_id = validated_data['telegram_id']
        user, created = User.objects.get_or_create(
            telegram_id=telegram_id,
            defaults={
                'first_name': validated_data['first_name'],
                'last_name': validated_data.get('last_name', ''),
                'role': 'employee',
                'is_active': True
            }
        )
        if not created:
            # Обновляем имя, если изменилось
            user.first_name = validated_data['first_name']
            if validated_data.get('last_name'):
                user.last_name = validated_data['last_name']
            user.save()
        return user

