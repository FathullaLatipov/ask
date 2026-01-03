"""
Middleware для мультитенантности SaaS
Определяет текущую компанию из различных источников
"""
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import translation
from apps.users.models import Company

User = get_user_model()


class TenantMiddleware(MiddlewareMixin):
    """
    Middleware для определения текущей компании (tenant)
    
    Проверяет следующие источники в порядке приоритета:
    1. Заголовок HTTP X-Company-ID
    2. Поддомен (company1.example.com -> company1)
    3. Company пользователя из токена
    """
    
    def process_request(self, request):
        company = None
        
        # 1. Проверяем заголовок X-Company-ID
        company_id = request.META.get('HTTP_X_COMPANY_ID')
        if company_id:
            try:
                company = Company.objects.get(id=int(company_id), is_active=True)
            except (Company.DoesNotExist, ValueError):
                pass
        
        # 2. Проверяем поддомен
        if not company:
            host = request.get_host().split(':')[0]  # Убираем порт
            subdomain = host.split('.')[0] if '.' in host else None
            
            if subdomain and subdomain not in ['www', 'api', 'admin']:
                try:
                    # Пытаемся найти по домену или по имени (если домен = имя компании)
                    company = Company.objects.filter(
                        models.Q(domain=subdomain) | models.Q(name__iexact=subdomain),
                        is_active=True
                    ).first()
                except:
                    pass
        
        # 3. Если пользователь аутентифицирован, используем его компанию
        if not company and hasattr(request, 'user') and request.user.is_authenticated:
            if hasattr(request.user, 'company') and request.user.company:
                company = request.user.company
        
        # Сохраняем компанию в request для использования в views
        request.company = company
        
        # Обработка языка из заголовка Accept-Language или X-Language
        lang = request.META.get('HTTP_X_LANGUAGE') or request.META.get('HTTP_ACCEPT_LANGUAGE', 'ru')
        if lang:
            # Извлекаем язык из Accept-Language (может быть "ru,en;q=0.9")
            if ',' in lang:
                lang = lang.split(',')[0].strip()
            if ';' in lang:
                lang = lang.split(';')[0].strip()
            # Проверяем, что язык поддерживается
            if lang not in ['ru', 'uz']:
                lang = 'ru'
            translation.activate(lang)
            request.LANGUAGE_CODE = lang
        
        return None

