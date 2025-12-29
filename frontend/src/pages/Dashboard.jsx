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
          api.get('/api/attendance/history/?limit=30'),
          api.get('/api/departments/'),
        ])

      if (usersRes.status === 'fulfilled') {
        const users = usersRes.value.data?.data || usersRes.value.data || []
        setStats((s) => ({ ...s, totalUsers: users.length }))
      }

      if (activeRes.status === 'fulfilled') {
        const active = activeRes.value.data?.data || activeRes.value.data || []
        setStats((s) => ({ ...s, activeUsers: active.length }))
      }

      if (deptsRes.status === 'fulfilled') {
        const depts = deptsRes.value.data?.data || deptsRes.value.data || []
        setStats((s) => ({ ...s, totalDepartments: depts.length }))
      }

      if (requestsRes.status === 'fulfilled') {
        const requests = requestsRes.value.data?.data || requestsRes.value.data || []
        const pending = requests.filter((r) => r.status === 'pending')
        setStats((s) => ({ ...s, pendingRequests: pending.length }))
      }

      // Данные для графика посещаемости
      if (historyRes.status === 'fulfilled') {
        const history = historyRes.value.data?.data || historyRes.value.data || []
        const dailyData = {}
        history.forEach((item) => {
          if (item.checkin_time) {
            const date = item.checkin_time.split('T')[0]
            dailyData[date] = (dailyData[date] || 0) + 1
          }
        })
        const chartData = Object.entries(dailyData)
          .map(([date, count]) => ({ date, count }))
          .slice(-7)
        setAttendanceData(chartData)
      }

      // Данные по отделам
      if (deptsListRes.status === 'fulfilled') {
        const depts = deptsListRes.value.data?.data || deptsListRes.value.data || []
        setDepartmentData(depts.slice(0, 5).map((d) => ({ name: d.name, value: 1 })))
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err)
    } finally {
      setLoading(false)
    }
  }

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
                  label={({ name }) => name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
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
          <button className="action-btn" onClick={() => window.location.href = '/requests'}>
            <span className="action-icon">📝</span>
            <span>Заявки</span>
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/salary'}>
            <span className="action-icon">💰</span>
            <span>Зарплата</span>
          </button>
        </div>
      </div>
    </div>
  )
}


