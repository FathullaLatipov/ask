# Руководство по использованию SaaS (Multi-Tenant) функциональности

## Обзор

Проект был преобразован в SaaS-платформу с поддержкой мультитенантности. Это означает, что несколько компаний могут использовать одну и ту же систему, при этом их данные полностью изолированы друг от друга.

## Архитектура

### Модель Company

Добавлена модель `Company` в `backend/apps/users/models.py`, которая представляет клиента (tenant):

```python
class Company(models.Model):
    name = models.CharField(max_length=200)  # Название компании
    domain = models.CharField(max_length=100, unique=True, null=True, blank=True)  # Поддомен
    is_active = models.BooleanField(default=True)  # Активна ли компания
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Изменения в моделях

Все модели теперь связаны с `Company`:

- **User**: `company = ForeignKey(Company)` - каждый пользователь принадлежит компании
- **Department**: `company = ForeignKey(Company)` - каждый отдел принадлежит компании
- **WorkSchedule**: `company = ForeignKey(Company)` - каждый график работы принадлежит компании
- **Request, Salary, Attendance, Penalty**: изолированы через `user.company`
- **WorkLocation**: изолированы через `department.company`

### Middleware для определения компании

`TenantMiddleware` (`backend/config/middleware.py`) определяет текущую компанию из следующих источников (в порядке приоритета):

1. **Заголовок HTTP `X-Company-ID`** - для API запросов
2. **Поддомен** (например, `company1.example.com` -> ищет компанию с `domain='company1'`)
3. **Company пользователя** - из токена аутентификации

### TenantFilterMixin

Все ViewSets используют `TenantFilterMixin` (`backend/config/mixins.py`), который автоматически:
- Фильтрует queryset по `company_id`
- Устанавливает `company` при создании новых объектов

## Использование

### 1. Создание компании

#### Через Django Admin:
```python
# В админ-панели Django
Company.objects.create(
    name='ООО "Пример"',
    domain='example',
    is_active=True
)
```

#### Через API (если добавить CompanyViewSet):
```bash
POST /api/companies/
{
    "name": "ООО Пример",
    "domain": "example",
    "is_active": true
}
```

### 2. Создание пользователя с компанией

#### Через Django Admin:
```python
company = Company.objects.get(domain='example')
User.objects.create_user(
    email='user@example.com',
    password='password123',
    first_name='Иван',
    last_name='Иванов',
    company=company,
    role='admin'
)
```

#### Через API:
```bash
POST /api/users/
Headers:
    Authorization: Token <admin_token>
    X-Company-ID: 1  # ID компании

Body:
{
    "email": "user@example.com",
    "password": "password123",
    "first_name": "Иван",
    "last_name": "Иванов",
    "company": 1,
    "role": "admin"
}
```

### 3. Использование через поддомены

Если настроить DNS и веб-сервер (nginx/apache):

```
company1.yourdomain.com -> автоматически определит компанию с domain='company1'
company2.yourdomain.com -> автоматически определит компанию с domain='company2'
```

### 4. Использование через заголовок X-Company-ID

Для API запросов можно явно указать компанию:

```bash
GET /api/users/
Headers:
    Authorization: Token <user_token>
    X-Company-ID: 1
```

### 5. Автоматическое определение через токен

Если пользователь аутентифицирован, его компания определяется автоматически из `user.company`. Это самый простой способ - просто используйте токен пользователя:

```bash
GET /api/users/
Headers:
    Authorization: Token <user_token>
# Компания определяется автоматически из user.company
```

## Миграции

После внесения изменений необходимо создать и применить миграции:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

**ВАЖНО**: При применении миграций существующие данные могут потребовать ручной обработки:
- Существующие пользователи не будут иметь `company` (null=True)
- Нужно будет создать компанию и назначить её пользователям

### Скрипт для миграции существующих данных:

```python
# backend/migrate_to_saas.py
from apps.users.models import Company, User

# Создаем дефолтную компанию
default_company, created = Company.objects.get_or_create(
    name='Default Company',
    defaults={'domain': 'default', 'is_active': True}
)

# Назначаем всем пользователям без компании дефолтную компанию
User.objects.filter(company__isnull=True).update(company=default_company)
```

## Безопасность

### Важные моменты:

1. **Все ViewSets автоматически фильтруют по company** - пользователи одной компании не видят данные другой
2. **При создании объектов company устанавливается автоматически** - нельзя создать объект без компании
3. **Email и telegram_id уникальны в рамках компании** - один email может быть в разных компаниях

### Ограничения:

- Суперпользователи (is_superuser=True) могут видеть все компании (если не переопределить логику)
- Рекомендуется создать отдельную роль "Super Admin" для управления всеми компаниями

## Frontend интеграция

### Отправка X-Company-ID заголовка:

```javascript
// frontend/src/api/client.js
export const createApiClient = (token, companyId = null) => {
  const headers = token
    ? { Authorization: `Token ${token}` }
    : {}
  
  if (companyId) {
    headers['X-Company-ID'] = companyId
  }
  
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers
  })
  // ...
}
```

### Сохранение company_id в localStorage:

```javascript
// После логина
const response = await api.post('/api/auth/login/', { email, password })
setToken(response.data.token)
if (response.data.user.company) {
  localStorage.setItem('company_id', response.data.user.company)
}
```

## Тестирование

### Создание тестовых данных:

```python
# Создаем две компании
company1 = Company.objects.create(name='Компания 1', domain='company1')
company2 = Company.objects.create(name='Компания 2', domain='company2')

# Создаем пользователей для каждой компании
user1 = User.objects.create_user(
    email='user1@company1.com',
    company=company1,
    first_name='User', last_name='One'
)
user2 = User.objects.create_user(
    email='user2@company2.com',
    company=company2,
    first_name='User', last_name='Two'
)

# user1 не увидит данные user2 и наоборот
```

## Дополнительные улучшения (опционально)

1. **CompanyViewSet** - API для управления компаниями
2. **Billing/Subscription** - система подписок и оплаты
3. **Company Settings** - настройки для каждой компании
4. **Data Export/Import** - экспорт/импорт данных компании
5. **Company Admin Panel** - отдельная админка для каждой компании

## Поддержка

При возникновении проблем:
1. Проверьте, что middleware добавлен в `MIDDLEWARE` в `settings.py`
2. Убедитесь, что все ViewSets используют `TenantFilterMixin`
3. Проверьте, что миграции применены
4. Убедитесь, что пользователи имеют `company`

