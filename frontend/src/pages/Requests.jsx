import { useEffect, useState } from 'react'
import { createApiClient, getToken } from '../api/client'
import './Requests.css'

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      const params = {}
      if (filterStatus) params.status = filterStatus

      const res = await api.get('/api/requests/', { params })
      const data = res.data?.data || res.data || []
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
      await fetchRequests()
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
      await fetchRequests()
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка отклонения')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [filterStatus])

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
        <button className="refresh-btn" onClick={fetchRequests} disabled={loading}>
          Обновить
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="filters">
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
      </div>

      <div className="card">
        {loading ? (
          <div className="placeholder">Загрузка...</div>
        ) : requests.length > 0 ? (
          <div className="table">
            <div className="table-head">
              <span>ID</span>
              <span>Тип</span>
              <span>Сотрудник</span>
              <span>Дата начала</span>
              <span>Дата окончания</span>
              <span>Статус</span>
              <span>Действия</span>
            </div>
            {requests.map((req) => {
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
                </div>
              )
            })}
          </div>
        ) : (
          <div className="placeholder">Нет заявок</div>
        )}
      </div>
    </div>
  )
}


