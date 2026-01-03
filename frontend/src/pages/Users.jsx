import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createApiClient, getToken } from '../api/client'
import ConfirmModal from '../components/ConfirmModal'
import Pagination from '../components/Pagination'
import './Users.css'

export default function Users() {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, userId: null, userName: '' })
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)
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

  const fetchUsers = async (page = 1) => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      const params = { page }
      if (filterDept) params.department_id = filterDept
      if (filterRole) params.role = filterRole

      const res = await api.get('/api/users/', { params })
      // Обрабатываем разные форматы ответа (с пагинацией и без)
      let data = []
      if (res.data) {
        if (Array.isArray(res.data)) {
          data = res.data
          setTotalCount(res.data.length)
          setTotalPages(1)
        } else if (res.data.results) {
          data = res.data.results
          setTotalCount(res.data.count || res.data.results.length)
          // Вычисляем общее количество страниц
          const count = res.data.count || res.data.results.length
          setTotalPages(Math.ceil(count / pageSize))
        } else if (res.data.data) {
          data = res.data.data
          setTotalCount(Array.isArray(res.data.data) ? res.data.data.length : 0)
          setTotalPages(1)
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
    setCurrentPage(1)
    fetchUsers(1)
  }, [filterDept, filterRole])

  useEffect(() => {
    fetchUsers(currentPage)
  }, [currentPage])

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

  const handleDeleteClick = (id, userName) => {
    setDeleteConfirm({ isOpen: true, userId: id, userName })
  }

  const handleDeleteConfirm = async () => {
    const { userId } = deleteConfirm
    if (!userId) return

    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')
    setDeleteConfirm({ isOpen: false, userId: null, userName: '' })

    try {
      await api.delete(`/api/users/${userId}/`)
      await fetchUsers(currentPage)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка удаления пользователя')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = !searchQuery || 
      `${user.first_name} ${user.last_name} ${user.email || ''} ${user.position || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = !filterDept || 
      (typeof user.department === 'object' ? user.department?.id : user.department) == filterDept
    const matchesRole = !filterRole || user.role === filterRole
    return matchesSearch && matchesDept && matchesRole
  })

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
        middle_name: formData.middle_name || '',
        phone: formData.phone || '',
        department: formData.department ? parseInt(formData.department) : null,
        position: formData.position || '',
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
      await fetchUsers(currentPage)
    } catch (err) {
      console.error('Ошибка сохранения:', err.response?.data)
      let errorMessage = 'Ошибка сохранения'
      
      if (err.response?.data) {
        // Обработка детальной ошибки
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail
        } else {
          // Обработка ошибок валидации полей
          const errors = []
          Object.keys(err.response.data).forEach((field) => {
            const fieldErrors = err.response.data[field]
            if (Array.isArray(fieldErrors)) {
              fieldErrors.forEach((msg) => {
                errors.push(`${field}: ${msg}`)
              })
            } else if (typeof fieldErrors === 'string') {
              errors.push(`${field}: ${fieldErrors}`)
            } else {
              errors.push(`${field}: ${JSON.stringify(fieldErrors)}`)
            }
          })
          errorMessage = errors.length > 0 ? errors.join('; ') : errorMessage
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h2>{t('users.title')}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            + {t('users.addUser')}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="search-filters-section">
        <div className="filters-row">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="filter-select"
          >
            <option value="">{t('users.allDepartments')}</option>
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
            <option value="">{t('users.allRoles')}</option>
            <option value="employee">{t('users.roles.employee')}</option>
            <option value="manager">{t('users.roles.manager')}</option>
            <option value="admin">{t('users.roles.admin')}</option>
          </select>
          <div className="search-box">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder={t('users.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
        {filteredUsers.length !== users.length && (
          <div style={{ marginTop: '8px', color: '#64748b', fontSize: '14px' }}>
            {t('users.found')}: {filteredUsers.length} {t('users.of')} {users.length}
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="placeholder">{t('users.loading')}</div>
        ) : filteredUsers.length > 0 ? (
          <div className="table">
            <div className="table-head">
              <span>{t('users.id')}</span>
              <span>{t('users.name')}</span>
              <span>{t('users.email')}</span>
              <span>{t('users.department')}</span>
              <span>{t('users.position')}</span>
              <span>{t('users.role')}</span>
              <span>{t('users.status')}</span>
              <span>{t('common.actions')}</span>
            </div>
            {filteredUsers.map((user) => (
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
                  <span className={`role-badge role-${user.role}`}>
                    {user.role === 'admin' ? t('users.roles.admin') : 
                     user.role === 'manager' ? t('users.roles.manager') : 
                     t('users.roles.employee')}
                  </span>
                </span>
                <span>
                  <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? t('users.active') : t('users.inactive')}
                  </span>
                </span>
                <span className="actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="btn-small btn-primary" 
                    onClick={() => handleEdit(user)}
                    disabled={loading}
                  >
                    {t('users.edit')}
                  </button>
                  <button 
                    className="btn-small btn-danger" 
                    onClick={() => handleDeleteClick(user.id, `${user.first_name} ${user.last_name}`)}
                    disabled={loading}
                  >
                    {t('users.delete')}
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="placeholder">{t('users.noEmployees')}</div>
        )}
      </div>

      {!loading && filteredUsers.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? t('users.editUser') : t('users.addUser')}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>{t('users.email')} {t('users.required')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.password')} {editingUser ? t('users.passwordHint') : t('users.required')}</label>
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
                  <label>{t('users.firstName')} {t('users.required')}</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.lastName')} {t('users.required')}</label>
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
                  <label>{t('users.middleName')}</label>
                  <input
                    type="text"
                    value={formData.middle_name}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.phone')}</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('users.department')}</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="">{t('users.noDepartment')}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('users.position')}</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('users.role')} {t('users.required')}</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                  >
                    <option value="employee">{t('users.roles.employee')}</option>
                    <option value="manager">{t('users.roles.manager')}</option>
                    <option value="admin">{t('users.roles.admin')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('users.salaryType')} {t('users.required')}</label>
                  <select
                    value={formData.salary_type}
                    onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
                    required
                  >
                    <option value="hourly">{t('users.salaryTypes.hourly')}</option>
                    <option value="fixed">{t('users.salaryTypes.fixed')}</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                {formData.salary_type === 'hourly' ? (
                  <div className="form-group">
                    <label>{t('users.hourlyRate')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>{t('users.fixedSalary')}</label>
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
                    {t('users.isActive')}
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {t('users.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? t('users.saving') : editingUser ? t('users.save') : t('users.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, userId: null, userName: '' })}
        onConfirm={handleDeleteConfirm}
        title={t('users.deleteConfirm')}
        message={t('users.deleteMessage', { name: deleteConfirm.userName })}
        confirmText={t('users.deleteButton')}
        cancelText={t('users.cancel')}
      />
    </div>
  )
}



