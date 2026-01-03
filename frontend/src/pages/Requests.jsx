import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createApiClient, getToken } from '../api/client'
import ConfirmModal from '../components/ConfirmModal'
import Pagination from '../components/Pagination'
import './Requests.css'

export default function Requests() {
  const { t } = useTranslation()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(new Set())
  const [expandedRows, setExpandedRows] = useState(new Set())
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
    setError('')
    
    // Добавляем id в загрузку
    setLoadingItems(prev => new Set(prev).add(id))

    try {
      const response = await api.post(`/api/requests/${id}/approve/`, {})
      // Оптимизированное обновление - обновляем только измененный элемент
      setRequests(prevRequests => 
        prevRequests.map(req => req.id === id ? response.data : req)
      )
    } catch (err) {
      console.error('Ошибка утверждения:', err)
      setError(err.response?.data?.detail || err.response?.data?.error?.message || 'Ошибка утверждения')
      // Перезагружаем данные при ошибке
      await fetchRequests(currentPage)
    } finally {
      // Убираем id из загрузки
      setLoadingItems(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleReject = async (id) => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setError('')
    
    // Добавляем id в загрузку
    setLoadingItems(prev => new Set(prev).add(id))

    try {
      const response = await api.post(`/api/requests/${id}/reject/`, {})
      // Оптимизированное обновление - обновляем только измененный элемент
      setRequests(prevRequests => 
        prevRequests.map(req => req.id === id ? response.data : req)
      )
    } catch (err) {
      console.error('Ошибка отклонения:', err)
      setError(err.response?.data?.detail || err.response?.data?.error?.message || 'Ошибка отклонения')
      // Перезагружаем данные при ошибке
      await fetchRequests(currentPage)
    } finally {
      // Убираем id из загрузки
      setLoadingItems(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    fetchRequests(1)
  }, [filterStatus])

  useEffect(() => {
    fetchRequests(currentPage)
  }, [currentPage])

  const getTypeLabel = (type) => {
    const types = {
      vacation: t('requests.types.vacation'),
      sick_leave: t('requests.types.sickLeave'),
      advance: t('requests.types.advance'),
      day_off: t('requests.types.dayOff'),
    }
    return types[type] || type
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'pending', label: t('requests.statuses.pending') },
      approved: { class: 'approved', label: t('requests.statuses.approved') },
      rejected: { class: 'rejected', label: t('requests.statuses.rejected') },
    }
    return badges[status] || { class: '', label: status }
  }

  // Фильтрация заявок по поисковому запросу
  const filteredRequests = requests.filter((req) => {
    const matchesSearch = !searchQuery || 
      `${req.user_name || req.user?.first_name || ''} ${req.user?.last_name || ''} ${req.reason || ''} ${getTypeLabel(req.request_type)}`.toLowerCase().includes(searchQuery.toLowerCase())
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
      }

      // Добавляем reason только если он есть
      if (formData.reason && formData.reason.trim()) {
        payload.reason = formData.reason.trim()
      }

      // Добавляем end_date только если он нужен и есть
      if (formData.request_type !== 'advance' && formData.request_type !== 'day_off') {
        if (formData.end_date) {
          payload.end_date = formData.end_date
        }
      } else if (formData.end_date) {
        payload.end_date = formData.end_date
      }

      // Добавляем amount только для аванса
      if (formData.request_type === 'advance') {
        if (formData.amount) {
          payload.amount = parseFloat(formData.amount)
        }
      }

      await api.post('/api/requests/', payload)
      setShowModal(false)
      setFormData({
        request_type: 'vacation',
        start_date: '',
        end_date: '',
        amount: '',
        reason: ''
      })
      await fetchRequests(currentPage)
    } catch (err) {
      console.error('Ошибка создания заявки:', err.response?.data)
      let errorMessage = 'Ошибка создания заявки'
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
    setError('')
    setDeleteConfirm({ isOpen: false, requestId: null, requestType: '' })
    
    // Добавляем id в загрузку
    setLoadingItems(prev => new Set(prev).add(requestId))

    try {
      await api.delete(`/api/requests/${requestId}/`)
      // Оптимизированное обновление - удаляем элемент из списка
      setRequests(prevRequests => prevRequests.filter(req => req.id !== requestId))
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка удаления заявки')
      // Перезагружаем данные при ошибке
      await fetchRequests(currentPage)
    } finally {
      // Убираем id из загрузки
      setLoadingItems(prev => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
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

  return (
    <div className="requests-page">
      <div className="page-header">
        <h2>{t('requests.title')}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            + {t('requests.addRequest')}
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
            <option value="">{t('requests.allStatuses')}</option>
            <option value="pending">{t('requests.statuses.pending')}</option>
            <option value="approved">{t('requests.statuses.approved')}</option>
            <option value="rejected">{t('requests.statuses.rejected')}</option>
          </select>
          <div className="search-box">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder={t('requests.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
        {filteredRequests.length !== requests.length && (
          <div style={{ marginTop: '8px', color: '#64748b', fontSize: '14px' }}>
            {t('requests.found')}: {filteredRequests.length} {t('requests.of')} {requests.length}
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="placeholder">{t('requests.loading')}</div>
        ) : filteredRequests.length > 0 ? (
          <div className="table">
            <div className="table-head">
              <span>{t('requests.id')}</span>
              <span>{t('requests.type')}</span>
              <span>{t('requests.employee')}</span>
              <span>{t('requests.amountSum')}</span>
              <span>{t('requests.startDate')}</span>
              <span>{t('requests.endDate')}</span>
              <span>{t('requests.status')}</span>
              <span>{t('common.actions')}</span>
              <span>{t('requests.delete')}</span>
            </div>
            {filteredRequests.map((req) => {
              const statusBadge = getStatusBadge(req.status)
              const hasReason = req.reason && req.reason.trim().length > 0
              return (
                <div key={req.id}>
                  <div 
                    className="table-row"
                    onClick={(e) => {
                      // Не раскрываем если клик был на кнопке
                      if (e.target.closest('button')) return
                      if (hasReason) toggleRow(req.id)
                    }}
                    style={{ cursor: hasReason ? 'pointer' : 'default' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {hasReason && (
                        <span className="expand-icon">
                          {expandedRows.has(req.id) ? '▼' : '▶'}
                        </span>
                      )}
                      {req.id}
                    </span>
                    <span>{getTypeLabel(req.request_type)}</span>
                    <span>
                      {req.user_name || (req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() : '—')}
                    </span>
                    <span>
                      {req.request_type === 'advance' && req.amount 
                        ? `${parseFloat(req.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Сум`
                        : '—'}
                    </span>
                    <span>{req.start_date || '—'}</span>
                    <span>{req.end_date || '—'}</span>
                    <span>
                      <span className={`status-badge ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </span>
                    <span className="actions" onClick={(e) => e.stopPropagation()}>
                      {req.status === 'pending' && (
                        <>
                          <button
                            className="btn-small btn-success"
                            onClick={() => handleApprove(req.id)}
                            disabled={loadingItems.has(req.id)}
                          >
                            {loadingItems.has(req.id) ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span className="spinner-small"></span>
                                Загрузка...
                              </span>
                            ) : t('requests.approve')}
                          </button>
                          <button
                            className="btn-small btn-danger"
                            onClick={() => handleReject(req.id)}
                            disabled={loadingItems.has(req.id)}
                          >
                            {loadingItems.has(req.id) ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span className="spinner-small"></span>
                                {t('requests.loadingAction')}
                              </span>
                            ) : t('requests.reject')}
                          </button>
                        </>
                      )}
                      {req.status !== 'pending' && <span className="muted">—</span>}
                    </span>
                    <span className="actions" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn-small btn-danger" 
                        onClick={() => handleDeleteClick(req.id, getTypeLabel(req.request_type))}
                        disabled={loadingItems.has(req.id) || req.status !== 'pending'}
                      >
                        {t('requests.delete')}
                      </button>
                    </span>
                  </div>
                  {expandedRows.has(req.id) && hasReason && (
                    <div className="reason-row">
                      <div className="reason-content">
                        <h4>{t('requests.reason')}:</h4>
                        <p>{req.reason}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="placeholder">{t('requests.noRequests')}</div>
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
              <h3>{t('requests.createTitle')}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>{t('requests.typeRequired')}</label>
                <select
                  value={formData.request_type}
                  onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                  required
                >
                  <option value="vacation">{t('requests.types.vacation')}</option>
                  <option value="sick_leave">{t('requests.types.sickLeave')}</option>
                  <option value="day_off">{t('requests.types.dayOff')}</option>
                  <option value="advance">{t('requests.types.advance')}</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('requests.startDateRequired')}</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('requests.endDateRequired')} {formData.request_type !== 'advance' && formData.request_type !== 'day_off' ? '*' : ''}</label>
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
                  <label>{t('requests.advanceAmount')}</label>
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
                <label>{t('requests.reasonLabel')}</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontFamily: 'inherit', fontSize: '14px' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {t('requests.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? t('requests.creating') : t('requests.create')}
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
        title={t('requests.deleteConfirm')}
        message={t('requests.deleteMessage', { type: deleteConfirm.requestType })}
        confirmText={t('requests.deleteButton')}
        cancelText={t('requests.cancel')}
      />
    </div>
  )
}



