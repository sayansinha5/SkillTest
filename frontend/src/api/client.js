import axios from 'axios'

const TOKEN_KEY = 'teachskills_token'

export const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  saveToken(data.access_token)
  return data
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function fetchDashboardCounts() {
  const { data } = await api.get('/dashboard/counts')
  return data
}
