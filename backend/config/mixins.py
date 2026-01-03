"""
Mixin для автоматической фильтрации по company_id в ViewSets
"""
from rest_framework.response import Response
from rest_framework import status


class TenantFilterMixin:
    """
    Mixin для автоматической фильтрации queryset по company_id
    Использует request.company из TenantMiddleware
    """
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Если есть company в request, фильтруем по ней
        if hasattr(self.request, 'company') and self.request.company:
            # Для моделей с прямым полем company
            if hasattr(queryset.model, 'company'):
                queryset = queryset.filter(company=self.request.company)
            # Для моделей, связанных через user (Attendance, Salary, Request, etc.)
            elif hasattr(queryset.model, 'user'):
                queryset = queryset.filter(user__company=self.request.company)
            # Для моделей, связанных через department (WorkLocation)
            elif hasattr(queryset.model, 'department'):
                queryset = queryset.filter(department__company=self.request.company)
        
        return queryset
    
    def perform_create(self, serializer):
        # Автоматически устанавливаем company при создании
        if hasattr(self.request, 'company') and self.request.company:
            if hasattr(serializer.Meta.model, 'company'):
                serializer.save(company=self.request.company)
            elif hasattr(serializer.Meta.model, 'user'):
                # Для моделей с user, company берется из user
                user = self.request.user
                if not user.company:
                    user.company = self.request.company
                    user.save()
                serializer.save(user=user)
            else:
                serializer.save()
        else:
            # Если company не определена, пытаемся взять из user
            if hasattr(self.request, 'user') and self.request.user.is_authenticated:
                if hasattr(self.request.user, 'company') and self.request.user.company:
                    if hasattr(serializer.Meta.model, 'company'):
                        serializer.save(company=self.request.user.company)
                    elif hasattr(serializer.Meta.model, 'user'):
                        serializer.save(user=self.request.user)
                    else:
                        serializer.save()
                else:
                    serializer.save()
            else:
                serializer.save()

