import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css' // <--- EST-CE QUE CETTE LIGNE EST BIEN LÀ ?
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)