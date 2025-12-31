"""
Скрипт для создания тестовых данных.
Запуск: python manage.py shell < create_test_data.py
Или: python manage.py shell, затем скопировать и выполнить код
"""
import os
import django
from datetime import datetime, timedelta, date
from decimal import Decimal
from django.utils import timezone

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.departments.models import Department, WorkSchedule
from apps.attendance.models import Attendance
from apps.requests.models import Request
from apps.salary.models import Salary
from apps.geolocation.models import WorkLocation

User = get_user_model()

def create_test_data():
    print("Создание тестовых данных...")
    
    # 1. Создание графиков работы
    print("1. Создание графиков работы...")
    schedule1, _ = WorkSchedule.objects.get_or_create(
        name="Стандартный график",
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
        defaults={
            'start_time': '08:00:00',
            'end_time': '17:00:00',
            'break_duration': 60,
            'work_days': [1, 2, 3, 4, 5, 6],
            'late_threshold': 10
        }
    )
    print(f"   Создано графиков: {WorkSchedule.objects.count()}")
    
    # 2. Создание отделов
    print("2. Создание отделов...")
    dept_it, _ = Department.objects.get_or_create(
        name="IT отдел",
        defaults={'description': 'Отдел информационных технологий'}
    )
    
    dept_sales, _ = Department.objects.get_or_create(
        name="Отдел продаж",
        defaults={'description': 'Отдел продаж и маркетинга'}
    )
    
    dept_hr, _ = Department.objects.get_or_create(
        name="HR отдел",
        defaults={'description': 'Отдел кадров'}
    )
    
    dept_finance, _ = Department.objects.get_or_create(
        name="Финансовый отдел",
        defaults={'description': 'Финансовый отдел и бухгалтерия'}
    )
    print(f"   Создано отделов: {Department.objects.count()}")
    
    # 3. Создание рабочих локаций
    print("3. Создание рабочих локаций...")
    location1, _ = WorkLocation.objects.get_or_create(
        name="Главный офис",
        defaults={
            'address': 'Москва, ул. Тверская, 1',
            'latitude': Decimal('55.7558'),
            'longitude': Decimal('37.6173'),
            'radius': 100,
            'department': dept_it
        }
    )
    
    location2, _ = WorkLocation.objects.get_or_create(
        name="Офис продаж",
        defaults={
            'address': 'Москва, ул. Ленина, 10',
            'latitude': Decimal('55.7512'),
            'longitude': Decimal('37.6184'),
            'radius': 150,
            'department': dept_sales
        }
    )
    print(f"   Создано локаций: {WorkLocation.objects.count()}")
    
    # 4. Создание пользователей
    print("4. Создание пользователей...")
    
    # Менеджеры отделов
    manager_it, _ = User.objects.get_or_create(
        email='manager.it@example.com',
        defaults={
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
    
    print(f"   Создано пользователей: {User.objects.count()}")
    
    # 5. Создание записей посещаемости
    print("5. Создание записей посещаемости...")
    all_employees = User.objects.filter(role='employee', is_active=True)
    
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
    
    print(f"   Создано записей посещаемости: {attendance_count}")
    
    # 6. Создание заявок
    print("6. Создание заявок...")
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
    
    print(f"   Создано заявок: {request_count}")
    
    # 7. Создание зарплат
    print("7. Создание зарплат...")
    current_month = date.today().replace(day=1)
    salary_count = 0
    
    for user in User.objects.filter(is_active=True):
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
    
    print(f"   Создано зарплат: {salary_count}")
    
    print("\n[OK] Тестовые данные успешно созданы!")
    print(f"\nСтатистика:")
    print(f"  - Отделов: {Department.objects.count()}")
    print(f"  - Пользователей: {User.objects.count()}")
    print(f"  - Записей посещаемости: {Attendance.objects.count()}")
    print(f"  - Заявок: {Request.objects.count()}")
    print(f"  - Зарплат: {Salary.objects.count()}")
    print(f"\nДля входа используйте:")
    print(f"  Email: admin@gmail.com, Пароль: admin")
    print(f"  Или любой email из созданных пользователей с паролем: password123")

if __name__ == '__main__':
    create_test_data()

