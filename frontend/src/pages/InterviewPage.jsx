import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AuthContext } from '../contexts/AuthContext.jsx'
import { endInterview, fetchInterviews, saveInterviewMessage, startInterview } from '../api.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const INTERVIEW_DURATION = 10 * 60  // 10 minutes in seconds
const OPENAI_REALTIME_URL = 'https://api.openai.com/v1/realtime/calls'
const REALTIME_MODEL = 'gpt-realtime'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

function InterviewPage() {
  const navigate = useNavigate()
  const { token, user } = useContext(AuthContext)

  // ── Setup form ──────────────────────────────────────────────────────────────
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  // phase: setup | connecting | active | ending | done
  const [phase, setPhase] = useState('setup')
  const [error, setError] = useState('')

  // ── Session ─────────────────────────────────────────────────────────────────
  const [interviewId, setInterviewId] = useState(null)
  const interviewIdRef = useRef(null)   // stable ref for async callbacks

  // ── Transcript ──────────────────────────────────────────────────────────────
  const [transcript, setTranscript] = useState([])  // [{speaker, text}]
  const transcriptEndRef = useRef(null)

  // ── Timer ───────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(INTERVIEW_DURATION)

  // ── AI status ───────────────────────────────────────────────────────────────
  const [aiSpeaking, setAiSpeaking] = useState(false)
  // True when the browser blocked audioRef.current.play() (autoplay policy).
  // We surface a manual "Enable audio" button in this case, since a click
  // handler is the one reliable way to unlock playback in every browser.
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false)

  // ── History (shown on setup screen) ─────────────────────────────────────────
  const [history, setHistory] = useState([])

  // ── WebRTC refs ─────────────────────────────────────────────────────────────
  const pcRef = useRef(null)
  const dcRef = useRef(null)
  const audioRef = useRef(null)
  // Holds the remote MediaStream so it can be re-attached if the <audio>
  // element is ever recreated (defensive — the element is now hoisted
  // outside the phase-based conditionals so this normally isn't needed).
  const remoteStreamRef = useRef(null)

  // ── Auth guard + load history ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchInterviews(token)
      .then(setHistory)
      .catch(() => {})
  }, [user, token, navigate])

  // ── Auto-scroll transcript ───────────────────────────────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  // ── Countdown timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(id); handleEnd(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Re-attach the remote stream any time the audio element or the stream
  // itself changes, so a phase re-render can never silently drop audio.
  useEffect(() => {
    if (audioRef.current && remoteStreamRef.current) {
      if (audioRef.current.srcObject !== remoteStreamRef.current) {
        audioRef.current.srcObject = remoteStreamRef.current
      }
      audioRef.current.muted = false
      audioRef.current.volume = 1
      audioRef.current.play()
        .then(() => setNeedsAudioUnlock(false))
        .catch(err => {
          // Browser autoplay policy blocked programmatic play() — this is
          // the most common reason transcript/events work but no sound is
          // heard. Surface a manual "Enable audio" button; clicking it
          // calls play() from directly inside a user gesture, which every
          // browser allows regardless of autoplay policy.
          console.log('Audio autoplay blocked:', err)
          setNeedsAudioUnlock(true)
        })
    }
  }, [phase])

  const handleEnableAudio = () => {
    audioRef.current?.play()
      .then(() => setNeedsAudioUnlock(false))
      .catch(err => console.log('Manual audio unlock failed:', err))
  }

  // ── Realtime event handler ───────────────────────────────────────────────────
  const handleRealtimeEvent = useCallback(async (event) => {

    console.log("Realtime Event:", event)

    const iid = interviewIdRef.current

    switch (event.type) {

      case "response.audio_transcript.done": {

        if (!event.transcript) return

        setAiSpeaking(false)

        setTranscript(prev => [
          ...prev,
          {
            speaker: "interviewer",
            text: event.transcript
          }
        ])

        if (iid) {
          saveInterviewMessage(token, {
            interview_id: iid,
            role: "interviewer",
            transcript: event.transcript
          }).catch(() => {})
        }

        break
      }

      case "conversation.item.input_audio_transcription.completed": {

        if (!event.transcript) return

        setTranscript(prev => [
          ...prev,
          {
            speaker: "candidate",
            text: event.transcript
          }
        ])

        if (iid) {
          saveInterviewMessage(token, {
            interview_id: iid,
            role: "candidate",
            transcript: event.transcript
          }).catch(() => {})
        }

        break
      }

      case "response.audio.delta":
        setAiSpeaking(true)
        break

      case "response.audio.done":
        setAiSpeaking(false)
        break

      case "error":
        console.error(event.error)
        setError(
          event.error?.message ||
          "Realtime error"
        )
        break

      default:
        console.log("Unhandled event:", event.type)
    }

  }, [token])

  // ── Start interview ──────────────────────────────────────────────────────────
  const handleStart = async () => {
    setError('')
    setPhase('connecting')
    setTranscript([])
    setTimeLeft(INTERVIEW_DURATION)

    try {

      // 1. Create interview + get ephemeral key
      const { interview_id, ephemeral_key } = await startInterview(token, {
        role: role.trim() || undefined,
        company: company.trim() || undefined,
      })

      setInterviewId(interview_id)
      interviewIdRef.current = interview_id

      // 2. Create WebRTC PeerConnection
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // Debug WebRTC states
      pc.onconnectionstatechange = () => {
        console.log("WebRTC connection:", pc.connectionState)
      }

      pc.oniceconnectionstatechange = () => {
        console.log("ICE state:", pc.iceConnectionState)
      }

      // 3. Receive AI audio track
      pc.ontrack = (event) => {
        console.log("Received AI audio track", event.streams[0])
        console.log(
          "Remote audio tracks:",
          event.streams[0].getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted }))
        )

        // Stash the stream so it survives even if the <audio> element
        // is ever remounted (phase changes no longer remount it, but
        // this keeps things safe against future refactors).
        remoteStreamRef.current = event.streams[0]

        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0]
          audioRef.current.muted = false
          audioRef.current.volume = 1
          audioRef.current.play()
            .then(() => setNeedsAudioUnlock(false))
            .catch(err => {
              // Most common reason you see transcript/events working but
              // hear nothing: the browser's autoplay policy silently
              // rejected this programmatic play() call. Show the manual
              // "Enable audio" button so the user can unlock it with a
              // real click, which browsers always allow.
              console.log("Audio autoplay blocked:", err)
              setNeedsAudioUnlock(true)
            })
        }
      }

      // 4. Create data channel for realtime events
      const dc = pc.createDataChannel("oai-events")
      dcRef.current = dc

      dc.onopen = () => {
        console.log("Realtime data channel opened")

        // Explicitly configure the session so we don't rely on defaults
        // for audio modality / voice / turn detection.
        // NOTE: this is the GA Realtime API schema (used by /v1/realtime/calls),
        // which requires session.type and nests audio config under
        // session.audio.input / session.audio.output — this differs from the
        // older beta WebSocket schema (modalities, turn_detection at the top
        // level) that a lot of older examples online still show.
        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            type: "realtime",
            output_modalities: ["audio"],
            audio: {
              input: {
                turn_detection: { type: "server_vad" }
              },
              output: {}
            }
          }
        }))

        dc.send(JSON.stringify({
          type: "response.create",
          response: {
            instructions:
              "Introduce yourself as a senior recruiter and start the behavioural interview."
          }
        }))
      }

      dc.onmessage = (e) => {
        const event = JSON.parse(e.data)
        console.log("Realtime event:", event)
        handleRealtimeEvent(event)
      }

      // 5. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log("Microphone tracks:", stream.getAudioTracks())

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      // 6. Create SDP offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // 7. Wait for ICE candidates
      await new Promise(resolve => {
        if (pc.iceGatheringState === "complete") {
          resolve()
        } else {
          pc.onicegatheringstatechange = () => {
            console.log("ICE gathering:", pc.iceGatheringState)
            if (pc.iceGatheringState === "complete") {
              resolve()
            }
          }
        }
      })

      console.log("Sending SDP offer...")

      // 8. Send SDP to OpenAI Realtime
      const sdpRes = await fetch(
        `${OPENAI_REALTIME_URL}?model=${REALTIME_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ephemeral_key}`,
            "Content-Type": "application/sdp"
          },
          body: pc.localDescription.sdp
        }
      )

      if (!sdpRes.ok) {
        const error = await sdpRes.text()
        throw new Error(error)
      }

      // 9. Receive SDP answer
      const answerSdp = await sdpRes.text()

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp
      })

      console.log("Realtime connected")

      setPhase("active")

    } catch (err) {
      console.error("Realtime startup failed:", err)

      setError(err.message ?? "Failed to start interview. Please try again.")
      setPhase("setup")

      pcRef.current?.close()
      pcRef.current = null
    }
  }

  // ── End interview ────────────────────────────────────────────────────────────
  const handleEnd = useCallback(async () => {
    if (phase === 'ending' || phase === 'done') return
    setPhase('ending')

    dcRef.current?.close()
    pcRef.current?.close()

    const iid = interviewIdRef.current
    if (!iid) return

    try {
      await endInterview(token, iid)
    } catch {
      // non-fatal — navigate anyway; user can retry evaluation
    }
    setPhase('done')
    navigate(`/interview/${iid}/result`)
  }, [phase, token, navigate])

  // ── Render ───────────────────────────────────────────────────────────────────
  // NOTE: a single <audio> element is hoisted here, outside the phase-based
  // conditionals below. Previously each phase branch rendered its own
  // <audio ref={audioRef} .../>, which meant React unmounted/remounted a
  // brand-new audio element on every phase transition (setup -> connecting
  // -> active). Since pc.ontrack only fires once, the srcObject assigned
  // during "connecting" was destroyed the moment we moved to "active",
  // and no code ever re-attached the stream to the new element — so the
  // AI's audio silently never played, even though the data channel events
  // and transcript worked fine. Keeping one persistent element (plus the
  // re-attach effect above) fixes this.
  return (
    <>
      {/*
        Positioned off-screen rather than display:none. Some WebKit builds
        deprioritize / pause media elements that are display:none, which can
        silently kill audio playback even though the element is technically
        "there". Off-screen absolute positioning keeps it fully active.
      */}
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
      />

      {needsAudioUnlock && (phase === 'active' || phase === 'ending' || phase === 'connecting') ? (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-amber-100 px-4 py-2.5 text-sm text-amber-900 shadow">
          <span>Your browser blocked audio autoplay — the interviewer can't be heard yet.</span>
          <button
            type="button"
            onClick={handleEnableAudio}
            className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-500"
          >
            Enable audio
          </button>
        </div>
      ) : null}

      {phase === 'setup' && (
        <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl space-y-8">
            {/* Header */}
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.32em] text-sky-600">Mock Interview</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Behavioural Interview
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                10-minute voice interview with an AI recruiter. Answers are saved and evaluated automatically.
              </p>
            </div>

            {/* Start card */}
            <div className="rounded-[1.75rem] border border-white/70 bg-white/80 px-7 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.1)] backdrop-blur-sm">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">New Session</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Job Role <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      placeholder="e.g. Software Engineer"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Company <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      placeholder="e.g. Google"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">Before you start</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                    <li>Allow microphone access when the browser prompts you</li>
                    <li>Find a quiet environment — the AI uses your audio directly</li>
                    <li>The AI will speak first and ask the opening question</li>
                    <li>Interview lasts up to 10 minutes; click "End Interview" any time</li>
                  </ul>
                </div>

                {error ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleStart}
                  className="w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 active:scale-[0.98]"
                >
                  Start Behavioural Interview
                </button>
              </div>
            </div>

            {/* Past interviews */}
            {history.length > 0 ? (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Past interviews</p>
                <div className="space-y-2.5">
                  {history.map(iv => (
                    <div
                      key={iv.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3.5 text-sm backdrop-blur-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {iv.role ? `${iv.role}${iv.company ? ` @ ${iv.company}` : ''}` : `Interview #${iv.id}`}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">{formatDate(iv.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {iv.overall_score != null ? (
                          <span className="text-sm font-bold text-slate-900">{iv.overall_score.toFixed(1)}/10</span>
                        ) : null}
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          iv.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                        }`}>
                          {iv.status}
                        </span>
                        {iv.status === 'completed' ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/interview/${iv.id}/result`)}
                            className="text-xs font-semibold text-sky-600 hover:text-sky-500 hover:underline"
                          >
                            View results →
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </main>
      )}

      {phase === 'connecting' && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Connecting to AI interviewer…</p>
            <p className="mt-1 text-xs text-slate-400">Requesting microphone access</p>
          </div>
        </div>
      )}

      {(phase === 'active' || phase === 'ending') && (
        <main className="flex min-h-screen flex-col px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">

            {/* Status bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/80 px-5 py-3 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  phase === 'ending'
                    ? 'bg-amber-400'
                    : aiSpeaking
                      ? 'animate-pulse bg-emerald-500'
                      : 'bg-sky-500'
                }`} />
                <span className="text-sm font-medium text-slate-700">
                  {phase === 'ending'
                    ? 'Ending interview — please wait…'
                    : aiSpeaking
                      ? 'AI is speaking'
                      : 'Your turn — speak now'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className={`font-mono text-lg font-bold tabular-nums ${
                  timeLeft < 60 ? 'text-rose-600' : 'text-slate-900'
                }`}>
                  {formatTime(timeLeft)}
                </span>
                <button
                  type="button"
                  onClick={handleEnd}
                  disabled={phase === 'ending'}
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  End Interview
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {/* Live transcript */}
            <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white/80 p-5 backdrop-blur-sm">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
                Live Transcript
              </p>
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {transcript.length === 0 ? (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-sm text-slate-400">Transcript will appear here once the interview starts…</p>
                  </div>
                ) : (
                  transcript.map((entry, i) => (
                    <div
                      key={i}
                      className={`flex ${entry.speaker === 'candidate' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                        entry.speaker === 'candidate'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        <p className={`mb-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          entry.speaker === 'candidate' ? 'text-sky-200' : 'text-slate-400'
                        }`}>
                          {entry.speaker === 'candidate' ? 'You' : 'AI Interviewer'}
                        </p>
                        {entry.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>
        </main>
      )}
    </>
  )
}

export default InterviewPage
