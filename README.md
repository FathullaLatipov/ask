# Система учета сотрудников (Employee Management System)

Корпоративная система учета сотрудников с фиксацией рабочего времени, Face ID, геолокацией, расчетом заработной платы и real-time мониторингом.

## 📋 Описание проекта

Система предназначена для автоматизации учета рабочего времени сотрудников с использованием современных технологий:
- **Telegram Bot** для сотрудников (отметка прихода/ухода, заявки)
- **Web Dashboard** для руководства и администраторов (мониторинг, управление)
- **REST API** для интеграции всех компонентов
- **Real-time обновления** через WebSocket
- **Face ID** для идентификации при входе/выходе
- **Геолокация** для проверки присутствия на рабочем месте

## 🏗️ Архитектура системы

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Telegram Bot│────▶│  REST API    │◀────│ Web Frontend│
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Database   │
                    │  (PostgreSQL)│
                    └──────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
            ┌─────────────┐  ┌─────────────┐
            │  WebSocket  │  │  Face ID    │
            │   Server    │  │   Service   │
            └─────────────┘  └─────────────┘
```

## 🎯 Основные возможности

### Для сотрудников (Telegram Bot)
- ✅ Отметка прихода и ухода
- 📸 Face ID при входе/выходе
- 📍 Автоматическая отправка геолокации
- 📊 Просмотр отработанного времени, штрафов, ЗП
- 📝 Подача заявок (отпуск, больничный, выходной, аванс)

### Для руководителей (Web Dashboard)
- 📈 Real-time дашборд с присутствием сотрудников
- ✅ Утверждение заявок (отгулы, больничные, авансы)
- 📊 Отчеты по заработной плате
- 📅 Календарь отпусков и больничных

### Для администраторов (Web Dashboard)
- 👥 Управление сотрудниками и отделами
- ⏰ Настройка графиков работы
- 💰 Управление штрафами
- 📍 Управление рабочими локациями
- 🔐 Полный доступ к системе

## 📚 Документация

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Архитектура системы
- [DATABASE.md](./DATABASE.md) - Схема базы данных
- [API.md](./API.md) - REST API спецификация
- [FACE_ID_GEOLOCATION.md](./FACE_ID_GEOLOCATION.md) - Логика Face ID и геолокации
- [REALTIME.md](./REALTIME.md) - Real-time механика
- [TECH_STACK.md](./TECH_STACK.md) - Технологический стек
- [RISKS.md](./RISKS.md) - Риски и решения

## 🚀 Быстрый старт

### Требования
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Python 3.9+ (для Face ID сервиса)

### Установка

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run migrate

# Frontend
cd frontend
npm install
cp .env.example .env

# Telegram Bot
cd telegram-bot
npm install
cp .env.example .env

# Face ID Service
cd face-id-service
pip install -r requirements.txt
```

### Запуск

```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev

# Telegram Bot
cd telegram-bot
npm run dev

# Face ID Service
cd face-id-service
python app.py
```

## 📁 Структура проекта

```
aks1/
├── backend/              # REST API (Node.js/Express)
├── frontend/           # Web Dashboard (React/Next.js)
├── telegram-bot/       # Telegram Bot (Node.js/Telegraf)
├── face-id-service/    # Face ID сервис (Python/FastAPI)
├── shared/             # Общие типы и утилиты
├── docs/               # Дополнительная документация
└── docker/             # Docker конфигурации
```

## 🔐 Роли в системе

1. **Сотрудник** - базовая роль, работа через Telegram Bot
2. **Руководитель** - просмотр дашборда, утверждение заявок
3. **Администратор** - полный доступ к системе

## 📊 Отделы

- Продажа
- Касса
- Охрана
- Склад
- Снабжение
- Бухгалтерия
- Прочие сотрудники

## 💰 Расчет заработной платы

```
ЗП = (Отработанные часы × ставка) - штрафы - опоздания - авансы
```

Поддержка:
- Фиксированная ЗП
- Почасовая оплата
- Переработки

## 📝 Лицензия

Proprietary - внутренний корпоративный проект

