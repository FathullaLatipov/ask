from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models.signals import pre_save
from django.dispatch import receiver

User = get_user_model()


class Attendance(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendances')
    checkin_time = models.DateTimeField()
    checkout_time = models.DateTimeField(null=True, blank=True)
    
    checkin_photo_url = models.URLField(max_length=500, null=True, blank=True)
    checkout_photo_url = models.URLField(max_length=500, null=True, blank=True)
    
    checkin_latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    checkin_longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    checkout_latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    checkout_longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    work_location = models.ForeignKey(
        'geolocation.WorkLocation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    is_late = models.BooleanField(default=False)
    late_minutes = models.IntegerField(default=0)
    
    face_verified = models.BooleanField(default=False)
    location_verified = models.BooleanField(default=False)
    
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attendance'
        verbose_name = 'Учет рабочего времени'
        verbose_name_plural = 'Учет рабочего времени'
        indexes = [
            models.Index(fields=['user', 'checkin_time']),
            models.Index(fields=['checkin_time']),
        ]
        ordering = ['-checkin_time']

    def __str__(self):
        return f'{self.user} - {self.checkin_time.date()}'

    def calculate_total_hours(self):
        if self.checkout_time and self.checkin_time:
            delta = self.checkout_time - self.checkin_time
            return delta.total_seconds() / 3600
        return None


@receiver(pre_save, sender=Attendance)
def calculate_hours(sender, instance, **kwargs):
    if instance.checkout_time and instance.checkin_time:
        delta = instance.checkout_time - instance.checkin_time
        instance.total_hours = delta.total_seconds() / 3600

