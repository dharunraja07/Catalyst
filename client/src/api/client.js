import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Add retry interceptor for transient startup 503 / ECONNREFUSED responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    if (!config || config._retry) {
      return Promise.reject(error)
    }

    // If server was starting up (503 Service Unavailable or network refusal)
    if (error.response?.status === 503 || error.code === 'ERR_NETWORK') {
      config._retry = true
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return api(config)
    }

    return Promise.reject(error)
  }
)

export default api
