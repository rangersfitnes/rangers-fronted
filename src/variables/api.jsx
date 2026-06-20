export const apiConfig = {
  development: 'http://localhost:3001',
  production: 'https://api.rangersbox.com',
}

export const API_BASE_URL = import.meta.env.DEV
  ? apiConfig.development
  : apiConfig.production
