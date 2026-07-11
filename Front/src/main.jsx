import App from './App.jsx'
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import "./assets/index.css"

ReactDOM.createRoot(document.getElementById('root')).render(
<BrowserRouter>
 <AuthProvider>
    <App />
 </AuthProvider>
</BrowserRouter>
)
