from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Request(models.Model):
    REQUEST_TYPE_CHOICES = [
        ('vacation', 'Отпуск'),
        ('sick_leave', 'Больничный'),
        ('day_off', 'Выходной'),
        ('advance', 'Аванс'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'На рассмотрении'),
        ('approved', 'Утверждена'),
        ('rejected', 'Отклонена'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requests')
    request_type = models.CharField(max_length=50, choices=REQUEST_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # для аванса
    reason = models.TextField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_requests'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_comment = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'requests'
        verbose_name = 'Заявка'
        verbose_name_plural = 'Заявки'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['start_date', 'end_date']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} - {self.get_request_type_display()}'


class Penalty(models.Model):
    PENALTY_TYPE_CHOICES = [
        ('late', 'Опоздание'),
        ('absence', 'Отсутствие'),
        ('violation', 'Нарушение'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Активен'),
        ('cancelled', 'Отменен'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='penalties')
    attendance = models.ForeignKey(
        'attendance.Attendance',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    penalty_type = models.CharField(max_length=50, choices=PENALTY_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(null=True, blank=True)
    period = models.DateField()  # период начисления (год-месяц)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_penalties'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'penalties'
        verbose_name = 'Штраф'
        verbose_name_plural = 'Штрафы'
        indexes = [
            models.Index(fields=['user', 'period']),
        ]

    def __str__(self):
        return f'{self.user} - {self.get_penalty_type_display()} - {self.amount}'
