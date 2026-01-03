import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createApiClient, getToken } from '../api/client'
import ConfirmModal from '../components/ConfirmModal'
import Pagination from '../components/Pagination'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import './Departments.css'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function Departments() {
  const { t } = useTranslation()
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(new Set())
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(10)
  const [allDepartments, setAllDepartments] = useState([])
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager: ''
  })
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, deptId: null, deptName: '' })

  useEffect(() => {
    fetchAllDepartments()
    fetchUsers()
  }, [])

  useEffect(() => {
    if (!searchQuery) {
      fetchData()
    } else {
      setCurrentPage(1)
    }
  }, [currentPage, searchQuery])

  const fetchAllDepartments = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    try {
      const response = await api.get('/api/departments/')
      const data = response.data
      const deptsList = data.results || (Array.isArray(data) ? data : [])
      setAllDepartments(deptsList)
    } catch (err) {
      console.error('Ошибка загрузки всех отделов:', err)
    }
  }

  const fetchData = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      const params = {
        page: currentPage,
        page_size: pageSize
      }
      
      const response = await api.get('/api/departments/', { params })
      const data = response.data
      
      if (data.results) {
        setDepartments(data.results)
        setTotalPages(Math.ceil(data.count / pageSize))
        setTotalCount(data.count)
      } else if (Array.isArray(data)) {
        setDepartments(data)
        setTotalPages(1)
        setTotalCount(data.length)
      } else {
        setDepartments([])
        setTotalPages(1)
        setTotalCount(0)
      }
    } catch (err) {
      console.error('Ошибка загрузки отделов:', err)
      setError(err.response?.data?.detail || 'Ошибка загрузки данных')
      setDepartments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    try {
      const response = await api.get('/api/users/')
      const data = response.data
      const usersList = data.results || (Array.isArray(data) ? data : [])
      setUsers(usersList)
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err)
    }
  }

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const chartData = departments.map((dept) => {
    const count = users.filter((u) => u.department?.id === dept.id || u.department === dept.id).length
    return { name: dept.name, value: count }
  }).filter(item => item.value > 0)

  const barChartData = allDepartments.map((dept) => {
    const count = users.filter((u) => u.department?.id === dept.id || u.department === dept.id).length
    return { name: dept.name, employees: count, fullName: dept.name }
  })

  // Фильтрация отделов для поиска
  const filteredDepartments = (searchQuery ? allDepartments : departments).filter((dept) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      dept.name?.toLowerCase().includes(query) ||
      dept.description?.toLowerCase().includes(query) ||
      dept.manager_name?.toLowerCase().includes(query) ||
      (dept.manager && typeof dept.manager === 'object' && 
        `${dept.manager.first_name || ''} ${dept.manager.last_name || ''}`.toLowerCase().includes(query))
    )
  })

  // Пагинация для отфильтрованных результатов
  const filteredTotalPages = searchQuery ? Math.ceil(filteredDepartments.length / pageSize) : totalPages
  const filteredTotalCount = searchQuery ? filteredDepartments.length : totalCount
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedDepartments = searchQuery 
    ? filteredDepartments.slice(startIndex, endIndex)
    : filteredDepartments

  const handleCreate = () => {
    setEditingDept(null)
    setFormData({
      name: '',
      description: '',
      manager: ''
    })
    setShowModal(true)
  }

  const handleEdit = (dept) => {
    setEditingDept(dept)
    setFormData({
      name: dept.name || '',
      description: dept.description || '',
      manager: typeof dept.manager === 'object' ? dept.manager.id : dept.manager || ''
    })
    setShowModal(true)
  }

  const handleDeleteClick = (id, name) => {
    setDeleteConfirm({ isOpen: true, deptId: id, deptName: name })
  }

  const handleDeleteConfirm = async () => {
    const { deptId } = deleteConfirm
    if (!deptId) return

    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setError('')
    setDeleteConfirm({ isOpen: false, deptId: null, deptName: '' })
    
    setLoadingItems(prev => new Set(prev).add(deptId))

    try {
      await api.delete(`/api/departments/${deptId}/`)
      await fetchData()
      await fetchAllDepartments()
    } catch (err) {
      console.error('Ошибка удаления:', err)
      setError(err.response?.data?.detail || err.response?.data?.error?.message || 'Ошибка удаления отдела')
      await fetchData()
      await fetchAllDepartments()
    } finally {
      setLoadingItems(prev => {
        const next = new Set(prev)
        next.delete(deptId)
        return next
      })
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
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        manager: formData.manager || null
      }

      if (editingDept) {
        await api.patch(`/api/departments/${editingDept.id}/`, payload)
      } else {
        await api.post('/api/departments/', payload)
      }

      setShowModal(false)
      await fetchData()
      await fetchAllDepartments()
    } catch (err) {
      console.error('Ошибка сохранения:', err.response?.data)
      let errorMessage = 'Ошибка сохранения отдела'
      if (err.response?.data) {
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail
        } else {
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

  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin')

  return (
    <div className="departments-page">
      <div className="page-header">
        <h2>{t('departments.title')}</h2>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            + {t('departments.addDepartment')}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-info">
            <div className="stat-value">{totalCount}</div>
            <div className="stat-label">{t('departments.totalDepartments')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">{t('departments.totalEmployees')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👔</div>
          <div className="stat-info">
            <div className="stat-value">{managers.length}</div>
            <div className="stat-label">{t('departments.totalManagers')}</div>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="card">
          <h3>{t('departments.distribution')}</h3>
          {loading ? (
            <div className="placeholder">{t('departments.loading')}</div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
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
            <div className="placeholder">{t('departments.noData')}</div>
          )}
        </div>

        <div className="card">
          <h3>{t('departments.employeesCount')}</h3>
          {loading ? (
            <div className="placeholder">{t('departments.loading')}</div>
          ) : barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '10px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.fullName}</p>
                          <p style={{ margin: '5px 0 0 0', color: '#666' }}>
                            {t('departments.employees')}: <strong>{data.employees}</strong>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="employees" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="placeholder">{t('departments.noData')}</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t('departments.list')}</h3>
          <div className="search-section">
            <input
              type="text"
              placeholder={t('departments.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => {
                  setSearchQuery('')
                  setCurrentPage(1)
                }}
                title="Очистить поиск"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {loading && !searchQuery ? (
          <div className="placeholder">Загрузка...</div>
        ) : paginatedDepartments.length > 0 ? (
          <>
            {searchQuery && filteredDepartments.length > 0 && (
              <div style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px' }}>
                Найдено: {filteredTotalCount} {filteredTotalCount === 1 ? 'отдел' : filteredTotalCount < 5 ? 'отдела' : 'отделов'}
              </div>
            )}
            <div className="table">
              <div className="table-head">
                <span>{t('departments.id')}</span>
                <span>{t('departments.name')}</span>
                <span>{t('departments.description')}</span>
                <span>{t('departments.manager')}</span>
                <span>{t('departments.employeesCountShort')}</span>
                <span>{t('common.actions')}</span>
              </div>
              {paginatedDepartments.map((dept) => {
                const deptUsers = users.filter((u) => u.department?.id === dept.id || u.department === dept.id)
                const hasUsers = deptUsers.length > 0
                return (
                  <div key={dept.id}>
                    <div 
                      className="table-row"
                      onClick={(e) => {
                        if (e.target.closest('button')) return
                        if (hasUsers) toggleRow(dept.id)
                      }}
                      style={{ cursor: hasUsers ? 'pointer' : 'default' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {hasUsers && (
                          <span className="expand-icon">
                            {expandedRows.has(dept.id) ? '▼' : '▶'}
                          </span>
                        )}
                        {dept.id}
                      </span>
                      <span className="dept-name">{dept.name}</span>
                      <span className="dept-desc-cell">
                        {dept.description ? (
                          dept.description.length > 50 
                            ? `${dept.description.substring(0, 50)}...` 
                            : dept.description
                        ) : '—'}
                      </span>
                      <span>
                        {(() => {
                          if (dept.manager_name && typeof dept.manager_name === 'string' && dept.manager_name.trim()) {
                            return dept.manager_name
                          }
                          if (dept.manager && typeof dept.manager === 'object') {
                            const name = `${dept.manager.first_name || ''} ${dept.manager.last_name || ''}`.trim()
                            return name || '—'
                          }
                          return '—'
                        })()}
                      </span>
                      <span className="employee-count">
                        <span className="count-badge">{deptUsers.length}</span>
                      </span>
                      <span className="actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-small btn-primary"
                          onClick={() => handleEdit(dept)}
                          disabled={loadingItems.has(dept.id)}
                        >
                          {loadingItems.has(dept.id) ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span className="spinner-small"></span>
                              Загрузка...
                            </span>
                          ) : t('departments.edit')}
                        </button>
                        <button
                          className="btn-small btn-danger"
                          onClick={() => handleDeleteClick(dept.id, dept.name)}
                          disabled={loadingItems.has(dept.id)}
                        >
                          {loadingItems.has(dept.id) ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span className="spinner-small"></span>
                              {t('departments.loading')}
                            </span>
                          ) : t('departments.delete')}
                        </button>
                      </span>
                    </div>
                    {expandedRows.has(dept.id) && hasUsers && (
                      <div className="employees-row">
                        <div className="employees-content">
                          <h4>{t('departments.employeesInDepartment')} ({deptUsers.length}):</h4>
                          <div className="employees-list">
                            {deptUsers.map((user) => (
                              <div key={user.id} className="employee-item">
                                <div className="employee-info">
                                  <span className="employee-name">
                                    {user.first_name} {user.last_name}
                                  </span>
                                  <span className="employee-email">{user.email || '—'}</span>
                                  <span className="employee-role">
                                    {user.role === 'admin' ? t('departments.administrator') : 
                                     user.role === 'manager' ? t('departments.managerRole') : 
                                     user.role === 'employee' ? t('departments.employeeRole') : user.role}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {filteredTotalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={filteredTotalPages}
                totalCount={filteredTotalCount}
                pageSize={pageSize}
                onPageChange={(page) => {
                  setCurrentPage(page)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            )}
          </>
        ) : (
          <div className="placeholder">
            {searchQuery ? t('departments.nothingFound') : t('departments.noDepartments')}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDept ? t('departments.editDepartment') : t('departments.addDepartment')}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>{t('departments.name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t('departments.namePlaceholder')}
                />
              </div>
              <div className="form-group">
                <label>{t('departments.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder={t('departments.descriptionPlaceholder')}
                />
              </div>
              <div className="form-group">
                <label>{t('departments.manager')}</label>
                <select
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                >
                  <option value="">{t('departments.noManager')}</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.first_name} {manager.last_name} {manager.email ? `(${manager.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {t('departments.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span className="spinner-small"></span>
                      {t('departments.saving')}
                    </span>
                  ) : editingDept ? t('departments.save') : t('departments.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, deptId: null, deptName: '' })}
        onConfirm={handleDeleteConfirm}
        title={t('departments.deleteConfirm')}
        message={t('departments.deleteMessage', { name: deleteConfirm.deptName })}
        confirmText={t('departments.deleteButton')}
        cancelText={t('departments.cancel')}
      />
    </div>
  )
}
