import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const WS_PORT = process.env.WS_PORT ?? 3001

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // El cliente se conecta a ws://<host>/ws y Vite lo reenvia al relay.
      '/ws': {
        target: `ws://localhost:${WS_PORT}`,
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, ''),
      },
    },
  },
})
