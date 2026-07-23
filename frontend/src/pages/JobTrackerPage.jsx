import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AuthContext } from '../contexts/AuthContext.jsx'
import {
  createJobApplication,
  deleteJobApplication,
  fetchJobApplications,
  updateJobApplication,
} from '../api.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES = ['applied', 'interviewing', 'offered', 'rejected', 'withdrawn']

const STATUS_STYLE = {
  applied:      'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  interviewing: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  offered:      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected:     'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  withdrawn:    'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

const EMPTY_FORM = {
  company: '',
  job_title: '',
  job_url: '',
  description: '',
  status: 'applied',
  notes: '',
  applied_date: '',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[status] ?? STATUS_STYLE.applied}`}>
      {status}
    </span>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white/60 px-5 py-4 text-center">
      <span className={`text-2xl font-bold ${accent}`}>{value}</span>
      <span className="mt-0.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{label}</span>
    </div>
  )
}

function JobForm({ data, onChange, onSubmit, onCancel, isSubmitting, isEdit }) {
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'
  const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Company *</label>
          <input
            name="company"
            value={data.company}
            onChange={onChange}
            required
            placeholder="Acme Corp"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Job Title *</label>
          <input
            name="job_title"
            value={data.job_title}
            onChange={onChange}
            required
            placeholder="Senior Engineer"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select
            name="status"
            value={data.status}
            onChange={onChange}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Applied Date</label>
          <input
            type="date"
            name="applied_date"
            value={data.applied_date}
            onChange={onChange}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Job URL</label>
          <input
            type="url"
            name="job_url"
            value={data.job_url}
            onChange={onChange}
            placeholder="https://jobs.example.com/posting/123"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Notes</label>
          <textarea
            name="notes"
            value={data.notes}
            onChange={onChange}
            rows={3}
            placeholder="Recruiter name, referral, interview notes…"
            className={`${inputClass} resize-none leading-6`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Application'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function JobCard({ job, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    company: job.company,
    job_title: job.job_title,
    job_url: job.job_url ?? '',
    description: job.description ?? '',
    status: job.status,
    notes: job.notes ?? '',
    applied_date: job.applied_date ?? '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => setEditData({ ...editData, [e.target.name]: e.target.value })

  const handleUpdate = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const updated = await onUpdate(job.id, editData)
      setIsEditing(false)
      return updated
    } finally {
      setIsSubmitting(false)
    }
  }

  const formattedDate = job.applied_date
    ? new Date(job.applied_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition hover:shadow-md">
      {isEditing ? (
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
            Editing application
          </p>
          <JobForm
            data={editData}
            onChange={handleChange}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isSubmitting={isSubmitting}
            isEdit
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-slate-900">{job.company}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-600">{job.job_title}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={job.status} />
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                aria-label="Edit"
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.757l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onDelete(job.id)}
                aria-label="Delete"
                className="rounded-lg border border-rose-100 bg-rose-50 p-1.5 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z" />
                </svg>
              </button>
            </div>
          </div>

          {(formattedDate || job.job_url) ? (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {formattedDate ? (
                <span className="flex items-center gap-1">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                    <path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Z" />
                  </svg>
                  Applied {formattedDate}
                </span>
              ) : null}
              {job.job_url ? (
                <a
                  href={job.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sky-600 transition hover:text-sky-500 hover:underline"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                    <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
                  </svg>
                  View posting
                </a>
              ) : null}
            </div>
          ) : null}

          {job.notes ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600">
              {job.notes}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function JobTrackerPage() {
  const navigate = useNavigate()
  const { token, user } = useContext(AuthContext)

  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const load = async () => {
      try {
        const data = await fetchJobApplications(token)
        setJobs(data)
      } catch {
        setError('Failed to load job applications.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [token, user, navigate])

  const handleFormChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const created = await createJobApplication(token, formData)
      setJobs([created, ...jobs])
      setFormData(EMPTY_FORM)
      setShowAddForm(false)
    } catch {
      setError('Failed to add job application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (jobId, data) => {
    const updated = await updateJobApplication(token, jobId, data)
    setJobs(jobs.map((j) => (j.id === jobId ? updated : j)))
    return updated
  }

  const handleDelete = async (jobId) => {
    try {
      await deleteJobApplication(token, jobId)
      setJobs(jobs.filter((j) => j.id !== jobId))
    } catch {
      setError('Failed to delete job application.')
    }
  }

  // Stats
  const counts = jobs.reduce(
    (acc, j) => ({ ...acc, [j.status]: (acc[j.status] ?? 0) + 1 }),
    {},
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
          Loading your applications…
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">

        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-sky-600">
              Job Tracker
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Your Applications
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {jobs.length === 0
                ? 'No applications yet. Add your first one below.'
                : `${jobs.length} application${jobs.length !== 1 ? 's' : ''} tracked`}
            </p>
          </div>

          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
              </svg>
              Add Application
            </button>
          ) : null}
        </div>

        {/* Stats */}
        {jobs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Total" value={jobs.length} accent="text-slate-900" />
            <StatCard label="Applied" value={counts.applied ?? 0} accent="text-sky-600" />
            <StatCard label="Interviewing" value={counts.interviewing ?? 0} accent="text-amber-600" />
            <StatCard label="Offered" value={counts.offered ?? 0} accent="text-emerald-600" />
            <StatCard label="Rejected" value={counts.rejected ?? 0} accent="text-rose-500" />
          </div>
        ) : null}

        {/* Error banner */}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* Add form */}
        {showAddForm ? (
          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
              New Application
            </p>
            <JobForm
              data={formData}
              onChange={handleFormChange}
              onSubmit={handleAddSubmit}
              onCancel={() => { setShowAddForm(false); setFormData(EMPTY_FORM) }}
              isSubmitting={isSubmitting}
              isEdit={false}
            />
          </div>
        ) : null}

        {/* Job cards */}
        {jobs.length > 0 ? (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        ) : null}

        {/* Empty state */}
        {jobs.length === 0 && !showAddForm ? (
          <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-white/60 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="mt-4 text-base font-semibold text-slate-700">No applications yet</p>
            <p className="mt-1 text-sm text-slate-400">Click "Add Application" to track your first job.</p>
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default JobTrackerPage
