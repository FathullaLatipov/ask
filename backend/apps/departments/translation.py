from modeltranslation.translator import register, TranslationOptions
from .models import Department, WorkSchedule


@register(Department)
class DepartmentTranslationOptions(TranslationOptions):
    fields = ('name', 'description')


@register(WorkSchedule)
class WorkScheduleTranslationOptions(TranslationOptions):
    fields = ('name',)

