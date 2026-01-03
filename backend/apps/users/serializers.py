from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import translation
from .models import User


class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'company', 'company_name', 'telegram_id', 'email', 'phone', 'first_name', 'last_name', 'middle_name',
            'role', 'department', 'department_name', 'position', 'salary_type',
            'hourly_rate', 'fixed_salary', 'is_active', 'hire_date'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_department_name(self, obj):
        """Возвращает название отдела на текущем языке"""
        if not obj.department:
            return None
        lang = translation.get_language() or 'ru'
        if lang == 'uz' and hasattr(obj.department, 'name_uz') and obj.department.name_uz:
            return obj.department.name_uz
        elif lang == 'ru' and hasattr(obj.department, 'name_ru') and obj.department.name_ru:
            return obj.department.name_ru
        return obj.department.name
    
    def get_company_name(self, obj):
        """Возвращает название компании на текущем языке"""
        if not obj.company:
            return None
        lang = translation.get_language() or 'ru'
        if lang == 'uz' and hasattr(obj.company, 'name_uz') and obj.company.name_uz:
            return obj.company.name_uz
        elif lang == 'ru' and hasattr(obj.company, 'name_ru') and obj.company.name_ru:
            return obj.company.name_ru
        return obj.company.name


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
        # Автоматически устанавливаем company из request, если не указана
        if 'company' not in validated_data and hasattr(self.context.get('request'), 'company'):
            validated_data['company'] = self.context['request'].company
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
            # Статическая проверка для admin@gmail.com / admin
            if email == 'admin@gmail.com' and password == 'admin':
                # Проверяем, существует ли пользователь в БД
                try:
                    user = User.objects.get(email='admin@gmail.com')
                    # Проверяем пароль
                    if not user.check_password('admin'):
                        user.set_password('admin')
                    # Обновляем данные для статического входа
                    user.is_active = True
                    user.role = 'admin'
                    user.is_staff = True
                    user.is_superuser = True
                    user.save()
                except User.DoesNotExist:
                    # Пользователь не существует - нельзя войти
                    raise serializers.ValidationError('Пользователь не найден в системе')
                attrs['user'] = user
                return attrs
            
            # Обычная проверка через authenticate для других пользователей
            # Сначала проверяем, существует ли пользователь
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                raise serializers.ValidationError('Пользователь не найден в системе')
            
            # Проверяем пароль через authenticate
            authenticated_user = authenticate(request=self.context.get('request'), username=email, password=password)
            if not authenticated_user:
                raise serializers.ValidationError('Неверный email или пароль')
            if not authenticated_user.is_active:
                raise serializers.ValidationError('Аккаунт неактивен')
            attrs['user'] = authenticated_user
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

