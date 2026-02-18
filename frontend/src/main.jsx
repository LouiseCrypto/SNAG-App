import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: { borderRadius: '16px', fontFamily: 'Inter, sans-serif' },
        success: { iconTheme: { primary: '#F97316', secondary: '#fff' } },
      }}
    />
  </BrowserRouter>
)
