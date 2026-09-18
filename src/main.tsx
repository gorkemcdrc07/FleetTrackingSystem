import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './components/Premium/PremiumTheme.css'
import App from './App.tsx'
import './components/Premium/OperationsSuite.css'

try {
  const savedTheme = localStorage.getItem('fts_theme')
  const initialTheme = savedTheme === 'light' || savedTheme === 'dark'
    ? savedTheme
    : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  document.documentElement.dataset.theme = initialTheme
  document.documentElement.style.colorScheme = initialTheme
} catch {
  document.documentElement.dataset.theme = 'light'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
