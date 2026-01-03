from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class Company(models.Model):
    """Модель компании для мультитенантности"""
    name = models.CharField(max_length=200, verbose_name='Название компании')
    domain = models.CharField(max_length=100, unique=True, null=True, blank=True, verbose_name='Домен')
    is_active = models.BooleanField(default=True, verbose_name='Активна')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        db_table = 'companies'
        verbose_name = 'Компания'
        verbose_name_plural = 'Компании'
        ordering = ['name']

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    def create_user(self, email=None, password=None, **extra_fields):
        if not email and not extra_fields.get('telegram_id'):
            raise ValueError('Email или Telegram ID обязательны')
        
        email = self.normalize_email(email) if email else None
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='employees',
        null=True,
        blank=True,
        verbose_name='Компания'
    )
    telegram_id = models.BigIntegerField(null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, null=True, blank=True)
    
    ROLE_CHOICES = [
        ('employee', 'Сотрудник'),
        ('manager', 'Руководитель'),
        ('admin', 'Администратор'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees'
    )
    position = models.CharField(max_length=100, null=True, blank=True)
    
    SALARY_TYPE_CHOICES = [
        ('fixed', 'Фиксированная'),
        ('hourly', 'Почасовая'),
    ]
    salary_type = models.CharField(max_length=20, choices=SALARY_TYPE_CHOICES, default='hourly')
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fixed_salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    work_schedule = models.ForeignKey(
        'departments.WorkSchedule',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    hire_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users'
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
        # Telegram ID уникален в рамках компании (email уникален глобально для USERNAME_FIELD)
        constraints = [
            models.UniqueConstraint(fields=['company', 'telegram_id'], condition=models.Q(telegram_id__isnull=False), name='unique_company_telegram_id'),
        ]
        indexes = [
            models.Index(fields=['company', 'telegram_id']),
            models.Index(fields=['company', 'email']),
            models.Index(fields=['role']),
            models.Index(fields=['department']),
            models.Index(fields=['company']),
        ]

    def __str__(self):
        return f'{self.first_name} {self.last_name}'
