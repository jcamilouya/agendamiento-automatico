import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
  window.location.replace(`https://turnott.com${window.location.pathname}${window.location.search}`)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
