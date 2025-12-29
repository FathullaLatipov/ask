# REST API Спецификация

## 🔐 Аутентификация

Все запросы (кроме публичных эндпоинтов) требуют JWT токен в заголовке:

```
Authorization: Bearer <token>
```

### Получение токена

**POST** `/api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "employee",
    "first_name": "Иван",
    "last_name": "Иванов"
  }
}
```

### Регистрация через Telegram

**POST** `/api/auth/telegram`

```json
{
  "telegram_id": 123456789,
  "first_name": "Иван",
  "last_name": "Иванов",
  "username": "ivanov"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

---

## 👤 Пользователи

### Получить текущего пользователя

**GET** `/api/users/me`

**Response:**
```json
{
  "id": 1,
  "telegram_id": 123456789,
  "email": "user@example.com",
  "first_name": "Иван",
  "last_name": "Иванов",
  "role": "employee",
  "department": {
    "id": 1,
    "name": "Продажа"
  },
  "position": "Менеджер",
  "salary_type": "hourly",
  "hourly_rate": 500.00
}
```

### Получить список пользователей (Manager/Admin)

**GET** `/api/users`

**Query Parameters:**
- `department_id` - фильтр по отделу
- `role` - фильтр по роли
- `is_active` - фильтр по активности
- `page` - номер страницы
- `limit` - количество на странице

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "first_name": "Иван",
      "last_name": "Иванов",
      "email": "user@example.com",
      "department": { "id": 1, "name": "Продажа" },
      "role": "employee",
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Создать пользователя (Admin)

**POST** `/api/users`

```json
{
  "telegram_id": 123456789,
  "email": "newuser@example.com",
  "first_name": "Петр",
  "last_name": "Петров",
  "department_id": 1,
  "position": "Менеджер",
  "role": "employee",
  "salary_type": "hourly",
  "hourly_rate": 500.00,
  "work_schedule_id": 1
}
```

### Обновить пользователя (Admin)

**PUT** `/api/users/:id`

```json
{
  "department_id": 2,
  "position": "Старший менеджер",
  "hourly_rate": 600.00
}
```

### Удалить пользователя (Admin)

**DELETE** `/api/users/:id`

---

## ⏰ Учет рабочего времени (Attendance)

### Отметка прихода

**POST** `/api/attendance/checkin`

```json
{
  "photo_url": "https://storage.example.com/photos/checkin_123.jpg",
  "latitude": 55.7558,
  "longitude": 37.6173,
  "face_verified": true,
  "location_verified": true
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "checkin_time": "2024-01-15T09:05:00Z",
  "is_late": true,
  "late_minutes": 5,
  "work_location": {
    "id": 1,
    "name": "Офис на Тверской"
  }
}
```

### Отметка ухода

**POST** `/api/attendance/checkout`

```json
{
  "photo_url": "https://storage.example.com/photos/checkout_123.jpg",
  "latitude": 55.7558,
  "longitude": 37.6173,
  "face_verified": true
}
```

**Response:**
```json
{
  "id": 1,
  "checkout_time": "2024-01-15T18:30:00Z",
  "total_hours": 9.42
}
```

### Получить текущий статус

**GET** `/api/attendance/current`

**Response:**
```json
{
  "is_checked_in": true,
  "checkin_time": "2024-01-15T09:05:00Z",
  "hours_worked": 4.5,
  "attendance_id": 1
}
```

### Получить историю посещений

**GET** `/api/attendance/history`

**Query Parameters:**
- `user_id` - ID пользователя (Manager/Admin)
- `start_date` - начальная дата (YYYY-MM-DD)
- `end_date` - конечная дата (YYYY-MM-DD)
- `page` - номер страницы
- `limit` - количество на странице

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "checkin_time": "2024-01-15T09:05:00Z",
      "checkout_time": "2024-01-15T18:30:00Z",
      "total_hours": 9.42,
      "is_late": true,
      "late_minutes": 5,
      "work_location": { "id": 1, "name": "Офис на Тверской" }
    }
  ],
  "pagination": { ... }
}
```

### Получить активных сотрудников (Manager/Admin)

**GET** `/api/attendance/active`

**Query Parameters:**
- `department_id` - фильтр по отделу

**Response:**
```json
{
  "data": [
    {
      "user_id": 1,
      "full_name": "Иван Иванов",
      "department": "Продажа",
      "checkin_time": "2024-01-15T09:00:00Z",
      "hours_worked": 4.5,
      "location": {
        "latitude": 55.7558,
        "longitude": 37.6173
      }
    }
  ]
}
```

---

## 📸 Face ID

### Верификация фото

**POST** `/api/face-id/verify`

```json
{
  "user_id": 1,
  "photo_url": "https://storage.example.com/photos/temp_123.jpg",
  "check_type": "checkin" // или "checkout"
}
```

**Response:**
```json
{
  "verified": true,
  "confidence": 0.95,
  "message": "Лицо успешно верифицировано"
}
```

### Регистрация эталонного фото

**POST** `/api/face-id/register`

```json
{
  "user_id": 1,
  "photo_url": "https://storage.example.com/photos/reference_123.jpg",
  "is_primary": true
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "photo_url": "https://storage.example.com/photos/reference_123.jpg",
  "is_primary": true,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

## 📍 Геолокация

### Проверка геолокации

**POST** `/api/geolocation/verify`

```json
{
  "user_id": 1,
  "latitude": 55.7558,
  "longitude": 37.6173
}
```

**Response:**
```json
{
  "verified": true,
  "work_location": {
    "id": 1,
    "name": "Офис на Тверской",
    "distance": 45 // расстояние в метрах
  },
  "message": "Сотрудник находится на рабочем месте"
}
```

### Получить рабочие локации

**GET** `/api/geolocation/locations`

**Query Parameters:**
- `department_id` - фильтр по отделу

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Офис на Тверской",
      "address": "Тверская ул., 1",
      "latitude": 55.7558,
      "longitude": 37.6173,
      "radius": 100,
      "department": { "id": 1, "name": "Продажа" }
    }
  ]
}
```

### Создать рабочую локацию (Admin)

**POST** `/api/geolocation/locations`

```json
{
  "name": "Офис на Тверской",
  "address": "Тверская ул., 1",
  "latitude": 55.7558,
  "longitude": 37.6173,
  "radius": 100,
  "department_id": 1
}
```

---

## 💰 Заработная плата

### Рассчитать ЗП за период

**POST** `/api/salary/calculate`

```json
{
  "user_id": 1,
  "period": "2024-01" // YYYY-MM
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "period": "2024-01",
  "base_hours": 160.0,
  "base_amount": 80000.00,
  "overtime_hours": 10.0,
  "overtime_amount": 7500.00,
  "penalties_amount": 500.00,
  "advances_amount": 20000.00,
  "total_amount": 65500.00,
  "breakdown": [
    {
      "type": "base",
      "description": "Отработанные часы (160 ч × 500 руб)",
      "amount": 80000.00
    },
    {
      "type": "overtime",
      "description": "Переработки (10 ч × 750 руб)",
      "amount": 7500.00
    },
    {
      "type": "penalty",
      "description": "Штрафы за опоздания",
      "amount": -500.00
    },
    {
      "type": "advance",
      "description": "Авансы",
      "amount": -20000.00
    }
  ]
}
```

### Получить ЗП за период

**GET** `/api/salary/:period`

**Query Parameters:**
- `user_id` - ID пользователя (для Manager/Admin)

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "period": "2024-01",
  "total_amount": 65500.00,
  "status": "calculated",
  "breakdown": [ ... ]
}
```

### Получить историю ЗП

**GET** `/api/salary/history`

**Query Parameters:**
- `user_id` - ID пользователя
- `start_period` - начальный период (YYYY-MM)
- `end_period` - конечный период (YYYY-MM)

**Response:**
```json
{
  "data": [
    {
      "period": "2024-01",
      "total_amount": 65500.00,
      "status": "paid",
      "paid_at": "2024-02-05T10:00:00Z"
    }
  ]
}
```

---

## 📝 Заявки (Requests)

### Создать заявку

**POST** `/api/requests`

```json
{
  "request_type": "vacation", // vacation, sick_leave, day_off, advance
  "start_date": "2024-02-01",
  "end_date": "2024-02-14", // NULL для day_off и advance
  "amount": 10000.00, // только для advance
  "reason": "Планируемый отпуск"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "request_type": "vacation",
  "start_date": "2024-02-01",
  "end_date": "2024-02-14",
  "status": "pending",
  "created_at": "2024-01-15T10:00:00Z"
}
```

### Получить заявки

**GET** `/api/requests`

**Query Parameters:**
- `user_id` - ID пользователя (для Manager/Admin)
- `status` - фильтр по статусу (pending, approved, rejected)
- `request_type` - фильтр по типу
- `start_date` - начальная дата
- `end_date` - конечная дата

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "user_name": "Иван Иванов",
      "request_type": "vacation",
      "start_date": "2024-02-01",
      "end_date": "2024-02-14",
      "status": "pending",
      "reason": "Планируемый отпуск",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Утвердить заявку (Manager/Admin)

**PUT** `/api/requests/:id/approve`

```json
{
  "comment": "Утверждено"
}
```

### Отклонить заявку (Manager/Admin)

**PUT** `/api/requests/:id/reject`

```json
{
  "comment": "Недостаточно дней отпуска"
}
```

---

## 🏢 Отделы (Departments)

### Получить список отделов

**GET** `/api/departments`

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Продажа",
      "description": "Отдел продаж",
      "manager": {
        "id": 5,
        "full_name": "Петр Петров"
      },
      "employee_count": 15
    }
  ]
}
```

### Создать отдел (Admin)

**POST** `/api/departments`

```json
{
  "name": "Новый отдел",
  "description": "Описание отдела",
  "manager_id": 5
}
```

---

## ⚙️ Графики работы (Work Schedules)

### Получить графики работы

**GET** `/api/work-schedules`

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Стандартный график",
      "start_time": "09:00",
      "end_time": "18:00",
      "break_duration": 60,
      "work_days": [1, 2, 3, 4, 5],
      "late_threshold": 15
    }
  ]
}
```

### Создать график работы (Admin)

**POST** `/api/work-schedules`

```json
{
  "name": "Сменный график",
  "start_time": "08:00",
  "end_time": "20:00",
  "break_duration": 60,
  "work_days": [1, 2, 3, 4, 5, 6],
  "late_threshold": 15
}
```

---

## 💸 Штрафы (Penalties)

### Получить штрафы

**GET** `/api/penalties`

**Query Parameters:**
- `user_id` - ID пользователя
- `period` - период (YYYY-MM)
- `status` - фильтр по статусу

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "penalty_type": "late",
      "amount": 500.00,
      "description": "Опоздание на 15 минут",
      "period": "2024-01",
      "status": "active",
      "created_at": "2024-01-15T09:20:00Z"
    }
  ]
}
```

### Создать штраф (Admin)

**POST** `/api/penalties`

```json
{
  "user_id": 1,
  "penalty_type": "late",
  "amount": 500.00,
  "description": "Опоздание на 15 минут",
  "period": "2024-01"
}
```

---

## 📊 Отчеты (Reports)

### Дашборд статистики (Manager/Admin)

**GET** `/api/reports/dashboard`

**Query Parameters:**
- `date` - дата (YYYY-MM-DD), по умолчанию сегодня

**Response:**
```json
{
  "date": "2024-01-15",
  "total_employees": 100,
  "checked_in": 85,
  "checked_out": 10,
  "on_break": 5,
  "late_count": 12,
  "absent_count": 3,
  "departments": [
    {
      "id": 1,
      "name": "Продажа",
      "total": 20,
      "active": 18,
      "late": 2
    }
  ]
}
```

### Отчет по посещаемости

**GET** `/api/reports/attendance`

**Query Parameters:**
- `start_date` - начальная дата
- `end_date` - конечная дата
- `department_id` - фильтр по отделу
- `user_id` - фильтр по пользователю

**Response:**
```json
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "summary": {
    "total_days": 22,
    "average_hours_per_day": 8.5,
    "total_late_count": 45,
    "total_absent_count": 5
  },
  "by_user": [
    {
      "user_id": 1,
      "user_name": "Иван Иванов",
      "days_worked": 22,
      "total_hours": 187.0,
      "late_count": 2,
      "absent_count": 0
    }
  ]
}
```

---

## 🔔 WebSocket Events

### Подключение

```javascript
const socket = io('wss://api.example.com', {
  auth: {
    token: 'jwt_token_here'
  }
});
```

### События от сервера

**employee:checkin**
```json
{
  "user_id": 1,
  "user_name": "Иван Иванов",
  "department": "Продажа",
  "checkin_time": "2024-01-15T09:05:00Z",
  "is_late": true
}
```

**employee:checkout**
```json
{
  "user_id": 1,
  "user_name": "Иван Иванов",
  "checkout_time": "2024-01-15T18:30:00Z",
  "total_hours": 9.42
}
```

**request:created**
```json
{
  "request_id": 1,
  "user_id": 1,
  "user_name": "Иван Иванов",
  "request_type": "vacation",
  "start_date": "2024-02-01"
}
```

**request:approved**
```json
{
  "request_id": 1,
  "user_id": 1,
  "reviewed_by": 5
}
```

---

## ❌ Обработка ошибок

Все ошибки возвращаются в формате:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Описание ошибки",
    "details": {}
  }
}
```

### Коды ошибок

- `UNAUTHORIZED` - не авторизован
- `FORBIDDEN` - нет доступа
- `NOT_FOUND` - ресурс не найден
- `VALIDATION_ERROR` - ошибка валидации
- `FACE_VERIFICATION_FAILED` - Face ID не прошел
- `LOCATION_VERIFICATION_FAILED` - геолокация не прошла
- `ALREADY_CHECKED_IN` - уже отмечен приход
- `NOT_CHECKED_IN` - не отмечен приход

### Примеры

**401 Unauthorized**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Требуется авторизация"
  }
}
```

**400 Validation Error**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Ошибка валидации",
    "details": {
      "latitude": "Поле обязательно для заполнения",
      "longitude": "Должно быть числом"
    }
  }
}
```

