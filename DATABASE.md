# Схема базы данных

## 📊 ER-диаграмма

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Users     │────────▶│  Departments │         │  WorkSchedules│
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │                        │                        │
      ▼                        ▼                        ▼
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ Attendance  │         │  FacePhotos  │         │  WorkLocations│
└─────────────┘         └──────────────┘         └─────────────┘
      │
      │
      ▼
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Penalties │         │   Requests   │         │   Salaries  │
└─────────────┘         └──────────────┘         └─────────────┘
```

## 📋 Таблицы

### 1. users (Пользователи)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    password_hash VARCHAR(255), -- для Web Dashboard
    role VARCHAR(20) NOT NULL DEFAULT 'employee', -- employee, manager, admin
    department_id INTEGER REFERENCES departments(id),
    position VARCHAR(100),
    salary_type VARCHAR(20) NOT NULL DEFAULT 'hourly', -- fixed, hourly
    hourly_rate DECIMAL(10,2), -- почасовая ставка
    fixed_salary DECIMAL(10,2), -- фиксированная ЗП
    work_schedule_id INTEGER REFERENCES work_schedules(id),
    is_active BOOLEAN DEFAULT true,
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_role ON users(role);
```

**Поля:**
- `telegram_id` - ID пользователя в Telegram (уникальный)
- `role` - роль: employee, manager, admin
- `salary_type` - тип оплаты: fixed (фиксированная), hourly (почасовая)
- `work_schedule_id` - график работы

### 2. departments (Отделы)

```sql
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    manager_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_departments_manager ON departments(manager_id);
```

**Отделы:**
- Продажа
- Касса
- Охрана
- Склад
- Снабжение
- Бухгалтерия
- Прочие сотрудники

### 3. work_schedules (Графики работы)

```sql
CREATE TABLE work_schedules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL, -- время начала работы
    end_time TIME NOT NULL, -- время окончания работы
    break_duration INTEGER DEFAULT 60, -- длительность перерыва в минутах
    work_days INTEGER[] NOT NULL, -- массив дней недели [1,2,3,4,5] = Пн-Пт
    late_threshold INTEGER DEFAULT 15, -- порог опоздания в минутах
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Примеры:**
- Стандартный график: 09:00-18:00, Пн-Пт
- Сменный график: 08:00-20:00, через день

### 4. work_locations (Рабочие локации)

```sql
CREATE TABLE work_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    radius INTEGER DEFAULT 100, -- радиус в метрах
    department_id INTEGER REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_locations_coords ON work_locations(latitude, longitude);
```

**Использование:**
- Проверка, что сотрудник находится в радиусе рабочего места
- Множественные локации для одного отдела

### 5. face_photos (Эталонные фото для Face ID)

```sql
CREATE TABLE face_photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL, -- путь к файлу
    encoding TEXT, -- векторное представление лица (JSON)
    is_primary BOOLEAN DEFAULT false, -- основное фото
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_face_photos_user ON face_photos(user_id);
```

**Логика:**
- Одно основное фото (`is_primary = true`)
- Возможность нескольких фото для повышения точности

### 6. attendance (Учет рабочего времени)

```sql
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    checkin_time TIMESTAMP NOT NULL,
    checkout_time TIMESTAMP,
    checkin_photo_url VARCHAR(500),
    checkout_photo_url VARCHAR(500),
    checkin_latitude DECIMAL(10,8),
    checkin_longitude DECIMAL(11,8),
    checkout_latitude DECIMAL(10,8),
    checkout_longitude DECIMAL(11,8),
    work_location_id INTEGER REFERENCES work_locations(id),
    is_late BOOLEAN DEFAULT false,
    late_minutes INTEGER DEFAULT 0,
    face_verified BOOLEAN DEFAULT false, -- верификация Face ID
    location_verified BOOLEAN DEFAULT false, -- проверка геолокации
    total_hours DECIMAL(5,2), -- отработанные часы
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(checkin_time);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, checkin_time);
```

**Логика:**
- Одна запись = один рабочий день
- `checkout_time` NULL = сотрудник еще на работе
- Автоматический расчет `total_hours` при выходе

### 7. penalties (Штрафы)

```sql
CREATE TABLE penalties (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    attendance_id INTEGER REFERENCES attendance(id),
    penalty_type VARCHAR(50) NOT NULL, -- late, absence, violation
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    period DATE NOT NULL, -- период начисления (год-месяц)
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled
    created_by INTEGER REFERENCES users(id), -- кто создал
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_penalties_user ON penalties(user_id);
CREATE INDEX idx_penalties_period ON penalties(period);
```

**Типы штрафов:**
- `late` - опоздание
- `absence` - отсутствие без уважительной причины
- `violation` - нарушение правил

### 8. requests (Заявки)

```sql
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    request_type VARCHAR(50) NOT NULL, -- vacation, sick_leave, day_off, advance
    start_date DATE NOT NULL,
    end_date DATE, -- NULL для однодневных заявок
    amount DECIMAL(10,2), -- для аванса
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    reviewed_by INTEGER REFERENCES users(id), -- кто рассмотрел
    reviewed_at TIMESTAMP,
    review_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_requests_user ON requests(user_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_dates ON requests(start_date, end_date);
```

**Типы заявок:**
- `vacation` - отпуск
- `sick_leave` - больничный
- `day_off` - выходной (отгул)
- `advance` - аванс

### 9. salaries (Заработная плата)

```sql
CREATE TABLE salaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    period DATE NOT NULL, -- период (год-месяц)
    base_hours DECIMAL(6,2) NOT NULL, -- отработанные часы
    base_amount DECIMAL(10,2) NOT NULL, -- базовая сумма
    overtime_hours DECIMAL(6,2) DEFAULT 0, -- переработки
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    penalties_amount DECIMAL(10,2) DEFAULT 0, -- сумма штрафов
    advances_amount DECIMAL(10,2) DEFAULT 0, -- сумма авансов
    total_amount DECIMAL(10,2) NOT NULL, -- итоговая сумма
    status VARCHAR(20) DEFAULT 'calculated', -- calculated, paid
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, period)
);

CREATE INDEX idx_salaries_user ON salaries(user_id);
CREATE INDEX idx_salaries_period ON salaries(period);
```

**Расчет:**
```
total_amount = base_amount + overtime_amount - penalties_amount - advances_amount
```

### 10. salary_calculations (Детализация расчета ЗП)

```sql
CREATE TABLE salary_calculations (
    id SERIAL PRIMARY KEY,
    salary_id INTEGER NOT NULL REFERENCES salaries(id) ON DELETE CASCADE,
    calculation_type VARCHAR(50) NOT NULL, -- base, overtime, penalty, advance
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_salary_calculations_salary ON salary_calculations(salary_id);
```

**Использование:**
- Детальная разбивка расчета ЗП
- Прозрачность для сотрудника

### 11. system_settings (Настройки системы)

```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Настройки:**
- `penalty_late_per_minute` - штраф за минуту опоздания
- `penalty_absence` - штраф за отсутствие
- `overtime_multiplier` - коэффициент переработки (1.5, 2.0)
- `face_verification_threshold` - порог точности Face ID

### 12. audit_log (Журнал аудита)

```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
```

**Использование:**
- Логирование всех важных действий
- Отслеживание изменений
- Безопасность

## 🔄 Триггеры и функции

### Автоматический расчет отработанных часов

```sql
CREATE OR REPLACE FUNCTION calculate_work_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.checkout_time IS NOT NULL AND NEW.checkin_time IS NOT NULL THEN
        NEW.total_hours := EXTRACT(EPOCH FROM (NEW.checkout_time - NEW.checkin_time)) / 3600;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_hours
BEFORE UPDATE ON attendance
FOR EACH ROW
WHEN (NEW.checkout_time IS NOT NULL AND OLD.checkout_time IS NULL)
EXECUTE FUNCTION calculate_work_hours();
```

### Автоматическое определение опоздания

```sql
CREATE OR REPLACE FUNCTION check_late()
RETURNS TRIGGER AS $$
DECLARE
    schedule_start TIME;
    late_threshold INTEGER;
    checkin_time_only TIME;
BEGIN
    SELECT ws.start_time, ws.late_threshold
    INTO schedule_start, late_threshold
    FROM users u
    JOIN work_schedules ws ON u.work_schedule_id = ws.id
    WHERE u.id = NEW.user_id;
    
    checkin_time_only := NEW.checkin_time::TIME;
    
    IF checkin_time_only > (schedule_start + (late_threshold || ' minutes')::INTERVAL) THEN
        NEW.is_late := true;
        NEW.late_minutes := EXTRACT(EPOCH FROM (checkin_time_only - schedule_start)) / 60;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_late
BEFORE INSERT ON attendance
FOR EACH ROW
EXECUTE FUNCTION check_late();
```

## 📊 Представления (Views)

### Текущие сотрудники на работе

```sql
CREATE VIEW active_employees AS
SELECT 
    u.id,
    u.first_name || ' ' || u.last_name AS full_name,
    d.name AS department,
    a.checkin_time,
    a.checkin_latitude,
    a.checkin_longitude,
    EXTRACT(EPOCH FROM (NOW() - a.checkin_time)) / 3600 AS hours_worked
FROM attendance a
JOIN users u ON a.user_id = u.id
JOIN departments d ON u.department_id = d.id
WHERE a.checkout_time IS NULL
AND DATE(a.checkin_time) = CURRENT_DATE;
```

### Статистика по отделам

```sql
CREATE VIEW department_stats AS
SELECT 
    d.id,
    d.name,
    COUNT(DISTINCT u.id) AS total_employees,
    COUNT(DISTINCT CASE WHEN a.checkout_time IS NULL THEN u.id END) AS active_now,
    AVG(a.total_hours) AS avg_hours_per_day
FROM departments d
LEFT JOIN users u ON d.id = u.department_id
LEFT JOIN attendance a ON u.id = a.user_id 
    AND DATE(a.checkin_time) = CURRENT_DATE
GROUP BY d.id, d.name;
```

## 🔍 Индексы для производительности

```sql
-- Составные индексы для частых запросов
CREATE INDEX idx_attendance_user_date ON attendance(user_id, DATE(checkin_time));
CREATE INDEX idx_attendance_period ON attendance(DATE_TRUNC('month', checkin_time));
CREATE INDEX idx_salaries_user_period ON salaries(user_id, period);
CREATE INDEX idx_requests_user_status ON requests(user_id, status);
```

## 🔐 Безопасность

- Все пароли хешируются (bcrypt)
- Чувствительные данные (фото, геолокация) хранятся в защищенном хранилище
- Регулярные бэкапы базы данных
- Транзакции для критических операций

