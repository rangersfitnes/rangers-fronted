export const apiConfig = {
  // 3002: evita conflicto con otros backends locales en 3001 (p. ej. nodefex)
  development: 'http://127.0.0.1:3002',
  production: 'https://api.rangersbox.com',
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? apiConfig.development : apiConfig.production)
