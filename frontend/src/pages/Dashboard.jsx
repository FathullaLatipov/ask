import { useEffect, useState } from 'react'
import { createApiClient, getToken } from '../api/client'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import './Dashboard.css'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalDepartments: 0,
    pendingRequests: 0,
  })
  const [attendanceData, setAttendanceData] = useState([])
  const [departmentData, setDepartmentData] = useState([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showUsersTable, setShowUsersTable] = useState(true)
  const [showRequestsTable, setShowRequestsTable] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)

    try {
      // Получаем статистику
      const [usersRes, activeRes, deptsRes, requestsRes, historyRes, deptsListRes] =
        await Promise.allSettled([
          api.get('/api/users/'),
          api.get('/api/attendance/active/'),
          api.get('/api/departments/'),
          api.get('/api/requests/'),
          api.get('/api/attendance/?limit=30'),
          api.get('/api/departments/'),
        ])

      // Функция для извлечения данных из ответа API
      const extractData = (responseData) => {
        if (!responseData) return []
        if (Array.isArray(responseData)) return responseData
        if (responseData.results) return responseData.results
        if (responseData.data) return responseData.data
        return []
      }

      if (usersRes.status === 'fulfilled') {
        const usersData = extractData(usersRes.value.data)
        setUsers(usersData)
        setStats((s) => ({ ...s, totalUsers: usersData.length }))
      }

      if (activeRes.status === 'fulfilled') {
        const active = extractData(activeRes.value.data)
        setStats((s) => ({ ...s, activeUsers: active.length }))
      }

      if (deptsRes.status === 'fulfilled') {
        const depts = extractData(deptsRes.value.data)
        setStats((s) => ({ ...s, totalDepartments: depts.length }))
      }

      if (requestsRes.status === 'fulfilled') {
        const requestsData = extractData(requestsRes.value.data)
        setRequests(requestsData)
        const pending = requestsData.filter((r) => r.status === 'pending')
        setStats((s) => ({ ...s, pendingRequests: pending.length }))
      }

      // Данные для графика посещаемости
      if (historyRes.status === 'fulfilled') {
        const history = extractData(historyRes.value.data)
        const dailyData = {}
        history.forEach((item) => {
          if (item.checkin_time) {
            const date = item.checkin_time.split('T')[0]
            dailyData[date] = (dailyData[date] || 0) + 1
          }
        })
        const chartData = Object.entries(dailyData)
          .map(([date, count]) => {
            // Форматируем дату для отображения
            const dateObj = new Date(date)
            const formattedDate = dateObj.toLocaleDateString('ru-RU', { 
              day: '2-digit', 
              month: '2-digit' 
            })
            return { date: formattedDate, fullDate: date, count }
          })
          .sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate))
          .slice(-7)
        setAttendanceData(chartData)
      }

      // Данные по отделам - считаем количество сотрудников в каждом отделе
      if (deptsListRes.status === 'fulfilled' && usersRes.status === 'fulfilled') {
        const depts = extractData(deptsListRes.value.data)
        const users = extractData(usersRes.value.data)
        
        // Подсчитываем сотрудников по отделам - правильный способ
        const chartData = depts.map(dept => {
          // Считаем сотрудников в этом отделе
          const count = users.filter(user => {
            if (!user.department) return false
            // Проверяем, соответствует ли отдел пользователя текущему отделу
            const userDeptId = typeof user.department === 'object' 
              ? user.department.id 
              : user.department
            return userDeptId === dept.id
          }).length
          
          return {
            name: dept.name,
            value: count
          }
        })
        
        // Показываем все отделы, даже если в них нет сотрудников
        // Для отделов без сотрудников ставим минимальное значение для визуализации
        const finalChartData = chartData.map(item => ({
          ...item,
          value: item.value > 0 ? item.value : 1 // Минимальное значение для отображения
        }))
        
        setDepartmentData(finalChartData)
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err)
      console.error('Детали ошибки:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      })
    } finally {
      setLoading(false)
    }
  }

  // Фильтрация пользователей
  const filteredUsers = users.filter((user) => {
    const matchesSearch = !searchQuery || 
      `${user.first_name} ${user.last_name} ${user.email || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = !filterRole || user.role === filterRole
    return matchesSearch && matchesRole
  })

  // Фильтрация заявок
  const filteredRequests = requests.filter((req) => {
    const matchesSearch = !searchQuery || 
      `${req.user?.first_name || ''} ${req.user?.last_name || ''} ${req.reason || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !filterStatus || req.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const statCards = [
    { label: 'Всего сотрудников', value: stats.totalUsers, icon: '👥', color: '#3b82f6' },
    { label: 'На работе сейчас', value: stats.activeUsers, icon: '✅', color: '#10b981' },
    { label: 'Отделов', value: stats.totalDepartments, icon: '🏢', color: '#f59e0b' },
    { label: 'Заявок на рассмотрении', value: stats.pendingRequests, icon: '📝', color: '#ef4444' },
  ]

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        {statCards.map((card, idx) => (
          <div key={idx} className="stat-card" style={{ borderTopColor: card.color }}>
            <div className="stat-icon" style={{ background: `${card.color}20` }}>
              {card.icon}
            </div>
            <div className="stat-content">
              <div className="stat-value">{loading ? '...' : card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Посещаемость за неделю</h3>
          {loading ? (
            <div className="chart-placeholder">Загрузка...</div>
          ) : attendanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-placeholder">Нет данных</div>
          )}
        </div>

        <div className="chart-card">
          <h3>Распределение по отделам</h3>
          {loading ? (
            <div className="chart-placeholder">Загрузка...</div>
          ) : departmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => {
                    // Показываем название и процент для всех отделов
                    const realValue = value === 1 && departmentData.find(d => d.name === name)?.value === 0 ? 0 : value
                    if (realValue === 0) return `${name} (0)`
                    return `${name}: ${Math.round(percent * 100)}%`
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => {
                    const entry = departmentData.find(d => d.name === name)
                    const realValue = entry && entry.value === 0 && value === 1 ? 0 : value
                    return [realValue === 0 ? 'Нет сотрудников' : `${realValue} сотрудников`, name]
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-placeholder">Нет данных</div>
          )}
        </div>
      </div>

      <div className="quick-actions">
        <h3>Быстрые действия</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => window.location.href = '/attendance'}>
            <span className="action-icon">⏰</span>
            <span>Учет времени</span>
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/users'}>
            <span className="action-icon">👥</span>
            <span>Сотрудники</span>
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/departments'}>
            <span className="action-icon">🏢</span>
            <span>Отделы</span>
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/requests'}>
            <span className="action-icon">📝</span>
            <span>Заявки</span>
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/salary'}>
            <span className="action-icon">💰</span>
            <span>Зарплата</span>
          </button>
        </div>
        <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>Управление данными</h4>
          <p style={{ margin: '0', fontSize: '14px', color: '#64748b' }}>
            Используйте кнопки "Добавить" на страницах Сотрудники, Отделы и Заявки для создания новых записей.
            Кнопки "Редактировать" и "Удалить" доступны в таблицах для управления существующими данными.
          </p>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className="card">
        <div className="search-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Поиск по имени, email, причине..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filters-row">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="filter-select"
            >
              <option value="">Все роли</option>
              <option value="employee">Сотрудник</option>
              <option value="manager">Менеджер</option>
              <option value="admin">Администратор</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">Все статусы</option>
              <option value="pending">На рассмотрении</option>
              <option value="approved">Утверждена</option>
              <option value="rejected">Отклонена</option>
            </select>
          </div>
        </div>
      </div>

      {/* Таблица сотрудников */}
      <div className="card">
        <div className="table-header">
          <h3>Сотрудники ({filteredUsers.length})</h3>
          <button 
            className="toggle-btn" 
            onClick={() => setShowUsersTable(!showUsersTable)}
          >
            {showUsersTable ? 'Скрыть' : 'Показать'}
          </button>
        </div>
        {showUsersTable && (
          <div className="table-container">
            {loading ? (
              <div className="placeholder">Загрузка...</div>
            ) : filteredUsers.length > 0 ? (
              <div className="table">
                <div className="table-head">
                  <span>ID</span>
                  <span>Имя</span>
                  <span>Email</span>
                  <span>Отдел</span>
                  <span>Должность</span>
                  <span>Роль</span>
                  <span>Статус</span>
                </div>
                {filteredUsers.slice(0, 10).map((user) => (
                  <div key={user.id} className="table-row">
                    <span>{user.id}</span>
                    <span>{user.first_name} {user.last_name}</span>
                    <span>{user.email || '—'}</span>
                    <span>{typeof user.department === 'object' ? user.department?.name : '—'}</span>
                    <span>{user.position || '—'}</span>
                    <span>
                      <span className={`role-badge role-${user.role}`}>{user.role}</span>
                    </span>
                    <span>
                      <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="placeholder">Нет сотрудников</div>
            )}
          </div>
        )}
      </div>

      {/* Таблица заявок */}
      <div className="card">
        <div className="table-header">
          <h3>Заявки ({filteredRequests.length})</h3>
          <button 
            className="toggle-btn" 
            onClick={() => setShowRequestsTable(!showRequestsTable)}
          >
            {showRequestsTable ? 'Скрыть' : 'Показать'}
          </button>
        </div>
        {showRequestsTable && (
          <div className="table-container">
            {loading ? (
              <div className="placeholder">Загрузка...</div>
            ) : filteredRequests.length > 0 ? (
              <div className="table">
                <div className="table-head">
                  <span>ID</span>
                  <span>Тип</span>
                  <span>Сотрудник</span>
                  <span>Дата начала</span>
                  <span>Дата окончания</span>
                  <span>Статус</span>
                </div>
                {filteredRequests.slice(0, 10).map((req) => {
                  const getTypeLabel = (type) => {
                    const types = {
                      vacation: 'Отпуск',
                      sick_leave: 'Больничный',
                      advance: 'Аванс',
                      day_off: 'Выходной'
                    }
                    return types[type] || type
                  }
                  const getStatusBadge = (status) => {
                    const badges = {
                      pending: { class: 'pending', label: 'На рассмотрении' },
                      approved: { class: 'approved', label: 'Утверждена' },
                      rejected: { class: 'rejected', label: 'Отклонена' },
                    }
                    return badges[status] || { class: '', label: status }
                  }
                  const statusBadge = getStatusBadge(req.status)
                  return (
                    <div key={req.id} className="table-row">
                      <span>{req.id}</span>
                      <span>{getTypeLabel(req.request_type)}</span>
                      <span>{req.user?.first_name} {req.user?.last_name}</span>
                      <span>{req.start_date || '—'}</span>
                      <span>{req.end_date || '—'}</span>
                      <span>
                        <span className={`status-badge ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="placeholder">Нет заявок</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}



