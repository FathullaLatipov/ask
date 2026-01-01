import { useEffect, useState, useRef } from 'react'
import { createApiClient, getToken } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Pagination from '../components/Pagination'
import ConfirmModal from '../components/ConfirmModal'
import './Attendance.css'

export default function Attendance() {
  const [currentStatus, setCurrentStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [activeUsers, setActiveUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', onConfirm: null })
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    fetchData(1)
    fetchLocation()
    
    // Таймер для обновления времени в реальном времени
    timerRef.current = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Обновляем статус каждые 30 секунд если пользователь на работе
  useEffect(() => {
    if (!currentStatus?.is_checked_in) return

    const statusInterval = setInterval(() => {
      updateCurrentStatus()
    }, 30000)

    return () => clearInterval(statusInterval)
  }, [currentStatus?.is_checked_in])

  useEffect(() => {
    // Убеждаемся, что currentPage - это число
    const pageNum = typeof currentPage === 'number' ? currentPage : parseInt(currentPage) || 1
    fetchData(pageNum)
  }, [currentPage, filterStartDate, filterEndDate])

  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
          setLocationError('')
        },
        (err) => {
          setLocationError('Не удалось получить геолокацию. Отметка будет без координат.')
          console.warn('Geolocation error:', err)
        },
        { timeout: 5000, enableHighAccuracy: false }
      )
    } else {
      setLocationError('Геолокация не поддерживается вашим браузером.')
    }
  }

  const updateCurrentStatus = async (preserveCheckedIn = false) => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    try {
      const res = await api.get('/api/attendance/current/')
      if (res && res.data) {
        // Если preserveCheckedIn = true и текущий статус показывает, что мы на работе,
        // не перезаписываем статус обратно на false
        if (preserveCheckedIn) {
          setCurrentStatus(prev => {
            if (prev && prev.is_checked_in === true && res.data.is_checked_in === false) {
              // Сохраняем статус "на работе"
              return prev
            }
            return res.data
          })
        } else {
          setCurrentStatus(res.data)
        }
      }
    } catch (err) {
      console.error('Ошибка обновления статуса:', err)
      // Пытаемся обновить через fetchData
      try {
        const statusRes = await api.get('/api/attendance/current/')
        if (statusRes && statusRes.data) {
          if (preserveCheckedIn) {
            setCurrentStatus(prev => {
              if (prev && prev.is_checked_in === true && statusRes.data.is_checked_in === false) {
                return prev
              }
              return statusRes.data
            })
          } else {
            setCurrentStatus(statusRes.data)
          }
        }
      } catch (e) {
        console.error('Повторная ошибка обновления статуса:', e)
      }
    }
  }

  const fetchData = async (page = 1) => {
    const token = getToken()
    if (!token) return

    const api = createApiClient(token)
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Убеждаемся, что page - это число
      const pageNumber = typeof page === 'number' ? page : parseInt(page) || 1
      
      // Формируем параметры запроса - убеждаемся, что все значения правильного типа
      const params = {
        page: Number(pageNumber)
      }
      if (filterStartDate && typeof filterStartDate === 'string') {
        params.start_date = filterStartDate
      }
      if (filterEndDate && typeof filterEndDate === 'string') {
        params.end_date = filterEndDate
      }

      // Сначала получаем статус, чтобы знать, на работе ли пользователь
      const statusRes = await Promise.allSettled([api.get('/api/attendance/current/')]).then(res => res[0])
      
      // Затем получаем остальные данные параллельно
      const [historyRes, activeRes] = await Promise.allSettled([
        api.get('/api/attendance/', { params }),
        api.get('/api/attendance/active/'),
      ])

      if (statusRes.status === 'fulfilled') {
        const newStatus = statusRes.value.data
        setCurrentStatus(newStatus)
        
        // Если пользователь на работе, убеждаемся, что он в списке активных
        if (newStatus && newStatus.is_checked_in === true && newStatus.checkin_time) {
          // Добавляем пользователя в список активных, если его там нет
          setTimeout(async () => {
            try {
              const meRes = await api.get('/api/users/me/')
              if (meRes && meRes.data) {
                const activeUser = {
                  user_id: meRes.data.id,
                  full_name: `${meRes.data.first_name || ''} ${meRes.data.last_name || ''}`.trim() || meRes.data.email || 'Вы',
                  department: meRes.data.department?.name || (typeof meRes.data.department === 'object' ? meRes.data.department?.name : '—') || '—',
                  checkin_time: newStatus.checkin_time,
                  hours_worked: newStatus.hours_worked || 0
                }
                setActiveUsers(prev => {
                  const exists = prev.some(u => u.user_id === activeUser.user_id)
                  if (exists) {
                    return prev.map(u => u.user_id === activeUser.user_id ? activeUser : u)
                  }
                  return [...prev, activeUser]
                })
              }
            } catch (err) {
              console.warn('Не удалось получить информацию о пользователе:', err)
            }
          }, 100)
        }
      }

      if (historyRes.status === 'fulfilled') {
        // Обрабатываем разные форматы ответа
        let data = []
        if (historyRes.value.data) {
          if (Array.isArray(historyRes.value.data)) {
            data = historyRes.value.data
            setTotalCount(historyRes.value.data.length)
            setTotalPages(1)
          } else if (historyRes.value.data.results) {
            data = historyRes.value.data.results
            setTotalCount(historyRes.value.data.count || historyRes.value.data.results.length)
            const count = historyRes.value.data.count || historyRes.value.data.results.length
            setTotalPages(Math.ceil(count / pageSize))
          } else if (historyRes.value.data.data) {
            data = historyRes.value.data.data
            setTotalCount(Array.isArray(historyRes.value.data.data) ? historyRes.value.data.data.length : 0)
            setTotalPages(1)
          }
        }
        setHistory(data)
      }

      if (activeRes.status === 'fulfilled') {
        // Обрабатываем разные форматы ответа
        let data = []
        const responseData = activeRes.value.data
        if (responseData) {
          if (Array.isArray(responseData)) {
            data = responseData
          } else if (responseData.results) {
            data = responseData.results
          } else if (responseData.data) {
            data = responseData.data
          }
        }
        
        // Если текущий статус показывает, что пользователь на работе,
        // но его нет в списке активных, добавляем его
        const currentStatusData = statusRes.status === 'fulfilled' ? statusRes.value.data : currentStatus
        if (currentStatusData && currentStatusData.is_checked_in === true && currentStatusData.checkin_time) {
          // Проверяем, есть ли текущий пользователь в списке
          // Backend должен уже включить его, но на всякий случай проверяем
          (async () => {
            try {
              const meRes = await api.get('/api/users/me/')
              if (meRes && meRes.data) {
                const currentUserExists = data.some(u => u.user_id === meRes.data.id)
                if (!currentUserExists) {
                  // Если пользователя нет в списке, добавляем его
                  const activeUser = {
                    user_id: meRes.data.id,
                    full_name: `${meRes.data.first_name || ''} ${meRes.data.last_name || ''}`.trim() || meRes.data.email || 'Вы',
                    department: meRes.data.department?.name || (typeof meRes.data.department === 'object' ? meRes.data.department?.name : '—') || '—',
                    checkin_time: currentStatusData.checkin_time,
                    hours_worked: currentStatusData.hours_worked || 0
                  }
                  setActiveUsers([...data, activeUser])
                } else {
                  setActiveUsers(data)
                }
              } else {
                setActiveUsers(data)
              }
            } catch (err) {
              console.warn('Не удалось получить информацию о пользователе:', err)
              setActiveUsers(data)
            }
          })()
        } else {
          setActiveUsers(data)
        }
      } else if (activeRes.status === 'rejected') {
        // Если запрос активных сотрудников не удался (например, 403 для employee),
        // но текущий пользователь на работе, добавляем его в список
        if (currentStatus?.is_checked_in && currentStatus?.checkin_time) {
          try {
            const meRes = await api.get('/api/users/me/')
            if (meRes && meRes.data) {
              const checkinTime = new Date(currentStatus.checkin_time)
              const hoursWorked = (new Date() - checkinTime) / (1000 * 60 * 60)
              setActiveUsers([{
                user_id: meRes.data.id,
                full_name: `${meRes.data.first_name || ''} ${meRes.data.last_name || ''}`.trim() || meRes.data.email || 'Вы',
                department: meRes.data.department?.name || (typeof meRes.data.department === 'object' ? meRes.data.department?.name : '—') || '—',
                checkin_time: currentStatus.checkin_time,
                hours_worked: Math.round(hoursWorked * 100) / 100
              }])
            }
          } catch (err) {
            console.warn('Не удалось получить информацию о пользователе для списка активных:', err)
            // Если не удалось получить данные пользователя, все равно показываем его если он на работе
            if (currentStatus.is_checked_in) {
              const checkinTime = new Date(currentStatus.checkin_time)
              const hoursWorked = (new Date() - checkinTime) / (1000 * 60 * 60)
              setActiveUsers([{
                user_id: 'current',
                full_name: 'Вы',
                department: '—',
                checkin_time: currentStatus.checkin_time,
                hours_worked: Math.round(hoursWorked * 100) / 100
              }])
            }
          }
        } else {
          setActiveUsers([])
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleCheck = async (type) => {
    setConfirmModal({
      isOpen: true,
      type,
      onConfirm: async () => {
        const token = getToken()
        if (!token) return

        const api = createApiClient(token)
        setLoading(true)
        setError('')
        setSuccess('')
        setConfirmModal({ isOpen: false, type: '', onConfirm: null })

        // Получаем геолокацию если доступна
        let latitude = null
        let longitude = null
        
        if (location) {
          latitude = location.latitude
          longitude = location.longitude
        } else {
          // Пытаемся получить геолокацию еще раз
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
            })
            latitude = position.coords.latitude
            longitude = position.coords.longitude
          } catch (err) {
            console.warn('Could not get location:', err)
          }
        }

        const payload = {
          photo_url: null, // В реальном проекте здесь будет загрузка фото
          latitude: latitude,
          longitude: longitude,
          face_verified: false, // В реальном проекте будет проверка лица
          location_verified: !!latitude && !!longitude,
        }

        try {
          const res = await api.post(`/api/attendance/${type}/`, payload)
          
          if (type === 'checkin') {
            setSuccess(`Приход отмечен в ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`)
          } else {
            setSuccess(`Уход отмечен в ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`)
          }
          
          // Немедленно обновляем статус для активации кнопки ухода
          if (res && res.data) {
            if (type === 'checkin') {
              const checkinTime = res.data.checkin_time || new Date().toISOString()
              // Обновляем статус СРАЗУ и сохраняем его
              const newStatus = {
                is_checked_in: true,
                checkin_time: checkinTime,
                hours_worked: 0,
                attendance_id: res.data.id
              }
              setCurrentStatus(newStatus)
              
              // Сразу добавляем пользователя в список активных
              let newActiveUser = null
              try {
                const meRes = await api.get('/api/users/me/')
                if (meRes && meRes.data) {
                  newActiveUser = {
                    user_id: meRes.data.id,
                    full_name: `${meRes.data.first_name || ''} ${meRes.data.last_name || ''}`.trim() || meRes.data.email || 'Вы',
                    department: meRes.data.department?.name || (typeof meRes.data.department === 'object' ? meRes.data.department?.name : '—') || '—',
                    checkin_time: checkinTime,
                    hours_worked: 0
                  }
                  // Добавляем в список активных, если его там еще нет
                  setActiveUsers(prev => {
                    const exists = prev.some(u => u.user_id === newActiveUser.user_id)
                    if (exists) {
                      return prev.map(u => u.user_id === newActiveUser.user_id ? newActiveUser : u)
                    }
                    return [...prev, newActiveUser]
                  })
                }
              } catch (err) {
                console.warn('Не удалось получить информацию о пользователе:', err)
                // Если не удалось получить данные пользователя, все равно добавляем его в список
                newActiveUser = {
                  user_id: res.data.user || 'current',
                  full_name: 'Вы',
                  department: '—',
                  checkin_time: checkinTime,
                  hours_worked: 0
                }
                setActiveUsers(prev => {
                  const exists = prev.some(u => String(u.user_id) === String(newActiveUser.user_id))
                  if (exists) {
                    return prev.map(u => String(u.user_id) === String(newActiveUser.user_id) ? newActiveUser : u)
                  }
                  return [...prev, newActiveUser]
                })
              }
              
              // Обновляем данные с задержкой, чтобы дать БД время обновиться
              // НО сохраняем текущий статус и активного пользователя
              setTimeout(async () => {
                try {
                  const pageNumber = 1
                  const params = { page: Number(pageNumber) }
                  if (filterStartDate && typeof filterStartDate === 'string') {
                    params.start_date = filterStartDate
                  }
                  if (filterEndDate && typeof filterEndDate === 'string') {
                    params.end_date = filterEndDate
                  }
                  
                  // Обновляем только историю
                  const historyRes = await api.get('/api/attendance/', { params })
                  if (historyRes && historyRes.data) {
                    let data = []
                    if (Array.isArray(historyRes.data)) {
                      data = historyRes.data
                      setTotalCount(historyRes.data.length)
                      setTotalPages(1)
                    } else if (historyRes.data.results) {
                      data = historyRes.data.results
                      setTotalCount(historyRes.data.count || historyRes.data.results.length)
                      const count = historyRes.data.count || historyRes.data.results.length
                      setTotalPages(Math.ceil(count / pageSize))
                    } else if (historyRes.data.data) {
                      data = historyRes.data.data
                      setTotalCount(Array.isArray(historyRes.data.data) ? historyRes.data.data.length : 0)
                      setTotalPages(1)
                    }
                    setHistory(data)
                  }
                  
                  // Обновляем список активных, но сохраняем текущего пользователя
                  const activeRes = await api.get('/api/attendance/active/')
                  if (activeRes && activeRes.data) {
                    let data = []
                    const responseData = activeRes.data
                    if (Array.isArray(responseData)) {
                      data = responseData
                    } else if (responseData.results) {
                      data = responseData.results
                    } else if (responseData.data) {
                      data = responseData.data
                    }
                    // Если текущего пользователя нет в новом списке, добавляем его
                    if (newActiveUser) {
                      const currentUserExists = data.some(u => u.user_id === newActiveUser.user_id)
                      if (!currentUserExists) {
                        data = [...data, newActiveUser]
                      }
                    }
                    setActiveUsers(data)
                  }
                  
                  // Обновляем статус, но сохраняем is_checked_in = true
                  const statusRes = await api.get('/api/attendance/current/')
                  if (statusRes && statusRes.data) {
                    setCurrentStatus(prev => {
                      // Если предыдущий статус показывал, что мы на работе, сохраняем это
                      if (prev && prev.is_checked_in === true) {
                        return {
                          ...statusRes.data,
                          is_checked_in: true // Гарантируем, что статус остается true
                        }
                      }
                      return statusRes.data
                    })
                  }
                } catch (err) {
                  console.warn('Ошибка при обновлении данных:', err)
                }
              }, 800)
            } else if (type === 'checkout') {
              setCurrentStatus({
                is_checked_in: false,
                checkin_time: null,
                hours_worked: res.data.total_hours || 0,
                attendance_id: null
              })
              // Удаляем пользователя из списка активных
              try {
                const meRes = await api.get('/api/users/me/')
                if (meRes && meRes.data) {
                  setActiveUsers(prev => prev.filter(u => u.user_id !== meRes.data.id))
                }
              } catch (err) {
                console.warn('Не удалось получить информацию о пользователе:', err)
              }
              
              // Обновляем данные после отметки ухода
              setTimeout(async () => {
                await fetchData(1)
                setCurrentPage(1)
              }, 500)
            }
          }
          
          // Скрываем сообщение об успехе через 3 секунды
          setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
          const errorData = err.response?.data
          if (errorData?.error) {
            setError(errorData.error.message || 'Ошибка при отправке отметки')
          } else {
            setError(err.response?.data?.detail || err.message || 'Ошибка при отправке отметки')
          }
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTimeOnly = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const formatHours = (hours) => {
    if (hours === null || hours === undefined) return '—'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}ч ${m}м`
  }

  const getWorkedTime = () => {
    if (!currentStatus?.is_checked_in || !currentStatus?.checkin_time) return '0ч 0м'
    const checkinTime = new Date(currentStatus.checkin_time)
    const diff = currentTime - checkinTime
    const hours = diff / (1000 * 60 * 60)
    return formatHours(hours)
  }

  // Формируем данные для графика - группируем по дням и берем последние 7 дней
  const chartData = (() => {
    // Фильтруем только завершенные дни (с checkout_time и total_hours)
    const completedDays = history.filter((item) => item.checkout_time && item.total_hours)
    
    // Группируем по дням (дата без времени)
    const daysMap = {}
    completedDays.forEach((item) => {
      if (item.checkin_time) {
        const date = new Date(item.checkin_time)
        const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
        
        if (!daysMap[dateKey]) {
          daysMap[dateKey] = {
            date: date,
            hours: 0
          }
        }
        // Суммируем часы за день (если несколько записей в один день)
        daysMap[dateKey].hours += parseFloat(item.total_hours) || 0
      }
    })
    
    // Преобразуем в массив и сортируем по дате (новые сначала)
    const daysArray = Object.values(daysMap)
      .sort((a, b) => b.date - a.date)
      .slice(0, 7) // Берем последние 7 дней
      .reverse() // Переворачиваем для отображения (старые слева, новые справа)
      .map((day) => ({
        date: day.date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        hours: Math.round(day.hours * 100) / 100 // Округляем до 2 знаков
      }))
    
    return daysArray
  })()

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h2>Учет рабочего времени</h2>
        <button className="refresh-btn" onClick={fetchData} disabled={loading}>
          Обновить
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}
      {locationError && <div className="info-banner">{locationError}</div>}

      <div className="attendance-grid">
        <div className="card">
          <div className="card-header-with-info">
            <h3>Текущий статус</h3>
            <div className="info-tooltip" title="Блок показывает ваш текущий статус работы. Если вы отметили приход, здесь отображается время входа и количество отработанных часов в реальном времени. Кнопка 'Отметить приход' активна только если вы еще не отметились сегодня. Кнопка 'Отметить уход' активна только если вы уже отметили приход.">
              ℹ️
            </div>
          </div>
          {currentStatus ? (
            <div className="status-info">
              <div className="status-item">
                <span>На работе:</span>
                <strong className={currentStatus.is_checked_in ? 'status-yes' : 'status-no'}>
                  {currentStatus.is_checked_in ? 'Да' : 'Нет'}
                </strong>
              </div>
              {currentStatus.is_checked_in && currentStatus.checkin_time && (
                <>
                  <div className="status-item">
                    <span>Время входа:</span>
                    <strong>{formatTimeOnly(currentStatus.checkin_time)}</strong>
                  </div>
                  <div className="status-item">
                    <span>Отработано:</span>
                    <strong className="work-timer">{getWorkedTime()}</strong>
                  </div>
                </>
              )}
              {!currentStatus.is_checked_in && (
                <div className="status-item">
                  <span>Сегодня еще не отмечен приход</span>
                </div>
              )}
            </div>
          ) : (
            <div className="placeholder">Загрузка...</div>
          )}
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={() => handleCheck('checkin')}
              disabled={loading || (currentStatus && currentStatus.is_checked_in === true)}
            >
              {loading ? 'Обработка...' : 'Отметить приход'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleCheck('checkout')}
              disabled={loading || !currentStatus || currentStatus.is_checked_in !== true}
            >
              {loading ? 'Обработка...' : 'Отметить уход'}
            </button>
          </div>
          {currentStatus?.is_checked_in && (
            <div className="current-time">
              Текущее время: {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          )}
          <div className="info-block">
            <h4>Как это работает:</h4>
            <ul>
              <li><strong>Отметить приход</strong> — нажмите, когда начинаете рабочий день. Кнопка неактивна, если вы уже отметились сегодня.</li>
              <li><strong>Отметить уход</strong> — нажмите, когда заканчиваете рабочий день. Кнопка активна только после отметки прихода.</li>
              <li>Система автоматически определяет ваше местоположение (если разрешено) и записывает время.</li>
              <li>Отработанное время обновляется в реальном времени, пока вы на работе.</li>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Активные сотрудники</h3>
            {activeUsers.length > 0 && (
              <div className="search-box">
                <div className="search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Поиск по имени, отделу..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
            )}
          </div>
          {activeUsers.length > 0 ? (
            <>
              {(() => {
                const filteredUsers = activeUsers.filter((user) => {
                  const searchLower = searchQuery.toLowerCase()
                  return (
                    !searchQuery ||
                    user.full_name?.toLowerCase().includes(searchLower) ||
                    user.department?.toLowerCase().includes(searchLower)
                  )
                })
                
                return filteredUsers.length > 0 ? (
                  <div className="active-list">
                    {filteredUsers.map((user) => {
                      const checkinDate = user.checkin_time ? new Date(user.checkin_time) : null
                      return (
                        <div key={user.user_id} className="active-item">
                          <div className="active-item-main">
                            <div>
                              <strong>{user.full_name}</strong>
                              {user.department && (
                                <span className="dept">{user.department}</span>
                              )}
                            </div>
                            <div className="time-info">
                              <span className="time-label">Вход:</span>
                              <span className="time-value">
                                {checkinDate ? formatTimeOnly(user.checkin_time) : '—'}
                              </span>
                              {checkinDate && (
                                <span className="date-label">
                                  {checkinDate.toLocaleDateString('ru-RU', { 
                                    day: '2-digit', 
                                    month: '2-digit' 
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="hours-info">
                            <span className="hours-label">Отработано:</span>
                            <span className="hours-value">{formatHours(user.hours_worked)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="placeholder">Не найдено активных сотрудников</div>
                )
              })()}
            </>
          ) : (
            <div className="placeholder">Нет активных сотрудников</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header-with-info">
          <h3>График отработанных часов (последние 7 дней)</h3>
          <div className="info-tooltip" title="Диаграмма показывает количество отработанных часов за последние 7 дней. Каждый столбец соответствует одному дню. Если в какой-то день не было отметки ухода, часы не отображаются. График помогает отслеживать регулярность работы и общее количество отработанного времени.">
            ℹ️
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="placeholder">Нет данных для графика</div>
        )}
        <div className="info-block">
          <h4>О диаграмме:</h4>
          <ul>
            <li>Показывает количество отработанных часов за последние 7 дней</li>
            <li>Каждый столбец соответствует одному дню</li>
            <li>Если в день не было отметки ухода, часы не отображаются</li>
            <li>График помогает отслеживать регулярность работы и общее количество отработанного времени</li>
            <li>Наведите курсор на столбец, чтобы увидеть точное количество часов</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>История посещений</h3>
          <div className="date-filters">
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="date-filter"
              placeholder="С"
            />
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="date-filter"
              placeholder="По"
            />
            {(filterStartDate || filterEndDate) && (
              <button
                className="btn-clear-filter"
                onClick={() => {
                  setFilterStartDate('')
                  setFilterEndDate('')
                }}
              >
                Сбросить
              </button>
            )}
          </div>
        </div>
        {history.length > 0 ? (
          <div className="table-container">
            <div className="table">
              <div className="table-head">
                <span>ID</span>
                <span>Сотрудник</span>
                <span>Вход</span>
                <span>Выход</span>
                <span>Часы</span>
                <span>Опоздание</span>
              </div>
              {history.map((item) => (
                <div key={item.id} className="table-row">
                  <span>{item.id}</span>
                  <span className="user-name">
                    {item.user_name || (item.user && typeof item.user === 'object' 
                      ? `${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() 
                      : item.user) || '—'}
                  </span>
                  <span>{formatTime(item.checkin_time)}</span>
                  <span>{formatTime(item.checkout_time)}</span>
                  <span>{formatHours(item.total_hours)}</span>
                  <span className={item.is_late ? 'late' : ''}>
                    {item.is_late ? `Да (${item.late_minutes} мин)` : 'Нет'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="placeholder">История пуста</div>
        )}
      </div>

      {!loading && history.length > 0 && (
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: '', onConfirm: null })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.type === 'checkin' ? 'Отметить приход' : 'Отметить уход'}
        message={
          confirmModal.type === 'checkin'
            ? 'Вы уверены, что хотите отметить приход?'
            : 'Вы уверены, что хотите отметить уход?'
        }
        confirmText={confirmModal.type === 'checkin' ? 'Отметить приход' : 'Отметить уход'}
        cancelText="Отмена"
      />
    </div>
  )
}



