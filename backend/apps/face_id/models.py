from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class FacePhoto(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='face_photos')
    photo_url = models.URLField(max_length=500)
    encoding = models.JSONField(null=True, blank=True)  # векторное представление лица
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'face_photos'
        verbose_name = 'Фото для Face ID'
        verbose_name_plural = 'Фото для Face ID'
        indexes = [
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f'{self.user} - {self.created_at.date()}'

