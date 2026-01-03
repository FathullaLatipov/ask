# Мультиязычность (i18n) - Настройка и использование

## Backend (Django + django-modeltranslation)

### Установка
```bash
cd backend
pip install django-modeltranslation==0.18.12
```

### Настройка

1. **settings.py** - уже настроено:
   - `modeltranslation` добавлен в `INSTALLED_APPS`
   - `LocaleMiddleware` добавлен в `MIDDLEWARE`
   - Языки: `ru`, `en`, `uz`
   - `MODELTRANSLATION_LANGUAGES = ('ru', 'en', 'uz')`

2. **Файлы переводов для моделей**:
   - `apps/users/translation.py` - переводы для Company
   - `apps/departments/translation.py` - переводы для Department, WorkSchedule
   - `apps/geolocation/translation.py` - переводы для WorkLocation

### Миграции

После установки и настройки выполните:
```bash
python manage.py makemigrations
python manage.py migrate
```

Это создаст дополнительные поля для переводов (name_ru, name_en, name_uz и т.д.)

### Использование в коде

Django автоматически вернет переведенные поля в зависимости от языка запроса:
- Заголовок `Accept-Language: ru` вернет `name_ru`
- Заголовок `Accept-Language: en` вернет `name_en`
- И т.д.

## Frontend (React + react-i18next)

### Установка
```bash
cd frontend
npm install i18next react-i18next i18next-browser-languagedetector
```

### Структура

```
frontend/src/i18n/
  ├── config.js          # Конфигурация i18next
  └── locales/
      ├── ru.json        # Русские переводы
      ├── en.json        # Английские переводы
      └── uz.json        # Узбекские переводы
```

### Использование в компонентах

```javascript
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('nav.dashboard')}</h1>
      <button>{t('common.save')}</button>
    </div>
  )
}
```

### Переключатель языка

Компонент `LanguageSwitcher` уже интегрирован в `Layout` и доступен в хедере.

Язык сохраняется в `localStorage` и автоматически определяется при загрузке.

### Добавление новых переводов

1. Добавьте ключи в `frontend/src/i18n/locales/ru.json`
2. Добавьте те же ключи в `en.json` и `uz.json`
3. Используйте `t('your.key')` в компонентах

## Поддерживаемые языки

- **ru** - Русский (по умолчанию)
- **en** - English
- **uz** - O'zbek

## Примечания

- Backend возвращает переведенные поля автоматически через django-modeltranslation
- Frontend использует react-i18next для перевода интерфейса
- Язык пользователя сохраняется в localStorage
- Язык можно изменить через переключатель в хедере

