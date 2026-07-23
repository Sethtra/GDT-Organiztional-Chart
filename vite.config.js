import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules/,
              minSize: 100_000,
              maxSize: 450_000,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
