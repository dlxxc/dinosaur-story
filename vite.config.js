import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  // GitHub Pages 部署在 https://dlxxc.github.io/dinosaur-story/ 下，需要正确 base
  // dev 模式保持 '/' 不影响局域网访问
  base: mode === 'production' ? '/dinosaur-story/' : '/',
  server: {
    host: true,
    port: 5173
  }
}))
