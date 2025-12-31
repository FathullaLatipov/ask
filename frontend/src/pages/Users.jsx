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
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    department: '',
    position: '',
    role: 'employee',
    salary_type: 'hourly',
    hourly_rate: '',
    fixed_salary: '',
    is_active: true,
    password: ''
  })

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
      // Обрабатываем разные форматы ответа (с пагинацией и без)
      let data = []
      if (res.data) {
        if (Array.isArray(res.data)) {
          data = res.data
        } else if (res.data.results) {
          data = res.data.results
        } else if (res.data.data) {
          data = res.data.data
        }
      }
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err)
      setError(err.response?.data?.detail || err.message || 'Ошибка загрузки пользователей')
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
      // Обрабатываем разные форматы ответа
      let data = []
      if (res.data) {
        if (Array.isArray(res.data)) {
          data = res.data
        } else if (res.data.results) {
          data = res.data.results
        } else if (res.data.data) {
          data = res.data.data
        }
      }
      setDepartments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Ошибка загрузки отделов:', err)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [filterDept, filterRole])

  const handleCreate = () => {
    setEditingUser(null)
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      middle_name: '',
      phone: '',
      department: '',
      position: '',
      role: 'employee',
      salary_type: 'hourly',
      hourly_rate: '',
      fixed_salary: '',
      is_active: true,
      password: ''
    })
    setShowModal(true)
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      middle_name: user.middle_name || '',
      phone: user.phone || '',
      department: typeof user.department === 'object' ? user.department.id : user.department || '',
      position: user.position || '',
      role: user.role || 'employee',
      salary_type: user.salary_type || 'hourly',
      hourly_rate: user.hourly_rate || '',
      fixed_salary: user.fixed_salary || '',
      is_active: user.is_active !== undefined ? user.is_active : true,
      password: ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return

    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      await api.delete(`/api/users/${id}/`)
      await fetchUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка удаления пользователя')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      const payload = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name,
        phone: formData.phone,
        department: formData.department || null,
        position: formData.position,
        role: formData.role,
        salary_type: formData.salary_type,
        is_active: formData.is_active,
      }

      if (formData.password) {
        payload.password = formData.password
      }

      if (formData.salary_type === 'hourly') {
        payload.hourly_rate = formData.hourly_rate ? parseFloat(formData.hourly_rate) : null
      } else {
        payload.fixed_salary = formData.fixed_salary ? parseFloat(formData.fixed_salary) : null
      }

      if (editingUser) {
        await api.patch(`/api/users/${editingUser.id}/`, payload)
      } else {
        await api.post('/api/users/', payload)
      }

      setShowModal(false)
      await fetchUsers()
    } catch (err) {
      setError(err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(', ') || 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h2>Сотрудники</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            + Добавить сотрудника
          </button>
          <button className="refresh-btn" onClick={fetchUsers} disabled={loading}>
            Обновить
          </button>
        </div>
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
              <span>Действия</span>
            </div>
            {users.map((user) => (
              <div key={user.id} className="table-row">
                <span>{user.id}</span>
                <span>
                  {user.first_name} {user.last_name}
                </span>
                <span>{user.email || '—'}</span>
                <span>
                  {typeof user.department === 'object' 
                    ? user.department?.name 
                    : departments.find(d => d.id === user.department)?.name || '—'}
                </span>
                <span>{user.position || '—'}</span>
                <span>
                  <span className={`role-badge role-${user.role}`}>{user.role}</span>
                </span>
                <span>
                  <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </span>
                <span className="actions">
                  <button 
                    className="btn-small btn-primary" 
                    onClick={() => handleEdit(user)}
                    disabled={loading}
                  >
                    Редактировать
                  </button>
                  <button 
                    className="btn-small btn-danger" 
                    onClick={() => handleDelete(user.id)}
                    disabled={loading}
                  >
                    Удалить
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="placeholder">Нет сотрудников</div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? 'Редактировать сотрудника' : 'Добавить сотрудника'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Пароль {editingUser ? '(оставьте пустым, чтобы не менять)' : '*'}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Имя *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Фамилия *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Отчество</label>
                  <input
                    type="text"
                    value={formData.middle_name}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Телефон</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Отдел</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="">Без отдела</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Должность</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Роль *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                  >
                    <option value="employee">Сотрудник</option>
                    <option value="manager">Менеджер</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Тип зарплаты *</label>
                  <select
                    value={formData.salary_type}
                    onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
                    required
                  >
                    <option value="hourly">Почасовая</option>
                    <option value="fixed">Фиксированная</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                {formData.salary_type === 'hourly' ? (
                  <div className="form-group">
                    <label>Почасовая ставка</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Фиксированная зарплата</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.fixed_salary}
                      onChange={(e) => setFormData({ ...formData, fixed_salary: e.target.value })}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    Активен
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Сохранение...' : editingUser ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}



