from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model

User = get_user_model()


class TelegramAuthentication(TokenAuthentication):
    """
    Кастомная аутентификация для Telegram Bot
    """
    def authenticate(self, request):
        telegram_id = request.META.get('HTTP_X_TELEGRAM_ID')
        if telegram_id:
            try:
                user = User.objects.get(telegram_id=int(telegram_id), is_active=True)
                return (user, None)
            except User.DoesNotExist:
                raise AuthenticationFailed('Пользователь не найден')
        return super().authenticate(request)

