from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()


class Salary(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='salaries')
    period = models.DateField()  # год-месяц (первое число месяца)
    
    base_hours = models.DecimalField(max_digits=6, decimal_places=2)
    base_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    overtime_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    penalties_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    advances_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    STATUS_CHOICES = [
        ('calculated', 'Рассчитана'),
        ('paid', 'Выплачена'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='calculated')
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'salaries'
        verbose_name = 'Заработная плата'
        verbose_name_plural = 'Заработная плата'
        unique_together = ['user', 'period']
        indexes = [
            models.Index(fields=['user', 'period']),
        ]

    def __str__(self):
        return f'{self.user} - {self.period}'


class SalaryCalculation(models.Model):
    salary = models.ForeignKey(Salary, on_delete=models.CASCADE, related_name='calculations')
    calculation_type = models.CharField(max_length=50)  # base, overtime, penalty, advance
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'salary_calculations'
        verbose_name = 'Детализация расчета ЗП'
        verbose_name_plural = 'Детализация расчета ЗП'

