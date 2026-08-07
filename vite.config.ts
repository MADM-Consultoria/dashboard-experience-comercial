import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // `vercel dev` quebra o parsing do index.html nessa versão do Vite (erro de import
    // analysis), então em dev local rodamos o Vite puro (frontend só) e mandamos as chamadas
    // /api pra produção — mesmo banco/login real, sem precisar do proxy de funções do Vercel.
    proxy: {
      '/api': {
        target: 'https://madm-dashboard-ops.vercel.app',
        changeOrigin: true,
      },
    },
  },
})
