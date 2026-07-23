import { useContext } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router'
import { AuthContext, AuthProvider } from '../contexts/AuthContext.jsx'
import Home from '../pages/Home'
import JobDescription from '../pages/JobDescription'
import JobTrackerPage from '../pages/JobTrackerPage'
import InterviewPage from '../pages/InterviewPage'
import InterviewResultPage from '../pages/InterviewResultPage'
import PreviewPage from '../pages/PreviewPage'
import Register from '../components/Register'
import Login from '../components/Login'
import UserProfile from '../components/UserProfile'

function NavBar() {
  const { user } = useContext(AuthContext)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-8">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm transition group-hover:bg-sky-500">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-slate-900">ResumeAI</span>
        </Link>

        <nav className="flex items-center gap-1.5">
          {user ? (
            <>
              <span className="mr-1 hidden max-w-[120px] truncate text-sm text-slate-500 sm:block">
                {user.username}
              </span>
              <Link
                to="/jobs"
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                Job Tracker
              </Link>
              <Link
                to="/interview"
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                Mock Interview
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Profile
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

function AppRoutes() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/job-description" element={<JobDescription />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/jobs" element={<JobTrackerPage />} />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/interview/:interviewId/result" element={<InterviewResultPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  )
}

export default AppRoutes

