import { useEffect, useState } from 'react'
import { createApiClient, getToken } from '../api/client'
import './Users.css'

export default function Users() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterRole, setFilterRole] = useState('')

  useEffect(() => {
    fetchUsers()
    fetchDepartments()
  }, [])

  const fetchUsers = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      const params = {}
      if (filterDept) params.department_id = filterDept
      if (filterRole) params.role = filterRole

      const res = await api.get('/api/users/', { params })
      const data = res.data?.data || res.data || []
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки пользователей')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    try {
      const res = await api.get('/api/departments/')
      const data = res.data?.data || res.data || []
      setDepartments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Ошибка загрузки отделов:', err)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [filterDept, filterRole])

  return (
    <div className="users-page">
      <div className="page-header">
        <h2>Сотрудники</h2>
        <button className="refresh-btn" onClick={fetchUsers} disabled={loading}>
          Обновить
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="filters">
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="filter-select"
        >
          <option value="">Все отделы</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
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
      </div>

      <div className="card">
        {loading ? (
          <div className="placeholder">Загрузка...</div>
        ) : users.length > 0 ? (
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
            {users.map((user) => (
              <div key={user.id} className="table-row">
                <span>{user.id}</span>
                <span>
                  {user.first_name} {user.last_name}
                </span>
                <span>{user.email || '—'}</span>
                <span>{user.department?.name || '—'}</span>
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
    </div>
  )
}


