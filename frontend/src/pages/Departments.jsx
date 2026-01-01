import { useEffect, useState } from 'react'
import { createApiClient, getToken } from '../api/client'
import ConfirmModal from '../components/ConfirmModal'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import './Departments.css'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Departments() {
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager: ''
  })
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, deptId: null, deptName: '' })

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

      // Функция для извлечения данных из ответа API
      const extractData = (responseData) => {
        if (!responseData) return []
        if (Array.isArray(responseData)) return responseData
        if (responseData.results) return responseData.results
        if (responseData.data) return responseData.data
        return []
      }

      if (deptsRes.status === 'fulfilled') {
        const data = extractData(deptsRes.value.data)
        setDepartments(Array.isArray(data) ? data : [])
      }

      if (usersRes.status === 'fulfilled') {
        const data = extractData(usersRes.value.data)
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
    setLoading(true)
    setError('')
    setDeleteConfirm({ isOpen: false, deptId: null, deptName: '' })

    try {
      await api.delete(`/api/departments/${deptId}/`)
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка удаления отдела')
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
        name: formData.name,
        description: formData.description,
        manager: formData.manager || null
      }

      if (editingDept) {
        await api.patch(`/api/departments/${editingDept.id}/`, payload)
      } else {
        await api.post('/api/departments/', payload)
      }

      setShowModal(false)
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(', ') || 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin')

  return (
    <div className="departments-page">
      <div className="page-header">
        <h2>Отделы</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            + Добавить отдел
          </button>
          <button className="refresh-btn" onClick={fetchData} disabled={loading}>
            Обновить
          </button>
        </div>
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
                      <div>
                        <h4>{dept.name}</h4>
                        <span className="dept-count">{deptUsers.length} сотрудников</span>
                      </div>
                      <div className="dept-actions">
                        <button 
                          className="btn-small btn-primary" 
                          onClick={() => handleEdit(dept)}
                          disabled={loading}
                        >
                          Редактировать
                        </button>
                        <button 
                          className="btn-small btn-danger" 
                          onClick={() => handleDeleteClick(dept.id, dept.name)}
                          disabled={loading}
                        >
                          Удалить
                        </button>
                      </div>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDept ? 'Редактировать отдел' : 'Добавить отдел'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontFamily: 'inherit', fontSize: '14px' }}
                />
              </div>
              <div className="form-group">
                <label>Руководитель</label>
                <select
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                >
                  <option value="">Без руководителя</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.first_name} {manager.last_name} ({manager.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Сохранение...' : editingDept ? 'Сохранить' : 'Создать'}
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
        title="Удаление отдела"
        message={`Вы уверены, что хотите удалить отдел "${deleteConfirm.deptName}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
      />
    </div>
  )
}



