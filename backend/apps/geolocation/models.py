from django.db import models
from apps.departments.models import Department


class WorkLocation(models.Model):
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='work_locations'
    )
    name = models.CharField(max_length=100)
    address = models.TextField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    radius = models.IntegerField(default=100)  # радиус в метрах
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'work_locations'
        verbose_name = 'Рабочая локация'
        verbose_name_plural = 'Рабочие локации'
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['department']),
        ]

    def __str__(self):
        return self.name
