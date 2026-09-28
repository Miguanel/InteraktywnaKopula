import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ConfiguratorApp from './ConfiguratorApp.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfiguratorApp />
  </StrictMode>,
)
