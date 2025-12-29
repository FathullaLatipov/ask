from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Department(models.Model):
    name = models.CharField(max_length=200, verbose_name='Название')
    description = models.TextField(null=True, blank=True, verbose_name='Описание')
    manager = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_departments',
        verbose_name='Руководитель'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    class Meta:
        db_table = 'departments'
        verbose_name = 'Отдел'
        verbose_name_plural = 'Отделы'
        ordering = ['name']

    def __str__(self):
        return self.name


class WorkSchedule(models.Model):
    name = models.CharField(max_length=100, verbose_name='Название')
    start_time = models.TimeField(verbose_name='Время начала работы')
    end_time = models.TimeField(verbose_name='Время окончания работы')
    break_duration = models.IntegerField(default=60, verbose_name='Длительность перерыва (минуты)')
    work_days = models.JSONField(default=list, verbose_name='Рабочие дни')  # [1,2,3,4,5] для пн-пт
    late_threshold = models.IntegerField(default=15, verbose_name='Порог опоздания (минуты)')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    class Meta:
        db_table = 'work_schedules'
        verbose_name = 'График работы'
        verbose_name_plural = 'Графики работы'
        ordering = ['name']

    def __str__(self):
        return self.name