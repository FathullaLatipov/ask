# Руководство по развертыванию

## 🚀 Быстрый старт (Development)

### Предварительные требования

- Docker и Docker Compose
- Node.js 18+ (для локальной разработки)
- PostgreSQL 14+ (опционально, если не используете Docker)
- Redis 6+ (опционально, если не используете Docker)

### Шаг 1: Клонирование и настройка

```bash
# Клонировать репозиторий
git clone <repository-url>
cd aks1

# Создать .env файл
cp .env.example .env

# Отредактировать .env файл
# Указать необходимые переменные окружения
```

### Шаг 2: Запуск через Docker Compose

```bash
# Запустить все сервисы
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка сервисов
docker-compose down
```

### Шаг 3: Инициализация базы данных

```bash
# Выполнить миграции
docker-compose exec backend npm run migrate

# Создать начальные данные (опционально)
docker-compose exec backend npm run seed
```

### Шаг 4: Проверка работы

- Backend API: http://localhost:3000
- Frontend: http://localhost:3002
- Face ID Service: http://localhost:8000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## 🏗️ Production развертывание

### Вариант 1: VPS (DigitalOcean, Hetzner, Yandex Cloud)

#### Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Установка Nginx
sudo apt install nginx -y
```

#### Настройка SSL (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение сертификата
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo certbot renew --dry-run
```

#### Настройка переменных окружения

```bash
# Создать .env файл на сервере
nano .env

# Указать production значения:
NODE_ENV=production
DB_PASSWORD=strong-password-here
JWT_SECRET=very-long-random-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
```

#### Запуск

```bash
# Сборка и запуск
docker-compose -f docker-compose.prod.yml up -d --build

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

### Вариант 2: Kubernetes

#### Подготовка манифестов

Создать Kubernetes манифесты для:
- Deployment для каждого сервиса
- Service для каждого сервиса
- ConfigMap для конфигурации
- Secret для секретов
- Ingress для маршрутизации

#### Деплой

```bash
# Применить манифесты
kubectl apply -f k8s/

# Проверка статуса
kubectl get pods
kubectl get services
```

---

## 📊 Мониторинг

### Health Checks

Все сервисы должны иметь health check endpoints:

- Backend: `GET /api/health`
- Face ID Service: `GET /health`
- WebSocket: `GET /health`

### Логирование

```bash
# Просмотр логов всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f face-id-service
```

### Метрики

Настроить Prometheus и Grafana для сбора метрик:
- CPU и память
- Время ответа API
- Количество запросов
- Размер очередей

---

## 🔄 Обновление

### Процедура обновления

```bash
# 1. Остановить сервисы
docker-compose down

# 2. Получить последние изменения
git pull

# 3. Пересобрать образы
docker-compose build

# 4. Запустить миграции БД
docker-compose run --rm backend npm run migrate

# 5. Запустить сервисы
docker-compose up -d

# 6. Проверить работу
docker-compose ps
docker-compose logs -f
```

### Откат изменений

```bash
# Откатить к предыдущей версии
git checkout <previous-commit>
docker-compose down
docker-compose up -d --build
```

---

## 💾 Бэкапы

### База данных

```bash
# Создать бэкап
docker-compose exec postgres pg_dump -U postgres employee_management > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из бэкапа
docker-compose exec -T postgres psql -U postgres employee_management < backup.sql
```

### Автоматизация бэкапов

Создать cron job для ежедневных бэкапов:

```bash
# Добавить в crontab
0 2 * * * docker-compose exec -T postgres pg_dump -U postgres employee_management > /backups/backup_$(date +\%Y\%m\%d).sql
```

### Хранение файлов

Бэкапировать директорию `storage/`:
- Фото сотрудников
- Загруженные файлы

---

## 🔐 Безопасность

### Рекомендации

1. **Изменить все пароли по умолчанию**
2. **Использовать сильные секретные ключи**
3. **Настроить firewall (ufw)**
4. **Включить HTTPS**
5. **Регулярно обновлять зависимости**
6. **Ограничить доступ к портам**
7. **Использовать VPN для доступа к серверу**

### Настройка Firewall

```bash
# Разрешить только необходимые порты
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 📈 Масштабирование

### Горизонтальное масштабирование

1. **Добавить больше инстансов Backend:**
   ```yaml
   backend:
     deploy:
       replicas: 3
   ```

2. **Настроить Load Balancer:**
   - Использовать Nginx или HAProxy
   - Распределение нагрузки между инстансами

3. **Database Replication:**
   - Настроить read replicas
   - Мастер для записи, реплики для чтения

### Вертикальное масштабирование

1. **Увеличить ресурсы сервера:**
   - Больше CPU
   - Больше RAM
   - Быстрый SSD

2. **Оптимизация:**
   - Индексы БД
   - Кэширование
   - Оптимизация запросов

---

## 🐛 Troubleshooting

### Проблемы с подключением к БД

```bash
# Проверить статус PostgreSQL
docker-compose ps postgres

# Проверить логи
docker-compose logs postgres

# Проверить подключение
docker-compose exec postgres psql -U postgres -d employee_management
```

### Проблемы с Redis

```bash
# Проверить статус
docker-compose ps redis

# Проверить подключение
docker-compose exec redis redis-cli ping
```

### Проблемы с Face ID Service

```bash
# Проверить логи
docker-compose logs face-id-service

# Проверить доступность
curl http://localhost:8000/health
```

### Проблемы с Telegram Bot

```bash
# Проверить логи
docker-compose logs telegram-bot

# Проверить токен
echo $TELEGRAM_BOT_TOKEN
```

---

## 📞 Поддержка

При возникновении проблем:
1. Проверить логи сервисов
2. Проверить статус контейнеров
3. Проверить переменные окружения
4. Проверить сетевые подключения
5. Обратиться к документации

