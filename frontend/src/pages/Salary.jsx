import { useEffect, useState } from 'react'
import { createApiClient, getToken } from '../api/client'
import Pagination from '../components/Pagination'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import './Salary.css'

export default function Salary() {
  const [calculations, setCalculations] = useState([])
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)

  useEffect(() => {
    fetchCalculations(1)
    fetchUsers()
    fetchDepartments()
  }, [])

  useEffect(() => {
    fetchCalculations(currentPage)
  }, [currentPage, filterPeriod, filterUser, filterDept])

  const fetchCalculations = async (page = 1) => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')
    // Очищаем данные сразу, чтобы скрыть старую таблицу
    setCalculations([])

    try {
      const params = { page }
      if (filterPeriod) {
        // Преобразуем YYYY-MM в дату для фильтрации
        const periodDate = new Date(filterPeriod + '-01')
        params.period = filterPeriod
      }
      if (filterUser) params.user_id = filterUser
      
      const res = await api.get('/api/salary/', { params })
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
      
      // Фильтрация по отделу на клиенте
      if (filterDept && data.length > 0) {
        data = data.filter(salary => {
          return salary.user_department_id === parseInt(filterDept)
        })
      }
      
      // Обновляем totalCount после фильтрации
      if (filterDept) {
        setTotalCount(data.length)
        setTotalPages(Math.ceil(data.length / pageSize))
      }
      
      setCalculations(Array.isArray(data) ? data : [])
      
      // Убеждаемся, что totalCount правильно установлен
      if (data.length === 0) {
        setTotalCount(0)
        setTotalPages(1)
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err)
      setError(err.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    try {
      const res = await api.get('/api/users/')
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
      console.error('Ошибка загрузки сотрудников:', err)
    }
  }

  const fetchDepartments = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    try {
      const res = await api.get('/api/departments/')
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

  const handleCalculate = async () => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')

    try {
      const periodToCalculate = period || new Date().toISOString().slice(0, 7)
      await api.post('/api/salary/calculate/', {
        period: periodToCalculate,
        user_id: null,
      })
      await fetchCalculations(currentPage)
      setPeriod('')
    } catch (err) {
      console.error('Ошибка расчета:', err)
      setError(err.response?.data?.detail || err.response?.data?.error?.message || 'Ошибка расчета')
    } finally {
      setLoading(false)
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

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0 Сум'
    const formatted = new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
    return `${formatted} Сум`
  }

  const getUserName = (salaryItem) => {
    if (salaryItem.user_name) return salaryItem.user_name
    const user = users.find(u => u.id === salaryItem.user)
    if (!user) return '—'
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || '—'
  }

  const getUserDepartment = (salaryItem) => {
    if (salaryItem.user_department) return salaryItem.user_department
    return '—'
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Заголовок
    doc.setFontSize(18)
    doc.text('Расчет заработной платы', 14, 20)
    
    if (filterPeriod) {
      doc.setFontSize(12)
      doc.text(`Период: ${formatDate(filterPeriod + '-01')}`, 14, 30)
    }
    
    // Подготовка данных для таблицы
    const tableData = calculations.map(calc => [
      calc.id,
      getUserName(calc),
      getUserDepartment(calc),
      formatDate(calc.period),
      calc.base_hours || 0,
      formatCurrency(calc.base_amount || 0),
      formatCurrency(calc.penalties_amount || 0),
      formatCurrency(calc.total_amount || 0),
    ])
    
    autoTable(doc, {
      head: [['ID', 'Сотрудник', 'Отдел', 'Период', 'Часы', 'Базовая ЗП', 'Штрафы', 'Итого']],
      body: tableData,
      startY: filterPeriod ? 40 : 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    })
    
    // Итого
    const total = calculations.reduce((sum, calc) => sum + parseFloat(calc.total_amount || 0), 0)
    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(`Итого: ${formatCurrency(total)}`, 14, finalY)
    
    doc.save(`Зарплата_${filterPeriod || new Date().toISOString().slice(0, 7)}.pdf`)
  }

  const exportToExcel = () => {
    // Подготовка данных
    const worksheetData = [
      ['ID', 'Сотрудник', 'Отдел', 'Период', 'Отработано часов', 'Базовая ЗП', 'Переработки', 'Штрафы', 'Авансы', 'Итого', 'Статус']
    ]
    
    calculations.forEach(calc => {
      worksheetData.push([
        calc.id,
        getUserName(calc),
        getUserDepartment(calc),
        formatDate(calc.period),
        calc.base_hours || 0,
        calc.base_amount || 0,
        calc.overtime_amount || 0,
        calc.penalties_amount || 0,
        calc.advances_amount || 0,
        calc.total_amount || 0,
        calc.status === 'paid' ? 'Выплачена' : 'Рассчитана',
      ])
    })
    
    // Создание книги
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(worksheetData)
    
    // Установка ширины колонок
    ws['!cols'] = [
      { wch: 5 },   // ID
      { wch: 25 },  // Сотрудник
      { wch: 20 },  // Отдел
      { wch: 15 },  // Период
      { wch: 15 },  // Часы
      { wch: 15 },  // Базовая ЗП
      { wch: 15 },  // Переработки
      { wch: 15 },  // Штрафы
      { wch: 15 },  // Авансы
      { wch: 15 },  // Итого
      { wch: 15 },  // Статус
    ]
    
    XLSX.utils.book_append_sheet(wb, ws, 'Зарплата')
    
    // Экспорт
    const fileName = `Зарплата_${filterPeriod || new Date().toISOString().slice(0, 7)}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const clearFilters = () => {
    setFilterPeriod('')
    setFilterUser('')
    setFilterDept('')
    setCurrentPage(1)
  }

  return (
    <div className="salary-page">
      <div className="page-header">
        <h2>Заработная плата</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {calculations.length > 0 && (
            <>
              <button className="btn btn-secondary" onClick={exportToPDF} disabled={loading}>
                📄 PDF
              </button>
              <button className="btn btn-secondary" onClick={exportToExcel} disabled={loading}>
                📊 Excel
              </button>
            </>
          )}
          <button className="refresh-btn" onClick={() => fetchCalculations(currentPage)} disabled={loading}>
            Обновить
          </button>
        </div>
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
            {loading ? 'Расчет...' : 'Рассчитать за период'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filters-section">
          <h3>История расчетов</h3>
          <div className="filters-row">
            <input
              type="month"
              value={filterPeriod}
              onChange={(e) => {
                setFilterPeriod(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Период"
              className="filter-input"
            />
            <select
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value)
                setCurrentPage(1)
              }}
              className="filter-select"
            >
              <option value="">Все сотрудники</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value)
                setCurrentPage(1)
              }}
              className="filter-select"
            >
              <option value="">Все отделы</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {(filterPeriod || filterUser || filterDept) && (
              <button className="btn btn-secondary" onClick={clearFilters}>
                Сбросить
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="placeholder">Загрузка...</div>
        ) : calculations.length > 0 ? (
          <div className="table-container">
            <div className="table">
              <div className="table-head">
                <span></span>
                <span>ID</span>
                <span>Сотрудник</span>
                <span>Отдел</span>
                <span>Период</span>
                <span>Часы</span>
                <span>Базовая ЗП</span>
                <span>Штрафы</span>
                <span>Итого</span>
              </div>
              {calculations.map((calc) => (
                <div key={calc.id}>
                  <div 
                    className="table-row" 
                    onClick={() => calc.breakdown && calc.breakdown.length > 0 && toggleRow(calc.id)}
                    style={{ cursor: calc.breakdown && calc.breakdown.length > 0 ? 'pointer' : 'default' }}
                  >
                    <span className="expand-icon">
                      {calc.breakdown && calc.breakdown.length > 0 && (
                        expandedRows.has(calc.id) ? '▼' : '▶'
                      )}
                    </span>
                    <span>{calc.id}</span>
                    <span className="user-name">{getUserName(calc)}</span>
                    <span>{getUserDepartment(calc)}</span>
                    <span>{formatDate(calc.period)}</span>
                    <span>{calc.base_hours || 0} ч</span>
                    <span>{formatCurrency(calc.base_amount || 0)}</span>
                    <span className={calc.penalties_amount > 0 ? 'penalty' : ''}>
                      {formatCurrency(calc.penalties_amount || 0)}
                    </span>
                    <span className="total">{formatCurrency(calc.total_amount || 0)}</span>
                  </div>
                  {expandedRows.has(calc.id) && calc.breakdown && calc.breakdown.length > 0 && (
                    <div className="breakdown-row">
                      <div className="breakdown-content">
                        <h4>Детализация расчета:</h4>
                        <div className="breakdown-list">
                          {calc.breakdown.map((item, idx) => (
                            <div key={idx} className="breakdown-item">
                              <span className="breakdown-description">{item.description}</span>
                              <span className={`breakdown-amount ${item.amount < 0 ? 'negative' : 'positive'}`}>
                                {formatCurrency(Math.abs(item.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="placeholder">
            {filterPeriod || filterUser || filterDept 
              ? 'Нет данных за выбранный период' 
              : 'Нет данных о расчетах. Используйте кнопку "Рассчитать за период" для создания расчетов.'}
          </div>
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
