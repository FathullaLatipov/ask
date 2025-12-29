# Django REST API Backend

Backend для системы учета сотрудников на Django REST Framework.

## 🚀 Быстрый старт

### Установка зависимостей

```bash
pip install -r requirements.txt
```

### Настройка переменных окружения

Создайте файл `.env` в корне backend:

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=employee_management
REDIS_HOST=localhost
REDIS_PORT=6379
FACE_ID_SERVICE_URL=http://localhost:8000
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
CORS_ORIGINS=http://localhost:3002
```

### Миграции базы данных

```bash
python manage.py makemigrations
python manage.py migrate
```

### Создание суперпользователя

```bash
python manage.py createsuperuser
```

### Запуск сервера разработки

```bash
python manage.py runserver
```

Сервер будет доступен по адресу: http://localhost:8000

## 📁 Структура проекта

```
backend/
├── config/              # Настройки Django
│   ├── settings.py     # Основные настройки
│   ├── urls.py         # URL маршруты
│   ├── wsgi.py         # WSGI конфигурация
│   └── asgi.py         # ASGI конфигурация (для WebSocket)
├── apps/               # Django приложения
│   ├── users/          # Пользователи
│   ├── attendance/     # Учет рабочего времени
│   ├── departments/    # Отделы и графики работы
│   ├── salary/         # Заработная плата
│   ├── requests/       # Заявки и штрафы
│   ├── face_id/        # Face ID
│   └── geolocation/    # Геолокация
├── manage.py           # Django management script
└── requirements.txt    # Зависимости Python
```

## 🔌 API Endpoints

### Аутентификация
- `POST /api/auth/login/` - Вход через email/password
- `POST /api/auth/telegram/` - Авторизация через Telegram

### Пользователи
- `GET /api/users/me/` - Текущий пользователь
- `GET /api/users/` - Список пользователей
- `POST /api/users/` - Создать пользователя (Admin)
- `PUT /api/users/{id}/` - Обновить пользователя (Admin)

### Учет рабочего времени
- `POST /api/attendance/checkin/` - Отметка прихода
- `POST /api/attendance/checkout/` - Отметка ухода
- `GET /api/attendance/current/` - Текущий статус
- `GET /api/attendance/history/` - История посещений
- `GET /api/attendance/active/` - Активные сотрудники (Manager/Admin)

### Face ID
- `POST /api/face-id/verify/` - Верификация фото
- `POST /api/face-id/register/` - Регистрация эталонного фото

### Геолокация
- `POST /api/geolocation/verify/` - Проверка геолокации
- `GET /api/geolocation/locations/` - Список рабочих локаций

### Заработная плата
- `POST /api/salary/calculate/` - Рассчитать ЗП за период
- `GET /api/salary/` - Список ЗП

### Заявки
- `GET /api/requests/` - Список заявок
- `POST /api/requests/` - Создать заявку
- `POST /api/requests/{id}/approve/` - Утвердить заявку (Manager/Admin)
- `POST /api/requests/{id}/reject/` - Отклонить заявку (Manager/Admin)

### Отделы
- `GET /api/departments/` - Список отделов
- `POST /api/departments/` - Создать отдел (Admin)

## 🔐 Аутентификация

API использует Token Authentication. После успешного входа вы получите токен:

```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user": { ... }
}
```

Используйте токен в заголовке запросов:

```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

## 📊 Админ-панель

Django Admin доступен по адресу: http://localhost:8000/admin/

Войдите с учетными данными суперпользователя.

## 🧪 Тестирование

```bash
python manage.py test
```

## 📝 Документация API

Swagger документация доступна по адресу: http://localhost:8000/swagger/

ReDoc документация: http://localhost:8000/redoc/

## 🔄 WebSocket

WebSocket сервер настроен через Django Channels для real-time обновлений.

Подключение: `ws://localhost:8000/ws/dashboard/`

## 🐳 Docker

```bash
docker-compose up backend
```

Или для разработки:

```bash
docker-compose up -d postgres redis
python manage.py runserver
```

