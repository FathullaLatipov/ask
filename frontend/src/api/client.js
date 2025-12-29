import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export const createApiClient = (token) => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  })

  return instance
}

export const getToken = () => localStorage.getItem('token') || ''
export const setToken = (token) => localStorage.setItem('token', token)
export const removeToken = () => localStorage.removeItem('token')


