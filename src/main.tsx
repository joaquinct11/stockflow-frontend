import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useAuthStore } from './store/authStore'

// Inicializar el store antes de renderizar
useAuthStore.getState().initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)