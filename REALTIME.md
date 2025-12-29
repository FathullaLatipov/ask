# Real-time механика

## 🔄 Общая концепция

Система использует WebSocket для real-time обновлений Web Dashboard. Это позволяет руководителям и администраторам видеть изменения в системе мгновенно без необходимости обновлять страницу.

## 🏗️ Архитектура Real-time

```
┌─────────────┐
│ Web Dashboard│
│  (Browser)   │
└──────┬───────┘
       │ WebSocket
       │ (Socket.io)
       ▼
┌─────────────┐
│ WebSocket   │
│   Server    │
│ (Socket.io) │
└──────┬───────┘
       │
   ┌───┴───┐
   ▼       ▼
┌──────┐ ┌──────────┐
│Redis │ │ REST API │
│Pub/Sub│ │ Service │
└──────┘ └──────────┘
```

## 📦 Технологии

- **Socket.io** - WebSocket библиотека для Node.js
- **Redis** - Pub/Sub для кластеризации
- **Redis Adapter** - адаптер Socket.io для Redis

## 🔌 Подключение клиента

### Инициализация

```javascript
import io from 'socket.io-client';

const socket = io('wss://api.example.com', {
  auth: {
    token: localStorage.getItem('authToken')
  },
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

### Обработка событий подключения

```javascript
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  // Подписка на комнаты
  socket.emit('subscribe', {
    rooms: ['dashboard', 'department:1']
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

## 📡 События от сервера

### 1. employee:checkin - Сотрудник отметился

```javascript
socket.on('employee:checkin', (data) => {
  console.log('Employee checked in:', data);
  // Обновление UI
  updateDashboard(data);
});

// Формат данных:
{
  "user_id": 1,
  "user_name": "Иван Иванов",
  "department_id": 1,
  "department_name": "Продажа",
  "checkin_time": "2024-01-15T09:05:00Z",
  "is_late": true,
  "late_minutes": 5,
  "location": {
    "latitude": 55.7558,
    "longitude": 37.6173,
    "work_location": "Офис на Тверской"
  }
}
```

### 2. employee:checkout - Сотрудник ушел

```javascript
socket.on('employee:checkout', (data) => {
  console.log('Employee checked out:', data);
  updateDashboard(data);
});

// Формат данных:
{
  "user_id": 1,
  "user_name": "Иван Иванов",
  "checkout_time": "2024-01-15T18:30:00Z",
  "total_hours": 9.42
}
```

### 3. employee:late - Опоздание

```javascript
socket.on('employee:late', (data) => {
  console.log('Employee is late:', data);
  showNotification(`Сотрудник ${data.user_name} опоздал на ${data.late_minutes} минут`);
});

// Формат данных:
{
  "user_id": 1,
  "user_name": "Иван Иванов",
  "department_id": 1,
  "checkin_time": "2024-01-15T09:20:00Z",
  "late_minutes": 20,
  "scheduled_time": "2024-01-15T09:00:00Z"
}
```

### 4. request:created - Создана заявка

```javascript
socket.on('request:created', (data) => {
  console.log('New request created:', data);
  if (userRole === 'manager' || userRole === 'admin') {
    showNotification(`Новая заявка от ${data.user_name}`);
  }
});

// Формат данных:
{
  "request_id": 1,
  "user_id": 1,
  "user_name": "Иван Иванов",
  "request_type": "vacation",
  "start_date": "2024-02-01",
  "end_date": "2024-02-14",
  "status": "pending"
}
```

### 5. request:approved - Заявка утверждена

```javascript
socket.on('request:approved', (data) => {
  console.log('Request approved:', data);
  updateRequestStatus(data.request_id, 'approved');
});

// Формат данных:
{
  "request_id": 1,
  "user_id": 1,
  "user_name": "Иван Иванов",
  "reviewed_by": 5,
  "reviewed_by_name": "Петр Петров"
}
```

### 6. request:rejected - Заявка отклонена

```javascript
socket.on('request:rejected', (data) => {
  console.log('Request rejected:', data);
  updateRequestStatus(data.request_id, 'rejected');
});

// Формат данных:
{
  "request_id": 1,
  "user_id": 1,
  "user_name": "Иван Иванов",
  "reviewed_by": 5,
  "review_comment": "Недостаточно дней отпуска"
}
```

### 7. penalty:created - Создан штраф

```javascript
socket.on('penalty:created', (data) => {
  console.log('Penalty created:', data);
  if (data.user_id === currentUserId) {
    showNotification(`Вам начислен штраф: ${data.amount} руб.`);
  }
});

// Формат данных:
{
  "penalty_id": 1,
  "user_id": 1,
  "user_name": "Иван Иванов",
  "penalty_type": "late",
  "amount": 500.00,
  "description": "Опоздание на 15 минут"
}
```

### 8. dashboard:update - Обновление дашборда

```javascript
socket.on('dashboard:update', (data) => {
  console.log('Dashboard updated:', data);
  updateDashboardStats(data);
});

// Формат данных:
{
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

## 🖥️ Серверная реализация

### Инициализация Socket.io сервера

```javascript
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Redis адаптер для кластеризации
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

### Middleware для аутентификации

```javascript
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    // Верификация JWT токена
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }
    
    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});
```

### Обработка подключений

```javascript
io.on('connection', (socket) => {
  const user = socket.data.user;
  console.log(`User ${user.id} connected`);
  
  // Подписка на комнаты
  socket.on('subscribe', async ({ rooms }) => {
    for (const room of rooms) {
      socket.join(room);
      console.log(`User ${user.id} joined room: ${room}`);
    }
  });
  
  // Отписка от комнат
  socket.on('unsubscribe', ({ rooms }) => {
    for (const room of rooms) {
      socket.leave(room);
    }
  });
  
  // Автоматическая подписка на комнаты по роли
  if (user.role === 'admin') {
    socket.join('admin');
    socket.join('dashboard');
  } else if (user.role === 'manager') {
    socket.join('manager');
    socket.join('dashboard');
    if (user.department_id) {
      socket.join(`department:${user.department_id}`);
    }
  } else {
    socket.join(`user:${user.id}`);
  }
  
  socket.on('disconnect', () => {
    console.log(`User ${user.id} disconnected`);
  });
});
```

### Публикация событий из REST API

```javascript
// В REST API сервисе
import { io } from './socket';

// При отметке прихода
async function handleCheckin(userId, data) {
  // Сохранение в БД
  const attendance = await saveAttendance(userId, data);
  
  // Публикация события
  const user = await getUserById(userId);
  io.to('dashboard').emit('employee:checkin', {
    user_id: user.id,
    user_name: `${user.first_name} ${user.last_name}`,
    department_id: user.department_id,
    department_name: user.department?.name,
    checkin_time: attendance.checkin_time,
    is_late: attendance.is_late,
    late_minutes: attendance.late_minutes,
    location: {
      latitude: attendance.checkin_latitude,
      longitude: attendance.checkin_longitude,
      work_location: attendance.work_location?.name
    }
  });
  
  // Если опоздание - отдельное событие
  if (attendance.is_late) {
    io.to('manager').emit('employee:late', {
      user_id: user.id,
      user_name: `${user.first_name} ${user.last_name}`,
      department_id: user.department_id,
      checkin_time: attendance.checkin_time,
      late_minutes: attendance.late_minutes,
      scheduled_time: getScheduledTime(user)
    });
  }
  
  // Обновление статистики дашборда
  updateDashboardStats();
}

// Обновление статистики дашборда
async function updateDashboardStats() {
  const stats = await calculateDashboardStats();
  
  io.to('dashboard').emit('dashboard:update', stats);
}
```

## 🏠 Комнаты (Rooms)

### Типы комнат

1. **dashboard** - все пользователи с доступом к дашборду
2. **admin** - только администраторы
3. **manager** - только руководители
4. **department:{id}** - сотрудники конкретного отдела
5. **user:{id}** - конкретный пользователь

### Логика подписки

```javascript
// Автоматическая подписка при подключении
io.on('connection', (socket) => {
  const user = socket.data.user;
  
  // Базовая комната для всех
  socket.join('dashboard');
  
  // По роли
  if (user.role === 'admin') {
    socket.join('admin');
  } else if (user.role === 'manager') {
    socket.join('manager');
    socket.join(`department:${user.department_id}`);
  }
  
  // Личная комната
  socket.join(`user:${user.id}`);
});
```

## 📊 Обновление дашборда

### Периодическое обновление статистики

```javascript
// Каждые 30 секунд обновляем статистику
setInterval(async () => {
  const stats = await calculateDashboardStats();
  io.to('dashboard').emit('dashboard:update', stats);
}, 30000);

async function calculateDashboardStats() {
  const totalEmployees = await getTotalEmployees();
  const activeAttendance = await getActiveAttendance();
  const checkedIn = activeAttendance.filter(a => !a.checkout_time).length;
  const checkedOut = activeAttendance.filter(a => a.checkout_time).length;
  const lateCount = await getLateCountToday();
  const absentCount = await getAbsentCountToday();
  
  const departments = await getDepartmentStats();
  
  return {
    total_employees: totalEmployees,
    checked_in: checkedIn,
    checked_out: checkedOut,
    on_break: 0, // можно добавить логику перерывов
    late_count: lateCount,
    absent_count: absentCount,
    departments: departments
  };
}
```

## 🔄 Fallback механизм

### Polling как резерв

Если WebSocket недоступен, клиент переключается на polling:

```javascript
let useWebSocket = true;

function connect() {
  if (useWebSocket) {
    socket = io(WS_URL, { ... });
    
    socket.on('connect_error', () => {
      console.log('WebSocket failed, switching to polling');
      useWebSocket = false;
      startPolling();
    });
  } else {
    startPolling();
  }
}

function startPolling() {
  setInterval(async () => {
    const response = await fetch('/api/reports/dashboard');
    const data = await response.json();
    updateDashboard(data);
  }, 5000); // каждые 5 секунд
}
```

## 📱 Интеграция с React

### Хук для WebSocket

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function useWebSocket(token) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const newSocket = io(WS_URL, {
      auth: { token },
      transports: ['websocket']
    });
    
    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('subscribe', { rooms: ['dashboard'] });
    });
    
    newSocket.on('disconnect', () => {
      setConnected(false);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, [token]);
  
  return { socket, connected };
}

// Использование
function Dashboard() {
  const token = localStorage.getItem('authToken');
  const { socket, connected } = useWebSocket(token);
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('dashboard:update', (data) => {
      setStats(data);
    });
    
    socket.on('employee:checkin', (data) => {
      // Обновление UI
      updateEmployeeStatus(data);
    });
    
    return () => {
      socket.off('dashboard:update');
      socket.off('employee:checkin');
    };
  }, [socket]);
  
  return (
    <div>
      {connected ? '🟢 Connected' : '🔴 Disconnected'}
      {/* Dashboard content */}
    </div>
  );
}
```

## 🔒 Безопасность

### Проверка прав доступа

```javascript
io.use((socket, next) => {
  const user = socket.data.user;
  const room = socket.handshake.query.room;
  
  // Проверка прав на комнату
  if (room.startsWith('department:')) {
    const departmentId = parseInt(room.split(':')[1]);
    if (user.role !== 'admin' && user.department_id !== departmentId) {
      return next(new Error('Access denied'));
    }
  }
  
  next();
});
```

### Rate limiting

```javascript
import rateLimit from 'express-rate-limit';

const socketRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 100 // максимум 100 событий в минуту
});

// Применение к WebSocket соединениям
```

## 📈 Мониторинг

### Метрики

- Количество активных соединений
- Количество событий в секунду
- Задержка доставки событий
- Процент успешных доставок

### Логирование

```javascript
io.on('connection', (socket) => {
  logger.info('WebSocket connection', {
    userId: socket.data.user.id,
    ip: socket.handshake.address
  });
  
  socket.onAny((event, ...args) => {
    logger.debug('WebSocket event', {
      userId: socket.data.user.id,
      event,
      args
    });
  });
});
```

## 🚀 Оптимизация

1. **Компрессия** - включить сжатие для WebSocket
2. **Батчинг событий** - группировать события для снижения нагрузки
3. **Селективная подписка** - подписываться только на нужные события
4. **Кэширование** - кэшировать статистику в Redis

