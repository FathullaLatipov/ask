import { Link, useLocation, useNavigate } from 'react-router-dom'
import { removeToken } from '../api/client'
import './Layout.css'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const handleLogout = () => {
    removeToken()
    navigate('/login')
  }

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
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Employee Management</h2>
          <p>Система учета</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
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
          <h1>Dashboard</h1>
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


