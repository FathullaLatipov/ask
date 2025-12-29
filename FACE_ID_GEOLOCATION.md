# Логика Face ID и Геолокации

## 📸 Face ID (Распознавание лиц)

### Общая концепция

Face ID используется для верификации личности сотрудника при отметке прихода и ухода. Это предотвращает мошенничество и обеспечивает точность учета рабочего времени.

### Технологический стек

- **Python 3.9+**
- **FastAPI** - веб-фреймворк
- **face_recognition** - библиотека для распознавания лиц (основана на dlib)
- **OpenCV** - обработка изображений
- **NumPy** - математические операции
- **Pillow** - работа с изображениями

### Архитектура Face ID сервиса

```
┌─────────────┐
│  REST API   │
│   (Backend) │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────┐
│ Face ID     │
│  Service    │
│ (FastAPI)   │
└──────┬──────┘
       │
   ┌───┴───┐
   ▼       ▼
┌──────┐ ┌──────────┐
│  DB  │ │  Storage │
│      │ │  (S3)    │
└──────┘ └──────────┘
```

### Процесс регистрации эталонного фото

1. **Загрузка фото**
   - Сотрудник загружает фото через Telegram Bot или Web Dashboard
   - Фото сохраняется в хранилище (S3, локальное хранилище)
   - Получаем URL фото

2. **Обработка фото**
   ```python
   def process_photo(photo_url):
       # Загрузка изображения
       image = face_recognition.load_image_file(photo_url)
       
       # Поиск лиц на фото
       face_locations = face_recognition.face_locations(image)
       
       if len(face_locations) == 0:
           raise ValueError("Лицо не обнаружено на фото")
       
       if len(face_locations) > 1:
           raise ValueError("Обнаружено несколько лиц")
       
       # Извлечение кодировки лица
       face_encodings = face_recognition.face_encodings(image, face_locations)
       encoding = face_encodings[0]
       
       return encoding.tolist()  # Конвертация в список для JSON
   ```

3. **Сохранение в БД**
   - Сохраняем URL фото
   - Сохраняем векторное представление лица (encoding)
   - Помечаем как основное фото (`is_primary = true`)

### Процесс верификации

1. **Получение запроса**
   ```json
   {
     "user_id": 1,
     "photo_url": "https://storage.example.com/temp/checkin_123.jpg",
     "check_type": "checkin"
   }
   ```

2. **Обработка фото для верификации**
   ```python
   def verify_face(user_id, photo_url):
       # Загрузка эталонного фото из БД
       reference_photo = get_reference_photo(user_id)
       reference_encoding = np.array(reference_photo.encoding)
       
       # Загрузка и обработка нового фото
       image = face_recognition.load_image_file(photo_url)
       face_locations = face_recognition.face_locations(image)
       
       if len(face_locations) == 0:
           return {
               "verified": False,
               "confidence": 0.0,
               "message": "Лицо не обнаружено на фото"
           }
       
       face_encoding = face_recognition.face_encodings(image, face_locations)[0]
       
       # Сравнение лиц
       distance = face_recognition.face_distance([reference_encoding], face_encoding)[0]
       confidence = 1 - distance  # Конвертация расстояния в уверенность
       
       # Порог верификации (настраивается в system_settings)
       threshold = get_setting("face_verification_threshold", 0.6)
       
       verified = confidence >= threshold
       
       return {
           "verified": verified,
           "confidence": float(confidence),
           "message": "Лицо успешно верифицировано" if verified else "Лицо не совпадает"
       }
   ```

3. **Возврат результата**
   - Если верификация успешна → Backend сохраняет отметку
   - Если неуспешна → возвращается ошибка, отметка не сохраняется

### Оптимизация и улучшения

1. **Множественные эталонные фото**
   - Хранение нескольких фото для повышения точности
   - Использование среднего значения encoding

2. **Обработка освещения и углов**
   - Нормализация изображения
   - Повышение контраста
   - Обрезка и выравнивание лица

3. **Кэширование encoding**
   - Кэширование эталонных encoding в Redis
   - Ускорение верификации

4. **Асинхронная обработка**
   - Использование Celery для фоновой обработки
   - Не блокируем основной поток

### API Endpoints

**POST** `/verify`
```python
@app.post("/verify")
async def verify(request: VerifyRequest):
    result = verify_face(request.user_id, request.photo_url)
    return result
```

**POST** `/register`
```python
@app.post("/register")
async def register(request: RegisterRequest):
    encoding = process_photo(request.photo_url)
    save_reference_photo(request.user_id, request.photo_url, encoding)
    return {"success": True}
```

**GET** `/health`
```python
@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
```

---

## 📍 Геолокация

### Общая концепция

Геолокация используется для проверки, что сотрудник находится на рабочем месте при отметке прихода/ухода. Это предотвращает удаленную отметку и обеспечивает контроль присутствия.

### Технологии

- **Haversine формула** - расчет расстояния между координатами
- **PostgreSQL** - хранение координат и проверка
- **PostGIS** (опционально) - для более сложных геопространственных запросов

### Процесс проверки геолокации

1. **Получение координат**
   - Telegram Bot автоматически получает геолокацию при отметке
   - Координаты отправляются в Backend

2. **Поиск ближайшей рабочей локации**
   ```python
   def find_nearest_location(user_id, latitude, longitude):
       # Получаем отдел сотрудника
       user = get_user(user_id)
       department_id = user.department_id
       
       # Получаем рабочие локации отдела
       locations = get_work_locations(department_id)
       
       min_distance = float('inf')
       nearest_location = None
       
       for location in locations:
           distance = haversine_distance(
               (latitude, longitude),
               (location.latitude, location.longitude)
           )
           
           if distance < min_distance:
               min_distance = distance
               nearest_location = location
       
       return nearest_location, min_distance
   ```

3. **Проверка радиуса**
   ```python
   def verify_location(user_id, latitude, longitude):
       nearest_location, distance = find_nearest_location(
           user_id, latitude, longitude
       )
       
       if nearest_location is None:
           return {
               "verified": False,
               "message": "Рабочая локация не найдена"
           }
       
       # Проверка, что сотрудник в радиусе
       if distance <= nearest_location.radius:
           return {
               "verified": True,
               "work_location": {
                   "id": nearest_location.id,
                   "name": nearest_location.name,
                   "distance": distance
               },
               "message": "Сотрудник находится на рабочем месте"
           }
       else:
           return {
               "verified": False,
               "work_location": {
                   "id": nearest_location.id,
                   "name": nearest_location.name,
                   "distance": distance
               },
               "message": f"Сотрудник находится слишком далеко ({distance:.0f}м > {nearest_location.radius}м)"
           }
   ```

### Формула Haversine

```python
import math

def haversine_distance(coord1, coord2):
    """
    Рассчитывает расстояние между двумя точками на Земле
    в метрах по формуле Haversine
    
    coord1, coord2: (latitude, longitude) в градусах
    """
    R = 6371000  # Радиус Земли в метрах
    
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    distance = R * c
    return distance
```

### SQL функция для проверки (PostgreSQL)

```sql
CREATE OR REPLACE FUNCTION check_location(
    p_user_id INTEGER,
    p_latitude DECIMAL,
    p_longitude DECIMAL
) RETURNS TABLE (
    location_id INTEGER,
    location_name VARCHAR,
    distance DECIMAL,
    verified BOOLEAN
) AS $$
DECLARE
    v_department_id INTEGER;
    v_location RECORD;
    v_distance DECIMAL;
    v_min_distance DECIMAL := 999999;
    v_nearest_location RECORD;
BEGIN
    -- Получаем отдел сотрудника
    SELECT department_id INTO v_department_id
    FROM users
    WHERE id = p_user_id;
    
    -- Ищем ближайшую локацию
    FOR v_location IN
        SELECT id, name, latitude, longitude, radius
        FROM work_locations
        WHERE department_id = v_department_id
        AND is_active = true
    LOOP
        v_distance := (
            6371000 * acos(
                cos(radians(p_latitude)) *
                cos(radians(v_location.latitude)) *
                cos(radians(v_location.longitude) - radians(p_longitude)) +
                sin(radians(p_latitude)) *
                sin(radians(v_location.latitude))
            )
        );
        
        IF v_distance < v_min_distance THEN
            v_min_distance := v_distance;
            v_nearest_location := v_location;
        END IF;
    END LOOP;
    
    -- Проверяем радиус
    IF v_nearest_location IS NOT NULL AND v_min_distance <= v_nearest_location.radius THEN
        RETURN QUERY SELECT
            v_nearest_location.id,
            v_nearest_location.name,
            v_min_distance,
            true;
    ELSE
        RETURN QUERY SELECT
            COALESCE(v_nearest_location.id, 0),
            COALESCE(v_nearest_location.name, 'Не найдено'),
            v_min_distance,
            false;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### Интеграция с Telegram Bot

```javascript
// В Telegram Bot
bot.command('checkin', async (ctx) => {
  // Запрос геолокации
  await ctx.reply('Пожалуйста, отправьте вашу геолокацию', {
    reply_markup: {
      keyboard: [[{
        text: '📍 Отправить геолокацию',
        request_location: true
      }]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});

bot.on('location', async (ctx) => {
  const { latitude, longitude } = ctx.message.location;
  
  // Отправка в Backend
  const response = await fetch('https://api.example.com/api/geolocation/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: ctx.from.id,
      latitude,
      longitude
    })
  });
  
  const result = await response.json();
  
  if (result.verified) {
    await ctx.reply(`✅ Геолокация подтверждена\n📍 ${result.work_location.name}\n📏 Расстояние: ${result.work_location.distance.toFixed(0)}м`);
  } else {
    await ctx.reply(`❌ ${result.message}`);
  }
});
```

### Обработка ошибок

1. **Нет GPS сигнала**
   - Позволить сотруднику ввести адрес вручную
   - Администратор может подтвердить вручную

2. **Неточные координаты**
   - Увеличить радиус для мобильных устройств
   - Учитывать погрешность GPS (обычно 5-10 метров)

3. **Несколько локаций**
   - Выбирать ближайшую
   - Логировать все проверки

### Безопасность

1. **Проверка на сервере**
   - Всегда проверять геолокацию на сервере
   - Не доверять клиентским данным

2. **Защита от подделки**
   - Использовать Telegram Location API (сложно подделать)
   - Логировать все координаты для аудита

3. **Приватность**
   - Хранить координаты только для отметок
   - Не хранить историю перемещений
   - Соблюдать GDPR/законодательство о персональных данных

### Настройки

В `system_settings`:
- `location_verification_required` - обязательна ли проверка геолокации
- `location_radius_default` - радиус по умолчанию (метры)
- `location_gps_tolerance` - допустимая погрешность GPS (метры)

---

## 🔄 Интеграция в общий поток

### Полный процесс отметки прихода

```
1. Сотрудник → Telegram Bot: /checkin
2. Telegram Bot → Сотрудник: "Отправьте фото"
3. Сотрудник → Telegram Bot: Фото
4. Telegram Bot → Face ID Service: POST /verify
5. Face ID Service → Telegram Bot: {verified: true, confidence: 0.95}
6. Telegram Bot → Сотрудник: "Отправьте геолокацию"
7. Сотрудник → Telegram Bot: Геолокация
8. Telegram Bot → Backend: POST /api/geolocation/verify
9. Backend → Telegram Bot: {verified: true, work_location: {...}}
10. Telegram Bot → Backend: POST /api/attendance/checkin
    {
      photo_url: "...",
      face_verified: true,
      latitude: 55.7558,
      longitude: 37.6173,
      location_verified: true
    }
11. Backend → Database: Сохранение записи
12. Backend → WebSocket: Событие employee:checkin
13. WebSocket → Web Dashboard: Real-time обновление
```

### Обработка ошибок

- **Face ID не прошел** → Повторить попытку или обратиться к администратору
- **Геолокация не прошла** → Проверить настройки или ввести адрес вручную
- **Оба проверки не прошли** → Отметка не сохраняется, требуется ручное подтверждение

