from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from .models import Salary, SalaryCalculation
from .serializers import SalarySerializer, SalaryCalculateSerializer
from apps.attendance.models import Attendance
from apps.requests.models import Request
from apps.requests.models import Request, Penalty


class SalaryViewSet(viewsets.ModelViewSet):
    queryset = Salary.objects.all()
    serializer_class = SalarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Сотрудники видят только свои ЗП
        if user.role == 'employee':
            queryset = queryset.filter(user=user)
        # Руководители видят свой отдел
        elif user.role == 'manager' and user.department:
            queryset = queryset.filter(user__department=user.department)
        # Администраторы видят все
        
        # Фильтры
        user_id = self.request.query_params.get('user_id')
        if user_id and user.role in ['manager', 'admin']:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset

    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Рассчитать ЗП за период"""
        serializer = SalaryCalculateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        period_str = serializer.validated_data['period']  # YYYY-MM
        user_id = request.data.get('user_id', request.user.id)
        
        # Проверяем права доступа
        if request.user.role == 'employee' and user_id != request.user.id:
            return Response({
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'Недостаточно прав доступа'
                }
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            period_date = datetime.strptime(period_str, '%Y-%m').date()
        except ValueError:
            return Response({
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Неверный формат периода. Используйте YYYY-MM'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Проверяем, не рассчитана ли уже ЗП
        salary, created = Salary.objects.get_or_create(
            user_id=user_id,
            period=period_date,
            defaults={'status': 'calculated'}
        )
        
        if not created:
            # Пересчитываем
            salary.calculations.all().delete()
        
        # Рассчитываем ЗП
        result = self._calculate_salary(user_id, period_date, salary)
        
        return Response(SalarySerializer(salary).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def _calculate_salary(self, user_id, period_date, salary):
        """Логика расчета ЗП"""
        from apps.users.models import User
        
        user = User.objects.get(id=user_id)
        
        # Начало и конец периода
        start_date = period_date
        if period_date.day == 1:
            # Если первое число месяца, берем весь месяц
            if period_date.month == 12:
                end_date = period_date.replace(year=period_date.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_date = period_date.replace(month=period_date.month + 1, day=1) - timedelta(days=1)
        else:
            end_date = period_date
        
        # Отработанные часы
        attendances = Attendance.objects.filter(
            user=user,
            checkin_time__date__gte=start_date,
            checkin_time__date__lte=end_date,
            checkout_time__isnull=False
        )
        
        total_hours = sum(float(att.total_hours or 0) for att in attendances)
        
        # Базовая сумма
        if user.salary_type == 'fixed':
            # Фиксированная ЗП
            base_amount = user.fixed_salary or Decimal('0.00')
            base_hours = Decimal('0.00')
        else:
            # Почасовая оплата
            hourly_rate = user.hourly_rate or Decimal('0.00')
            base_hours = Decimal(str(total_hours))
            base_amount = base_hours * hourly_rate
        
        salary.base_hours = base_hours
        salary.base_amount = base_amount
        
        # Переработки (если есть норма часов)
        # TODO: Добавить логику переработок
        
        # Штрафы
        penalties = Penalty.objects.filter(
            user=user,
            period=period_date,
            status='active'
        )
        penalties_amount = penalties.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        salary.penalties_amount = penalties_amount
        
        # Авансы
        advances = Request.objects.filter(
            user=user,
            request_type='advance',
            status='approved',
            start_date__lte=end_date
        )
        advances_amount = advances.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        salary.advances_amount = advances_amount
        
        # Итоговая сумма
        salary.total_amount = base_amount + salary.overtime_amount - penalties_amount - advances_amount
        
        salary.save()
        
        # Детализация
        SalaryCalculation.objects.create(
            salary=salary,
            calculation_type='base',
            description=f'Отработанные часы ({base_hours} ч × {user.hourly_rate or 0} руб)',
            amount=base_amount
        )
        
        if salary.overtime_amount > 0:
            SalaryCalculation.objects.create(
                salary=salary,
                calculation_type='overtime',
                description=f'Переработки ({salary.overtime_hours} ч)',
                amount=salary.overtime_amount
            )
        
        if penalties_amount > 0:
            SalaryCalculation.objects.create(
                salary=salary,
                calculation_type='penalty',
                description='Штрафы',
                amount=-penalties_amount
            )
        
        if advances_amount > 0:
            SalaryCalculation.objects.create(
                salary=salary,
                calculation_type='advance',
                description='Авансы',
                amount=-advances_amount
            )
        
        return salary

