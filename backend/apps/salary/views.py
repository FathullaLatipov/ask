from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q
from datetime import datetime, timedelta
from decimal import Decimal
from config.mixins import TenantFilterMixin
from .models import Salary, SalaryCalculation
from .serializers import SalarySerializer, SalaryCalculateSerializer
from apps.attendance.models import Attendance
from apps.requests.models import Request, Penalty


class SalaryListCreateView(TenantFilterMixin, generics.ListCreateAPIView):
    """Список и создание зарплат"""
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
        
        # Фильтр по периоду (YYYY-MM)
        period = self.request.query_params.get('period')
        if period:
            try:
                period_date = datetime.strptime(period, '%Y-%m').date()
                queryset = queryset.filter(period=period_date)
            except ValueError:
                pass  # Игнорируем неверный формат
        
        return queryset.select_related('user', 'user__department')


class SalaryRetrieveUpdateDestroyView(TenantFilterMixin, generics.RetrieveUpdateDestroyAPIView):
    """Детали, обновление и удаление зарплаты"""
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
        
        return queryset.select_related('user', 'user__department')


class SalaryCalculateView(APIView):
    """Рассчитать ЗП за период"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SalaryCalculateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        period_str = serializer.validated_data['period']  # YYYY-MM
        user_id = request.data.get('user_id')
        
        # Преобразуем user_id в int если он указан, иначе None
        if user_id:
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                user_id = None
        
        # Проверяем права доступа
        if request.user.role == 'employee':
            # Сотрудники могут рассчитывать только для себя
            user_id = request.user.id
        elif request.user.role == 'manager' and user_id and user_id != request.user.id:
            # Менеджеры могут рассчитывать только для своего отдела
            from apps.users.models import User
            try:
                target_user = User.objects.get(id=user_id)
                if target_user.department != request.user.department:
                    return Response({
                        'error': {
                            'code': 'FORBIDDEN',
                            'message': 'Недостаточно прав доступа'
                        }
                    }, status=status.HTTP_403_FORBIDDEN)
            except User.DoesNotExist:
                return Response({
                    'error': {
                        'code': 'NOT_FOUND',
                        'message': 'Пользователь не найден'
                    }
                }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Создаем дату первого числа месяца
            period_date = datetime.strptime(period_str, '%Y-%m').date()
            period_date = period_date.replace(day=1)
        except ValueError:
            return Response({
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Неверный формат периода. Используйте YYYY-MM'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        from apps.users.models import User
        
        # Определяем список пользователей для расчета
        if user_id:
            # Рассчитываем для одного пользователя
            try:
                users_to_calculate = [User.objects.get(id=user_id)]
            except User.DoesNotExist:
                return Response({
                    'error': {
                        'code': 'NOT_FOUND',
                        'message': 'Пользователь не найден'
                    }
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            # Рассчитываем для всех пользователей (в зависимости от роли)
            if request.user.role == 'employee':
                users_to_calculate = [request.user]
            elif request.user.role == 'manager' and request.user.department:
                users_to_calculate = User.objects.filter(department=request.user.department, is_active=True)
            else:  # admin
                users_to_calculate = User.objects.filter(is_active=True)
        
        # Рассчитываем ЗП для каждого пользователя
        results = []
        any_created = False
        for user in users_to_calculate:
            # Проверяем, не рассчитана ли уже ЗП
            salary, created = Salary.objects.get_or_create(
                user=user,
                period=period_date,
                defaults={'status': 'calculated', 'base_hours': Decimal('0.00'), 'base_amount': Decimal('0.00'), 'total_amount': Decimal('0.00')}
            )
            
            if created:
                any_created = True
            
            if not created:
                # Пересчитываем
                salary.calculations.all().delete()
            
            # Рассчитываем ЗП
            self._calculate_salary(user.id, period_date, salary)
            results.append(salary)
        
        # Возвращаем список результатов или один результат
        if len(results) == 1:
            return Response(SalarySerializer(results[0]).data, status=status.HTTP_201_CREATED if any_created else status.HTTP_200_OK)
        else:
            return Response(SalarySerializer(results, many=True).data, status=status.HTTP_201_CREATED)

    def _calculate_salary(self, user_id, period_date, salary):
        """Логика расчета ЗП"""
        from apps.users.models import User
        
        user = User.objects.get(id=user_id)
        
        # Начало и конец периода (period_date всегда первое число месяца)
        start_date = period_date
        if period_date.month == 12:
            end_date = period_date.replace(year=period_date.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_date = period_date.replace(month=period_date.month + 1, day=1) - timedelta(days=1)
        
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
