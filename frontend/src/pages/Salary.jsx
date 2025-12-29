import { useEffect, useState } from 'react'
import { createApiClient, getToken } from '../api/client'
import './Salary.css'

export default function Salary() {
  const [calculations, setCalculations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('')

  useEffect(() => {
    fetchCalculations()
  }, [])

  const fetchCalculations = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      const res = await api.get('/api/salary/')
      const data = res.data?.data || res.data || []
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
      await fetchCalculations()
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
              <span>Базовая ЗП</span>
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
                <span>{calc.total_hours || 0}</span>
                <span>{calc.base_salary || 0} ₽</span>
                <span className={calc.penalties > 0 ? 'penalty' : ''}>
                  {calc.penalties || 0} ₽
                </span>
                <span className="total">{calc.total_amount || 0} ₽</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="placeholder">Нет данных о расчетах</div>
        )}
      </div>
    </div>
  )
}


