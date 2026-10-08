import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))

function crearBuildId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${stamp}-${rand}`
}

function versionPlugin() {
  let buildId = 'dev'

  return {
    name: 'rangers-app-version',
    config(_cfg, { command }) {
      buildId =
        command === 'build'
          ? process.env.VITE_APP_BUILD_ID || crearBuildId()
          : 'dev'
      return {
        define: {
          __APP_BUILD_ID__: JSON.stringify(buildId),
        },
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/version.json')) {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify({ buildId: 'dev', env: 'development' }))
          return
        }
        next()
      })
    },
    writeBundle(options) {
      const outDir = options.dir || resolve(__dirname, 'dist')
      const payload = {
        buildId,
        builtAt: new Date().toISOString(),
      }
      writeFileSync(
        resolve(outDir, 'version.json'),
        `${JSON.stringify(payload, null, 2)}\n`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
      },
    },
  },
})
