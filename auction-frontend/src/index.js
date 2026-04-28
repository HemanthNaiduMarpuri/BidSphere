import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { GoogleOAuthProvider } from '@react-oauth/google'

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId="571794476138-i00ddd62l4ak8l7m9hdho6oauo94l857.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
)
