import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AuthContext } from '../contexts/AuthContext.jsx'
import { fetchInterviewEvaluation, fetchInterviewMessages } from '../api.js'

// ── Score dimensions ──────────────────────────────────────────────────────────

const DIMENSIONS = [
  { key: 'communication',   label: 'Communication' },
  { key: 'clarity',         label: 'Clarity' },
  { key: 'leadership',      label: 'Leadership' },
  { key: 'confidence',      label: 'Confidence' },
  { key: 'structure',       label: 'Structure' },
  { key: 'problem_solving', label: 'Problem Solving' },
  { key: 'star_method',     label: 'STAR Method' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ label, score }) {
  const pct = Math.min(100, Math.round((score / 10) * 100))
  const colorClass =
    pct >= 80 ? 'bg-emerald-500' :
    pct >= 60 ? 'bg-sky-500' :
    pct >= 40 ? 'bg-amber-500' :
                'bg-rose-500'

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-bold tabular-nums text-slate-900">{score?.toFixed(1)}/10</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function InterviewResultPage() {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const { token, user } = useContext(AuthContext)

  const [evaluation, setEvaluation] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('scores') // 'scores' | 'transcript'

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    const load = async () => {
      try {
        const [ev, msgs] = await Promise.all([
          fetchInterviewEvaluation(token, interviewId),
          fetchInterviewMessages(token, interviewId),
        ])
        setEvaluation(ev)
        setMessages(msgs)
      } catch {
        setError('Evaluation not available yet. It may still be processing — try refreshing in a moment.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user, token, interviewId, navigate])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
        <p className="text-sm text-slate-500">Loading your evaluation…</p>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !evaluation) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate('/interview')}
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  const scoreColor =
    evaluation.overall_score >= 8 ? 'text-emerald-600' :
    evaluation.overall_score >= 6 ? 'text-sky-600' :
    evaluation.overall_score >= 4 ? 'text-amber-600' :
                                    'text-rose-600'

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">

        {/* Page header */}
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.32em] text-sky-600">
            Interview #{interviewId}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your Results
          </h1>
        </div>

        {/* Overall score hero */}
        <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Overall Score</p>
          <div className="mt-3 flex items-baseline justify-center gap-1">
            <span className={`text-7xl font-bold tracking-tight ${scoreColor}`}>
              {evaluation.overall_score?.toFixed(1)}
            </span>
            <span className="text-2xl font-semibold text-slate-300">/10</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {[['scores', 'Scores & Feedback'], ['transcript', 'Full Transcript']].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                tab === key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Scores tab ─────────────────────────────────────────────────── */}
        {tab === 'scores' && (
          <div className="space-y-5">
            {/* Dimension bars */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-6 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Dimension Scores
              </p>
              {DIMENSIONS.filter(d => evaluation[d.key] != null).map(({ key, label }) => (
                <ScoreBar key={key} label={label} score={evaluation[key]} />
              ))}
            </div>

            {/* Strengths */}
            {evaluation.strengths?.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  Strengths
                </p>
                <ul className="space-y-2">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                      <span className="mt-0.5 font-bold text-emerald-500">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {evaluation.weaknesses?.length > 0 && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">
                  Areas to Improve
                </p>
                <ul className="space-y-2">
                  {evaluation.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-rose-800">
                      <span className="mt-0.5 text-rose-400">→</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Coaching suggestions */}
            {evaluation.suggestions?.length > 0 && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                  Coaching Tips
                </p>
                <ul className="space-y-2">
                  {evaluation.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-sky-800">
                      <span className="mt-0.5">💡</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improved answers */}
            {evaluation.improved_answers?.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                  Example Improved Answers
                </p>
                <div className="space-y-3">
                  {evaluation.improved_answers.map((a, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-slate-700 ring-1 ring-amber-200"
                    >
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Transcript tab ──────────────────────────────────────────────── */}
        {tab === 'transcript' && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 backdrop-blur-sm">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Full Transcript — {messages.length} messages
            </p>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-400">No transcript was saved for this session.</p>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.speaker === 'candidate' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                      m.speaker === 'candidate'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      <p className={`mb-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        m.speaker === 'candidate' ? 'text-sky-200' : 'text-slate-400'
                      }`}>
                        {m.speaker === 'candidate' ? 'You' : 'AI Interviewer'}
                      </p>
                      {m.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate('/interview')}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            All Interviews
          </button>
          <button
            type="button"
            onClick={() => navigate('/interview')}
            className="inline-flex items-center rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            Start New Interview
          </button>
        </div>
      </div>
    </main>
  )
}

export default InterviewResultPage
