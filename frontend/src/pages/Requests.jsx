import { useEffect, useState } from 'react'
import { createApiClient, getToken } from '../api/client'
import ConfirmModal from '../components/ConfirmModal'
import Pagination from '../components/Pagination'
import './Requests.css'

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)
  const [formData, setFormData] = useState({
    request_type: 'vacation',
    start_date: '',
    end_date: '',
    amount: '',
    reason: ''
  })
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, requestId: null, requestType: '' })

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async (page = 1) => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      const params = { page }
      if (filterStatus) params.status = filterStatus

      const res = await api.get('/api/requests/', { params })
      // Обрабатываем разные форматы ответа
      let data = []
      if (res.data) {
        if (Array.isArray(res.data)) {
          data = res.data
          setTotalCount(res.data.length)
          setTotalPages(1)
        } else if (res.data.results) {
          data = res.data.results
          setTotalCount(res.data.count || res.data.results.length)
          const count = res.data.count || res.data.results.length
          setTotalPages(Math.ceil(count / pageSize))
        } else if (res.data.data) {
          data = res.data.data
          setTotalCount(Array.isArray(res.data.data) ? res.data.data.length : 0)
          setTotalPages(1)
        }
      }
      setRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки заявок')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      await api.post(`/api/requests/${id}/approve/`)
      await fetchRequests(currentPage)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка утверждения')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (id) => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      await api.post(`/api/requests/${id}/reject/`)
      await fetchRequests(currentPage)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка отклонения')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    fetchRequests(1)
  }, [filterStatus])

  useEffect(() => {
    fetchRequests(currentPage)
  }, [currentPage])

  // Фильтрация заявок по поисковому запросу
  const filteredRequests = requests.filter((req) => {
    const matchesSearch = !searchQuery || 
      `${req.user?.first_name || ''} ${req.user?.last_name || ''} ${req.reason || ''} ${getTypeLabel(req.request_type)}`.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !filterStatus || req.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleCreate = () => {
    setFormData({
      request_type: 'vacation',
      start_date: '',
      end_date: '',
      amount: '',
      reason: ''
    })
    setShowModal(true)
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
        request_type: formData.request_type,
        start_date: formData.start_date,
        reason: formData.reason
      }

      if (formData.end_date) {
        payload.end_date = formData.end_date
      }

      if (formData.request_type === 'advance' && formData.amount) {
        payload.amount = parseFloat(formData.amount)
      }

      await api.post('/api/requests/', payload)
      setShowModal(false)
      await fetchRequests(currentPage)
    } catch (err) {
      setError(err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(', ') || 'Ошибка создания заявки')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (id, type) => {
    const typeLabel = getTypeLabel(type)
    setDeleteConfirm({ isOpen: true, requestId: id, requestType: typeLabel })
  }

  const handleDeleteConfirm = async () => {
    const { requestId } = deleteConfirm
    if (!requestId) return

    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')
    setDeleteConfirm({ isOpen: false, requestId: null, requestType: '' })

    try {
      await api.delete(`/api/requests/${requestId}/`)
      await fetchRequests(currentPage)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка удаления заявки')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'pending', label: 'На рассмотрении' },
      approved: { class: 'approved', label: 'Утверждена' },
      rejected: { class: 'rejected', label: 'Отклонена' },
    }
    return badges[status] || { class: '', label: status }
  }

  const getTypeLabel = (type) => {
    const types = {
      vacation: 'Отпуск',
      sick_leave: 'Больничный',
      advance: 'Аванс',
    }
    return types[type] || type
  }

  return (
    <div className="requests-page">
      <div className="page-header">
        <h2>Заявки</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            + Создать заявку
          </button>
          <button className="refresh-btn" onClick={fetchRequests} disabled={loading}>
            Обновить
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="search-filters-section">
        <div className="filters-row">
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
          <div className="search-box">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Поиск по сотруднику, причине, типу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
        {filteredRequests.length !== requests.length && (
          <div style={{ marginTop: '8px', color: '#64748b', fontSize: '14px' }}>
            Найдено: {filteredRequests.length} из {requests.length}
          </div>
        )}
      </div>

      <div className="card">
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
              <span>Действия</span>
              <span>Удалить</span>
            </div>
            {filteredRequests.map((req) => {
              const statusBadge = getStatusBadge(req.status)
              return (
                <div key={req.id} className="table-row">
                  <span>{req.id}</span>
                  <span>{getTypeLabel(req.request_type)}</span>
                  <span>
                    {req.user?.first_name} {req.user?.last_name}
                  </span>
                  <span>{req.start_date || '—'}</span>
                  <span>{req.end_date || '—'}</span>
                  <span>
                    <span className={`status-badge ${statusBadge.class}`}>
                      {statusBadge.label}
                    </span>
                  </span>
                  <span className="actions">
                    {req.status === 'pending' && (
                      <>
                        <button
                          className="btn-small btn-success"
                          onClick={() => handleApprove(req.id)}
                          disabled={loading}
                        >
                          Утвердить
                        </button>
                        <button
                          className="btn-small btn-danger"
                          onClick={() => handleReject(req.id)}
                          disabled={loading}
                        >
                          Отклонить
                        </button>
                      </>
                    )}
                    {req.status !== 'pending' && <span className="muted">—</span>}
                  </span>
                  <span className="actions">
                    <button 
                      className="btn-small btn-danger" 
                      onClick={() => handleDeleteClick(req.id, getTypeLabel(req.request_type))}
                      disabled={loading || req.status !== 'pending'}
                    >
                      Удалить
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="placeholder">Нет заявок</div>
        )}
      </div>

      {!loading && filteredRequests.length > 0 && (
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
              <h3>Создать заявку</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Тип заявки *</label>
                <select
                  value={formData.request_type}
                  onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                  required
                >
                  <option value="vacation">Отпуск</option>
                  <option value="sick_leave">Больничный</option>
                  <option value="day_off">Выходной</option>
                  <option value="advance">Аванс</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Дата начала *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Дата окончания {formData.request_type !== 'advance' && formData.request_type !== 'day_off' ? '*' : ''}</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required={formData.request_type !== 'advance' && formData.request_type !== 'day_off'}
                  />
                </div>
              </div>
              {formData.request_type === 'advance' && (
                <div className="form-group">
                  <label>Сумма аванса *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label>Причина</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontFamily: 'inherit', fontSize: '14px' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, requestId: null, requestType: '' })}
        onConfirm={handleDeleteConfirm}
        title="Удаление заявки"
        message={`Вы уверены, что хотите удалить заявку "${deleteConfirm.requestType}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
      />
    </div>
  )
}



