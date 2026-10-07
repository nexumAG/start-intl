import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), tanstackStart(), react()],
  // `file:../..` links the library, whose own node_modules hold dev copies of
  // these; two copies of React or the router break hooks and context.
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      '@tanstack/react-router',
      '@tanstack/react-start',
      'use-intl',
    ],
  },
})
