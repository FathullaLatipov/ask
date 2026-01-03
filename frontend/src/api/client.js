import axios from 'axios'
import i18n from '../i18n/config'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export const createApiClient = (token) => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: token
      ? {
          Authorization: `Token ${token}`,
          'X-Language': i18n.language || 'ru',
        }
      : {
          'X-Language': i18n.language || 'ru',
        },
  })

  // Добавляем interceptor для обновления языка при его изменении
  instance.interceptors.request.use(
    (config) => {
      const currentLang = i18n.language || 'ru'
      if (config.headers) {
        config.headers['X-Language'] = currentLang
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Добавляем interceptor для автоматической обработки ошибок
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Токен недействителен, удаляем его
        removeToken()
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )

  return instance
}

export const getToken = () => localStorage.getItem('token') || ''
export const setToken = (token) => localStorage.setItem('token', token)
export const removeToken = () => localStorage.removeItem('token')



