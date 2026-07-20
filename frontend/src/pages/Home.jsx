import { useNavigate } from 'react-router'
import FileUpload from '../components/FileUpload'
import './Home.css'

function Home() {
  const navigate = useNavigate()

  return (
    <main className="home-shell min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <section className="home-card mx-auto flex w-full max-w-3xl flex-col items-center rounded-[2rem] border border-white/70 bg-white/80 px-5 py-10 text-center shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:px-8 sm:py-14">

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-500">
          <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white">1</span>
          <span>Upload</span>
          <span className="text-slate-300">›</span>
          <span>Job Description</span>
          <span className="text-slate-300">›</span>
          <span>Preview</span>
        </div>

        <p className="text-sm font-medium uppercase tracking-[0.32em] text-sky-600">Resume Upload</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Upload your resume in seconds
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Select a PDF resume or drag it into the upload area below. The interface keeps the flow simple,
          responsive, and easy to scan.
        </p>

        <div className="mt-8 w-full">
          <FileUpload />
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate('/job-description')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Add Job Description
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </section>
    </main>
  )
}

export default Home