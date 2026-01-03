"""
Management command для создания тестовых данных
Запуск: python manage.py create_test_data
"""
from django.core.management.base import BaseCommand
from datetime import datetime, timedelta, date
from decimal import Decimal
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.users.models import Company
from apps.departments.models import Department, WorkSchedule
from apps.attendance.models import Attendance
from apps.requests.models import Request
from apps.salary.models import Salary
from apps.geolocation.models import WorkLocation

User = get_user_model()


class Command(BaseCommand):
    help = 'Создание тестовых данных для системы'

    def handle(self, *args, **options):
        self.stdout.write('Создание тестовых данных...')
        
        # 0. Создание компании
        self.stdout.write('0. Создание компании...')
        company, created = Company.objects.get_or_create(
            name='Тестовая компания',
            defaults={
                'domain': 'test',
                'is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'   Создана компания: {company.name}'))
        else:
            self.stdout.write(f'   Используется существующая компания: {company.name}')
        
        # 1. Создание графиков работы
        self.stdout.write('1. Создание графиков работы...')
        schedule1, _ = WorkSchedule.objects.get_or_create(
            name="Стандартный график",
            company=company,
            defaults={
                'start_time': '09:00:00',
                'end_time': '18:00:00',
                'break_duration': 60,
                'work_days': [1, 2, 3, 4, 5],  # Пн-Пт
                'late_threshold': 15
            }
        )
        
        schedule2, _ = WorkSchedule.objects.get_or_create(
            name="Сменный график",
            company=company,
            defaults={
                'start_time': '08:00:00',
                'end_time': '17:00:00',
                'break_duration': 60,
                'work_days': [1, 2, 3, 4, 5, 6],
                'late_threshold': 10
            }
        )
        self.stdout.write(self.style.SUCCESS(f'   Создано графиков: {WorkSchedule.objects.filter(company=company).count()}'))
        
        # 2. Создание отделов
        self.stdout.write('2. Создание отделов...')
        dept_it, _ = Department.objects.get_or_create(
            name="IT отдел",
            company=company,
            defaults={'description': 'Отдел информационных технологий'}
        )
        
        dept_sales, _ = Department.objects.get_or_create(
            name="Отдел продаж",
            company=company,
            defaults={'description': 'Отдел продаж и маркетинга'}
        )
        
        dept_hr, _ = Department.objects.get_or_create(
            name="HR отдел",
            company=company,
            defaults={'description': 'Отдел кадров'}
        )
        
        dept_finance, _ = Department.objects.get_or_create(
            name="Финансовый отдел",
            company=company,
            defaults={'description': 'Финансовый отдел и бухгалтерия'}
        )
        self.stdout.write(self.style.SUCCESS(f'   Создано отделов: {Department.objects.filter(company=company).count()}'))
        
        # 3. Создание рабочих локаций
        self.stdout.write('3. Создание рабочих локаций...')
        location1, _ = WorkLocation.objects.get_or_create(
            name="Главный офис",
            department=dept_it,
            defaults={
                'address': 'Москва, ул. Тверская, 1',
                'latitude': Decimal('55.7558'),
                'longitude': Decimal('37.6173'),
                'radius': 100,
            }
        )
        
        location2, _ = WorkLocation.objects.get_or_create(
            name="Офис продаж",
            department=dept_sales,
            defaults={
                'address': 'Москва, ул. Ленина, 10',
                'latitude': Decimal('55.7512'),
                'longitude': Decimal('37.6184'),
                'radius': 150,
            }
        )
        self.stdout.write(self.style.SUCCESS(f'   Создано локаций: {WorkLocation.objects.filter(department__company=company).count()}'))
        
        # 4. Создание пользователей
        self.stdout.write('4. Создание пользователей...')
        
        # Менеджеры отделов
        manager_it, _ = User.objects.get_or_create(
            email='manager.it@example.com',
            defaults={
                'company': company,
                'first_name': 'Иван',
                'last_name': 'Петров',
                'role': 'manager',
                'department': dept_it,
                'position': 'Руководитель IT отдела',
                'salary_type': 'fixed',
                'fixed_salary': Decimal('150000.00'),
                'work_schedule': schedule1,
                'is_active': True
            }
        )
        if not manager_it.password or manager_it.check_password('password123'):
            manager_it.set_password('password123')
            manager_it.save()
        
        manager_sales, _ = User.objects.get_or_create(
            email='manager.sales@example.com',
            defaults={
                'company': company,
                'first_name': 'Мария',
                'last_name': 'Сидорова',
                'role': 'manager',
                'department': dept_sales,
                'position': 'Руководитель отдела продаж',
                'salary_type': 'fixed',
                'fixed_salary': Decimal('140000.00'),
                'work_schedule': schedule1,
                'is_active': True
            }
        )
        if not manager_sales.password or manager_sales.check_password('password123'):
            manager_sales.set_password('password123')
            manager_sales.save()
        
        # Обновляем менеджеров отделов
        dept_it.manager = manager_it
        dept_it.save()
        dept_sales.manager = manager_sales
        dept_sales.save()
        
        # Сотрудники IT отдела
        employees_it = [
            {'email': 'dev1@example.com', 'first_name': 'Алексей', 'last_name': 'Иванов', 'position': 'Senior Developer', 'hourly_rate': Decimal('2000.00')},
            {'email': 'dev2@example.com', 'first_name': 'Дмитрий', 'last_name': 'Смирнов', 'position': 'Developer', 'hourly_rate': Decimal('1500.00')},
            {'email': 'dev3@example.com', 'first_name': 'Сергей', 'last_name': 'Кузнецов', 'position': 'Junior Developer', 'hourly_rate': Decimal('1000.00')},
        ]
        
        for emp_data in employees_it:
            user, created = User.objects.get_or_create(
                email=emp_data['email'],
                defaults={
                    'company': company,
                    'first_name': emp_data['first_name'],
                    'last_name': emp_data['last_name'],
                    'role': 'employee',
                    'department': dept_it,
                    'position': emp_data['position'],
                    'salary_type': 'hourly',
                    'hourly_rate': emp_data['hourly_rate'],
                    'work_schedule': schedule1,
                    'is_active': True,
                    'hire_date': date.today() - timedelta(days=365)
                }
            )
            if not user.password or user.check_password('password123'):
                user.set_password('password123')
                user.save()
        
        # Сотрудники отдела продаж
        employees_sales = [
            {'email': 'sales1@example.com', 'first_name': 'Анна', 'last_name': 'Волкова', 'position': 'Менеджер по продажам', 'hourly_rate': Decimal('1200.00')},
            {'email': 'sales2@example.com', 'first_name': 'Елена', 'last_name': 'Новикова', 'position': 'Менеджер по продажам', 'hourly_rate': Decimal('1200.00')},
            {'email': 'sales3@example.com', 'first_name': 'Ольга', 'last_name': 'Морозова', 'position': 'Старший менеджер', 'hourly_rate': Decimal('1800.00')},
        ]
        
        for emp_data in employees_sales:
            user, created = User.objects.get_or_create(
                email=emp_data['email'],
                defaults={
                    'company': company,
                    'first_name': emp_data['first_name'],
                    'last_name': emp_data['last_name'],
                    'role': 'employee',
                    'department': dept_sales,
                    'position': emp_data['position'],
                    'salary_type': 'hourly',
                    'hourly_rate': emp_data['hourly_rate'],
                    'work_schedule': schedule2,
                    'is_active': True,
                    'hire_date': date.today() - timedelta(days=180)
                }
            )
            if not user.password or user.check_password('password123'):
                user.set_password('password123')
                user.save()
        
        # Сотрудники HR
        hr_emp, _ = User.objects.get_or_create(
            email='hr1@example.com',
            defaults={
                'company': company,
                'first_name': 'Татьяна',
                'last_name': 'Федорова',
                'role': 'employee',
                'department': dept_hr,
                'position': 'HR специалист',
                'salary_type': 'fixed',
                'fixed_salary': Decimal('80000.00'),
                'work_schedule': schedule1,
                'is_active': True
            }
        )
        if not hr_emp.password or hr_emp.check_password('password123'):
            hr_emp.set_password('password123')
            hr_emp.save()
        
        # Обновляем company для существующих пользователей, если они её не имеют
        User.objects.filter(company__isnull=True).update(company=company)
        
        self.stdout.write(self.style.SUCCESS(f'   Создано пользователей: {User.objects.filter(company=company).count()}'))
        
        # 5. Создание записей посещаемости
        self.stdout.write('5. Создание записей посещаемости...')
        all_employees = User.objects.filter(company=company, role='employee', is_active=True)
        
        # Создаем записи за последние 30 дней
        today = datetime.now().date()
        attendance_count = 0
        
        for user in all_employees:
            for i in range(30):
                check_date = today - timedelta(days=i)
                # Пропускаем выходные (суббота=5, воскресенье=6)
                if check_date.weekday() >= 5:
                    continue
                
                # Создаем запись прихода (timezone-aware)
                checkin_time = timezone.make_aware(
                    datetime.combine(check_date, datetime.strptime('09:00', '%H:%M').time())
                )
                # Иногда добавляем опоздание
                if i % 7 == 0:  # Каждую неделю одно опоздание
                    checkin_time += timedelta(minutes=20)
                    is_late = True
                    late_minutes = 20
                else:
                    is_late = False
                    late_minutes = 0
                
                checkout_time = checkin_time + timedelta(hours=8, minutes=30)
                
                attendance, created = Attendance.objects.get_or_create(
                    user=user,
                    checkin_time__date=check_date,
                    defaults={
                        'checkin_time': checkin_time,
                        'checkout_time': checkout_time,
                        'is_late': is_late,
                        'late_minutes': late_minutes,
                        'face_verified': True,
                        'location_verified': True,
                        'work_location': location1 if user.department == dept_it else location2,
                        'total_hours': Decimal('8.50')
                    }
                )
                if created:
                    attendance_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'   Создано записей посещаемости: {attendance_count}'))
        
        # 6. Создание заявок
        self.stdout.write('6. Создание заявок...')
        request_count = 0
        
        # Заявки на отпуск
        for user in all_employees[:3]:
            request, created = Request.objects.get_or_create(
                user=user,
                request_type='vacation',
                start_date=today + timedelta(days=30),
                defaults={
                    'end_date': today + timedelta(days=37),
                    'reason': 'Плановый отпуск',
                    'status': 'pending'
                }
            )
            if created:
                request_count += 1
        
        # Заявки на больничный
        for user in all_employees[3:5]:
            request, created = Request.objects.get_or_create(
                user=user,
                request_type='sick_leave',
                start_date=today - timedelta(days=5),
                defaults={
                    'end_date': today + timedelta(days=2),
                    'reason': 'Больничный',
                    'status': 'pending'
                }
            )
            if created:
                request_count += 1
        
        # Заявки на аванс
        for user in all_employees[:2]:
            request, created = Request.objects.get_or_create(
                user=user,
                request_type='advance',
                start_date=today,
                defaults={
                    'amount': Decimal('20000.00'),
                    'reason': 'Запрос на аванс',
                    'status': 'pending'
                }
            )
            if created:
                request_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'   Создано заявок: {request_count}'))
        
        # 7. Создание зарплат
        self.stdout.write('7. Создание зарплат...')
        current_month = date.today().replace(day=1)
        salary_count = 0
        
        for user in User.objects.filter(company=company, is_active=True):
            if user.salary_type == 'hourly':
                base_hours = Decimal('160.00')  # 8 часов * 20 дней
                base_amount = base_hours * (user.hourly_rate or Decimal('0'))
                overtime_hours = Decimal('10.00')
                overtime_amount = overtime_hours * (user.hourly_rate or Decimal('0')) * Decimal('1.5')
            else:
                base_hours = Decimal('0.00')
                base_amount = user.fixed_salary or Decimal('0')
                overtime_hours = Decimal('0.00')
                overtime_amount = Decimal('0.00')
            
            total_amount = base_amount + overtime_amount
            
            salary, created = Salary.objects.get_or_create(
                user=user,
                period=current_month,
                defaults={
                    'base_hours': base_hours,
                    'base_amount': base_amount,
                    'overtime_hours': overtime_hours,
                    'overtime_amount': overtime_amount,
                    'penalties_amount': Decimal('0.00'),
                    'advances_amount': Decimal('0.00'),
                    'total_amount': total_amount,
                    'status': 'calculated'
                }
            )
            if created:
                salary_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'   Создано зарплат: {salary_count}'))
        
        self.stdout.write(self.style.SUCCESS('\n[OK] Тестовые данные успешно созданы!'))
        self.stdout.write(f'\nСтатистика:')
        self.stdout.write(f'  - Компания: {company.name} (ID: {company.id})')
        self.stdout.write(f'  - Отделов: {Department.objects.filter(company=company).count()}')
        self.stdout.write(f'  - Пользователей: {User.objects.filter(company=company).count()}')
        self.stdout.write(f'  - Записей посещаемости: {Attendance.objects.filter(user__company=company).count()}')
        self.stdout.write(f'  - Заявок: {Request.objects.filter(user__company=company).count()}')
        self.stdout.write(f'  - Зарплат: {Salary.objects.filter(user__company=company).count()}')
        self.stdout.write(f'\nДля входа используйте:')
        self.stdout.write(f'  Email: admin@gmail.com, Пароль: admin')
        self.stdout.write(f'  Или любой email из созданных пользователей с паролем: password123')

