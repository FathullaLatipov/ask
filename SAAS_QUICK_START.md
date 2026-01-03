# Быстрый старт SaaS функциональности

## Что было сделано

Проект преобразован в SaaS-платформу с мультитенантностью. Теперь несколько компаний могут использовать одну систему, при этом их данные полностью изолированы.

## Шаги для запуска

### 1. Создать и применить миграции

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### 2. Мигрировать существующие данные

```bash
python manage.py migrate_to_saas
```

Этот скрипт:
- Создаст дефолтную компанию "Default Company"
- Назначит всем существующим пользователям, отделам и графикам эту компанию

### 3. Создать компании

#### Через Django Admin:
1. Зайдите в `/admin/`
2. Перейдите в "Companies"
3. Создайте новую компанию:
   - **Name**: Название компании (например, "ООО Пример")
   - **Domain**: Поддомен (например, "example") - опционально
   - **Is Active**: ✓

#### Через Python shell:
```python
from apps.users.models import Company

company = Company.objects.create(
    name='ООО Пример',
    domain='example',
    is_active=True
)
```

### 4. Назначить пользователей компаниям

#### Через Django Admin:
1. Зайдите в "Users"
2. Выберите пользователя
3. В поле "Company" выберите нужную компанию
4. Сохраните

#### Через Python shell:
```python
from apps.users.models import User, Company

company = Company.objects.get(domain='example')
user = User.objects.get(email='user@example.com')
user.company = company
user.save()
```

## Как это работает

### Автоматическая изоляция данных

Все ViewSets автоматически фильтруют данные по `company_id`:
- Пользователи одной компании не видят данные другой
- При создании объектов `company` устанавливается автоматически

### Определение компании

Система определяет компанию в следующем порядке:

1. **Заголовок `X-Company-ID`** (для API):
   ```bash
   curl -H "X-Company-ID: 1" -H "Authorization: Token <token>" http://localhost:8000/api/users/
   ```

2. **Поддомен** (если настроен):
   - `company1.yourdomain.com` → ищет компанию с `domain='company1'`

3. **Из токена пользователя**:
   - Автоматически берется `user.company` из аутентифицированного пользователя

### Примеры использования

#### Создание пользователя с компанией:
```python
from apps.users.models import User, Company

company = Company.objects.get(id=1)
user = User.objects.create_user(
    email='newuser@example.com',
    password='password123',
    first_name='Иван',
    last_name='Иванов',
    company=company,
    role='employee'
)
```

#### API запрос с указанием компании:
```bash
# Указываем компанию через заголовок
curl -H "X-Company-ID: 1" \
     -H "Authorization: Token <token>" \
     http://localhost:8000/api/users/
```

#### Frontend интеграция:
```javascript
// В frontend/src/api/client.js можно добавить:
export const createApiClient = (token, companyId = null) => {
  const headers = token ? { Authorization: `Token ${token}` } : {}
  
  // Добавляем company_id если есть
  const savedCompanyId = localStorage.getItem('company_id')
  if (companyId || savedCompanyId) {
    headers['X-Company-ID'] = companyId || savedCompanyId
  }
  
  // ... остальной код
}
```

## Важные замечания

1. **Email уникальность**: Теперь `email` уникален в рамках компании, а не глобально. Один email может быть в разных компаниях.

2. **Telegram ID**: Также уникален в рамках компании.

3. **Суперпользователи**: Пользователи с `is_superuser=True` могут видеть все компании. Для продакшена рекомендуется создать отдельную логику.

4. **Миграция данных**: После применения миграций все существующие данные будут назначены дефолтной компании. Вы можете потом перераспределить их.

## Проверка работы

1. Создайте две компании
2. Создайте пользователей в разных компаниях
3. Войдите под пользователем одной компании
4. Убедитесь, что видны только данные его компании

## Дополнительная информация

Подробная документация: `SAAS_IMPLEMENTATION.md`

