"""
Скрипт для миграции существующих данных к SaaS архитектуре
Запускать: python manage.py migrate_to_saas
"""
from django.core.management.base import BaseCommand
from apps.users.models import Company, User
from apps.departments.models import Department, WorkSchedule


class Command(BaseCommand):
    help = 'Миграция существующих данных к SaaS архитектуре'

    def handle(self, *args, **options):
        self.stdout.write('Начинаем миграцию к SaaS...')
        
        # 1. Создаем дефолтную компанию
        default_company, created = Company.objects.get_or_create(
            name='Default Company',
            defaults={
                'domain': 'default',
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Создана дефолтная компания: {default_company.name}'))
        else:
            self.stdout.write(f'Дефолтная компания уже существует: {default_company.name}')
        
        # 2. Назначаем всем пользователям без компании дефолтную компанию
        users_updated = User.objects.filter(company__isnull=True).update(company=default_company)
        self.stdout.write(self.style.SUCCESS(f'Обновлено пользователей: {users_updated}'))
        
        # 3. Назначаем всем отделам без компании дефолтную компанию
        departments_updated = Department.objects.filter(company__isnull=True).update(company=default_company)
        self.stdout.write(self.style.SUCCESS(f'Обновлено отделов: {departments_updated}'))
        
        # 4. Назначаем всем графикам работы без компании дефолтную компанию
        schedules_updated = WorkSchedule.objects.filter(company__isnull=True).update(company=default_company)
        self.stdout.write(self.style.SUCCESS(f'Обновлено графиков работы: {schedules_updated}'))
        
        self.stdout.write(self.style.SUCCESS('Миграция завершена успешно!'))
        self.stdout.write(f'\nДефолтная компания ID: {default_company.id}')
        self.stdout.write('Вы можете создать дополнительные компании через Django Admin или API')

