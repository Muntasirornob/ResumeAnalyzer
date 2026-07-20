import { Navigate, Route, Routes, Link } from 'react-router'
import Home from '../pages/Home'
import JobDescription from '../pages/JobDescription'
import PreviewPage from '../pages/PreviewPage'
import Register from '../components/Register'
import Login from '../components/Login'
import UserProfile from '../components/UserProfile'
import { AuthProvider }  from '../contexts/AuthContext.jsx'

function AppRoutes() {
  return (
    <AuthProvider>
        <div style={{"padding": "20px"}}>
                    <nav>
                        <ul>
                            <li><Link to="/register">Register</Link></li>
                            <li><Link to="/login">Login</Link></li>
                            <li><Link to="/profile">Profile</Link></li>
                        </ul>
                    </nav>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/job-description" element={<JobDescription />} />
                        <Route path="/preview" element={<PreviewPage />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/profile" element={<UserProfile />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
        </div>
    </AuthProvider>
  )
}

export default AppRoutes

