import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset URLs relative so the build works inside Capacitor (file/capacitor:// origin)
export default defineConfig({ base: './', plugins: [react()] })
