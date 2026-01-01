import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { removeToken } from '../api/client'
import './Layout.css'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sidebarRef = useRef(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const handleLogout = () => {
    removeToken()
    navigate('/login')
  }

  // Закрытие сайдбара при изменении маршрута на мобильных
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }, [location.pathname])

  // Обработка свайпа для закрытия сайдбара
  useEffect(() => {
    if (!sidebarOpen) return

    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchMove = (e) => {
      if (!sidebarOpen) return
      
      const touchCurrentX = e.touches[0].clientX
      const touchCurrentY = e.touches[0].clientY
      const diffX = touchStartX.current - touchCurrentX
      const diffY = touchStartY.current - touchCurrentY

      // Если свайп влево больше чем вверх/вниз, закрываем сайдбар
      if (diffX > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        setSidebarOpen(false)
      }
    }

    const sidebar = sidebarRef.current
    if (sidebar) {
      sidebar.addEventListener('touchstart', handleTouchStart, { passive: true })
      sidebar.addEventListener('touchmove', handleTouchMove, { passive: true })
    }

    return () => {
      if (sidebar) {
        sidebar.removeEventListener('touchstart', handleTouchStart)
        sidebar.removeEventListener('touchmove', handleTouchMove)
      }
    }
  }, [sidebarOpen])

  if (!token) {
    return children
  }

  const navItems = [
    { path: '/', label: 'Главная', icon: '📊' },
    { path: '/attendance', label: 'Посещаемость', icon: '⏰' },
    { path: '/users', label: 'Сотрудники', icon: '👥' },
    { path: '/salary', label: 'Зарплата', icon: '💰' },
    { path: '/requests', label: 'Заявки', icon: '📝' },
    { path: '/departments', label: 'Отделы', icon: '🏢' },
  ]

  return (
    <div className="dashboard-layout">
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} 
        onClick={() => setSidebarOpen(false)}
        onTouchStart={(e) => {
          if (sidebarOpen) {
            touchStartX.current = e.touches[0].clientX
          }
        }}
        onTouchEnd={(e) => {
          if (sidebarOpen) {
            const touchEndX = e.changedTouches[0].clientX
            const diffX = touchStartX.current - touchEndX
            if (diffX > 50) {
              setSidebarOpen(false)
            }
          }
        }}
      ></div>
      <aside 
        ref={sidebarRef}
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
      >
        <div className="sidebar-header">
          <h2>AKS</h2>
          <p>Система учета</p>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
            <h1>Dashboard</h1>
          </div>
          <div className="header-actions">
            <a
              href="http://127.0.0.1:8000/swagger/"
              target="_blank"
              rel="noreferrer"
              className="header-link"
            >
              Swagger
            </a>
            <a
              href="http://127.0.0.1:8000/redoc/"
              target="_blank"
              rel="noreferrer"
              className="header-link"
            >
              Redoc
            </a>
          </div>
        </header>
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  )
}



