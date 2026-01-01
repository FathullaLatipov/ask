import { useEffect, useState } from 'react'
import { createApiClient, getToken } from '../api/client'
import Pagination from '../components/Pagination'
import './Salary.css'

export default function Salary() {
  const [calculations, setCalculations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)

  useEffect(() => {
    fetchCalculations(1)
  }, [])

  useEffect(() => {
    fetchCalculations(currentPage)
  }, [currentPage])

  const fetchCalculations = async (page = 1) => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      const res = await api.get('/api/salary/', { params: { page } })
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
      setCalculations(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleCalculate = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      await api.post('/api/salary/calculate/', {
        period: period || new Date().toISOString().slice(0, 7),
        user_id: null,
      })
      await fetchCalculations(currentPage)
      setPeriod('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка расчета')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="salary-page">
      <div className="page-header">
        <h2>Заработная плата</h2>
        <button className="refresh-btn" onClick={fetchCalculations} disabled={loading}>
          Обновить
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h3>Расчет зарплаты</h3>
        <div className="calculate-form">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Период (YYYY-MM)"
            className="input"
          />
          <button className="btn btn-primary" onClick={handleCalculate} disabled={loading}>
            Рассчитать
          </button>
        </div>
      </div>

      <div className="card">
        <h3>История расчетов</h3>
        {loading ? (
          <div className="placeholder">Загрузка...</div>
        ) : calculations.length > 0 ? (
          <div className="table">
            <div className="table-head">
              <span>ID</span>
              <span>Сотрудник</span>
              <span>Период</span>
              <span>Отработано часов</span>
              <span>Базовая сумма</span>
              <span>Штрафы</span>
              <span>Итого</span>
            </div>
            {calculations.map((calc) => (
              <div key={calc.id} className="table-row">
                <span>{calc.id}</span>
                <span>
                  {calc.user?.first_name} {calc.user?.last_name}
                </span>
                <span>{calc.period || '—'}</span>
                <span>{calc.base_hours || 0}</span>
                <span>{calc.base_amount || 0} ₽</span>
                <span className={calc.penalties_amount > 0 ? 'penalty' : ''}>
                  {calc.penalties_amount || 0} ₽
                </span>
                <span className="total">{calc.total_amount || 0} ₽</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="placeholder">Нет данных о расчетах</div>
        )}
      </div>

      {!loading && calculations.length > 0 && (
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
    </div>
  )
}



