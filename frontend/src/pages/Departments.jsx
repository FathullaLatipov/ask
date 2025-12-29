import { useEffect, useState } from 'react'
import { createApiClient, getToken } from '../api/client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import './Departments.css'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Departments() {
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
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
      const [deptsRes, usersRes] = await Promise.allSettled([
        api.get('/api/departments/'),
        api.get('/api/users/'),
      ])

      if (deptsRes.status === 'fulfilled') {
        const data = deptsRes.value.data?.data || deptsRes.value.data || []
        setDepartments(Array.isArray(data) ? data : [])
      }

      if (usersRes.status === 'fulfilled') {
        const data = usersRes.value.data?.data || usersRes.value.data || []
        setUsers(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const chartData = departments.map((dept) => {
    const count = users.filter((u) => u.department?.id === dept.id).length
    return { name: dept.name, value: count }
  })

  return (
    <div className="departments-page">
      <div className="page-header">
        <h2>Отделы</h2>
        <button className="refresh-btn" onClick={fetchData} disabled={loading}>
          Обновить
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="departments-grid">
        <div className="card">
          <h3>Распределение сотрудников по отделам</h3>
          {loading ? (
            <div className="placeholder">Загрузка...</div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="placeholder">Нет данных</div>
          )}
        </div>

        <div className="card">
          <h3>Список отделов</h3>
          {loading ? (
            <div className="placeholder">Загрузка...</div>
          ) : departments.length > 0 ? (
            <div className="departments-list">
              {departments.map((dept) => {
                const deptUsers = users.filter((u) => u.department?.id === dept.id)
                return (
                  <div key={dept.id} className="department-item">
                    <div className="dept-header">
                      <h4>{dept.name}</h4>
                      <span className="dept-count">{deptUsers.length} сотрудников</span>
                    </div>
                    {dept.description && <p className="dept-desc">{dept.description}</p>}
                    {deptUsers.length > 0 && (
                      <div className="dept-users">
                        {deptUsers.slice(0, 5).map((user) => (
                          <span key={user.id} className="user-tag">
                            {user.first_name} {user.last_name}
                          </span>
                        ))}
                        {deptUsers.length > 5 && (
                          <span className="user-tag more">+{deptUsers.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="placeholder">Нет отделов</div>
          )}
        </div>
      </div>
    </div>
  )
}


