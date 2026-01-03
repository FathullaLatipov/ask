from modeltranslation.translator import register, TranslationOptions
from .models import WorkLocation


@register(WorkLocation)
class WorkLocationTranslationOptions(TranslationOptions):
    fields = ('name', 'address')

