import { useEffect, useState } from 'react'
import { createApiClient, getToken } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './Attendance.css'

export default function Attendance() {
  const [currentStatus, setCurrentStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [activeUsers, setActiveUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      const [statusRes, historyRes, activeRes] = await Promise.allSettled([
        api.get('/api/attendance/current/'),
        api.get('/api/attendance/?limit=20'),
        api.get('/api/attendance/active/'),
      ])

      if (statusRes.status === 'fulfilled') {
        setCurrentStatus(statusRes.value.data)
      }

      if (historyRes.status === 'fulfilled') {
        // Обрабатываем разные форматы ответа
        let data = []
        if (historyRes.value.data) {
          if (Array.isArray(historyRes.value.data)) {
            data = historyRes.value.data
          } else if (historyRes.value.data.results) {
            data = historyRes.value.data.results
          } else if (historyRes.value.data.data) {
            data = historyRes.value.data.data
          }
        }
        setHistory(data)
      }

      if (activeRes.status === 'fulfilled') {
        // Обрабатываем разные форматы ответа
        let data = []
        if (activeRes.value.data) {
          if (Array.isArray(activeRes.value.data)) {
            data = activeRes.value.data
          } else if (activeRes.value.data.results) {
            data = activeRes.value.data.results
          } else if (activeRes.value.data.data) {
            data = activeRes.value.data.data
          }
        }
        setActiveUsers(data)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleCheck = async (type) => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    const payload = {
      photo_url: 'https://placehold.co/200x200?text=photo',
      latitude: 55.7558,
      longitude: 37.6173,
      face_verified: true,
      location_verified: true,
    }

    try {
      await api.post(`/api/attendance/${type}/`, payload)
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при отправке отметки')
    } finally {
      setLoading(false)
    }
  }

  const chartData = history.slice(0, 7).map((item) => ({
    date: item.checkin_time ? item.checkin_time.split('T')[0] : '—',
    hours: item.total_hours || 0,
  }))

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h2>Учет рабочего времени</h2>
        <button className="refresh-btn" onClick={fetchData} disabled={loading}>
          Обновить
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="attendance-grid">
        <div className="card">
          <h3>Текущий статус</h3>
          {currentStatus ? (
            <div className="status-info">
              <div className="status-item">
                <span>На работе:</span>
                <strong className={currentStatus.is_checked_in ? 'status-yes' : 'status-no'}>
                  {currentStatus.is_checked_in ? 'Да' : 'Нет'}
                </strong>
              </div>
              <div className="status-item">
                <span>Время входа:</span>
                <strong>{currentStatus.checkin_time || '—'}</strong>
              </div>
              <div className="status-item">
                <span>Отработано часов:</span>
                <strong>{currentStatus.hours_worked ?? '—'}</strong>
              </div>
            </div>
          ) : (
            <div className="placeholder">Нет данных</div>
          )}
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={() => handleCheck('checkin')}
              disabled={loading}
            >
              Отметить приход
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleCheck('checkout')}
              disabled={loading}
            >
              Отметить уход
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Активные сотрудники</h3>
          {activeUsers.length > 0 ? (
            <div className="active-list">
              {activeUsers.map((user) => (
                <div key={user.user_id} className="active-item">
                  <div>
                    <strong>{user.full_name}</strong>
                    <span className="dept">{user.department}</span>
                  </div>
                  <div className="time-info">
                    <span>Вход: {user.checkin_time?.split('T')[1]?.slice(0, 5) || '—'}</span>
                    <span>Часов: {user.hours_worked || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="placeholder">Нет активных сотрудников</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>График отработанных часов (последние 7 дней)</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="placeholder">Нет данных для графика</div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>История посещений</h3>
        </div>
        {history.length > 0 ? (
          <div className="table">
            <div className="table-head">
              <span>ID</span>
              <span>Вход</span>
              <span>Выход</span>
              <span>Часы</span>
              <span>Опоздание</span>
            </div>
            {history.map((item) => (
              <div key={item.id} className="table-row">
                <span>{item.id}</span>
                <span>{item.checkin_time ? new Date(item.checkin_time).toLocaleString('ru-RU') : '—'}</span>
                <span>{item.checkout_time ? new Date(item.checkout_time).toLocaleString('ru-RU') : '—'}</span>
                <span>{item.total_hours ?? '—'}</span>
                <span className={item.is_late ? 'late' : ''}>
                  {item.is_late ? `Да (${item.late_minutes} мин)` : 'Нет'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="placeholder">История пуста</div>
        )}
      </div>
    </div>
  )
}



