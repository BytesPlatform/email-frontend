'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

export type BulkOperationType = 'summary' | 'email' | 'sms'

export interface BulkProgressState {
  isOpen: boolean
  type: BulkOperationType
  totalItems: number
  /** Set when API finishes */
  result?: {
    successful: number
    failed: number
    totalTimeSeconds: number
  }
}

const OPERATION_LABELS: Record<BulkOperationType, string> = {
  summary: 'Summary Generation',
  email: 'Email Generation',
  sms: 'SMS Generation',
}

const AVG_SECONDS_PER_ITEM: Record<BulkOperationType, number> = {
  summary: 40,
  email: 35,
  sms: 30,
}

interface Props {
  progress: BulkProgressState
  onClose: () => void
}

export function BulkProgressModal({ progress, onClose }: Props) {
  const { isOpen, type, totalItems, result } = progress
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [simulatedDone, setSimulatedDone] = useState(0)
  const [logLines, setLogLines] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)
  const simTimerRef = useRef<ReturnType<typeof setInterval>>(null)

  const estimatedTotal = totalItems * AVG_SECONDS_PER_ITEM[type]
  const isFinished = !!result

  const addLog = useCallback((line: string) => {
    setLogLines(prev => [...prev, line])
  }, [])

  // Reset on open
  useEffect(() => {
    if (isOpen && !result) {
      startTimeRef.current = Date.now()
      setElapsedSeconds(0)
      setSimulatedDone(0)
      setLogLines([
        `Starting bulk ${OPERATION_LABELS[type].toLowerCase()} for ${totalItems} contacts...`,
        `Estimated time: ~${Math.round(estimatedTotal)}s (${Math.ceil(estimatedTotal / 60)} min)`,
        '',
      ])
    }
  }, [isOpen, type, totalItems, estimatedTotal, result])

  // Elapsed timer
  useEffect(() => {
    if (!isOpen || isFinished) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isOpen, isFinished])

  // Simulated per-item progress
  useEffect(() => {
    if (!isOpen || isFinished) {
      if (simTimerRef.current) clearInterval(simTimerRef.current)
      return
    }

    const avgMs = AVG_SECONDS_PER_ITEM[type] * 1000
    // Randomize interval ±30%
    const scheduleNext = () => {
      const jitter = avgMs * (0.7 + Math.random() * 0.6)
      simTimerRef.current = setTimeout(() => {
        setSimulatedDone(prev => {
          const next = prev + 1
          if (next <= totalItems) {
            addLog(`  Processing contact ${next} of ${totalItems}...`)
          }
          // Don't exceed totalItems - 1 while still running (leave last one for real finish)
          return Math.min(next, totalItems - 1)
        })
        scheduleNext()
      }, jitter) as unknown as ReturnType<typeof setInterval>
    }

    // First item starts quickly
    simTimerRef.current = setTimeout(() => {
      setSimulatedDone(1)
      addLog(`  Processing contact 1 of ${totalItems}...`)
      scheduleNext()
    }, 1500 + Math.random() * 1000) as unknown as ReturnType<typeof setInterval>

    return () => { if (simTimerRef.current) clearTimeout(simTimerRef.current) }
  }, [isOpen, isFinished, totalItems, type, addLog])

  // When result arrives, show completion log
  useEffect(() => {
    if (result) {
      setSimulatedDone(totalItems)
      setElapsedSeconds(Math.round(result.totalTimeSeconds))
      setLogLines(prev => [
        ...prev,
        '',
        `--- Completed ---`,
        `  ${result.successful} succeeded, ${result.failed} failed out of ${totalItems} total`,
        `  Time: ${Math.round(result.totalTimeSeconds)}s`,
      ])
    }
  }, [result, totalItems])

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logLines])

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const displayDone = isFinished ? totalItems : simulatedDone
  const pct = totalItems > 0 ? Math.round((displayDone / totalItems) * 100) : 0
  const remaining = Math.max(0, estimatedTotal - elapsedSeconds)

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            {!isFinished ? (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isFinished ? `${OPERATION_LABELS[type]} Complete` : `Bulk ${OPERATION_LABELS[type]}`}
              </h2>
              <p className="text-sm text-slate-500">
                {isFinished
                  ? `${result.successful} of ${totalItems} completed successfully`
                  : `Processing ${totalItems} contacts...`}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>{displayDone} of {totalItems} contacts</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isFinished ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Time Info */}
          <div className="flex justify-between text-xs text-slate-500 mb-4">
            <span>Elapsed: {formatTime(elapsedSeconds)}</span>
            {!isFinished && <span>Remaining: ~{formatTime(remaining)}</span>}
          </div>

          {/* Live Log */}
          <div
            ref={logRef}
            className="bg-slate-900 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs text-slate-300 space-y-0.5"
          >
            {logLines.map((line, i) => (
              <div key={i} className={line.startsWith('---') ? 'text-emerald-400 font-semibold' : ''}>
                {line || '\u00A0'}
              </div>
            ))}
            {!isFinished && (
              <div className="text-indigo-400 animate-pulse">{'>'} waiting for response...</div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-5 flex justify-end">
            {isFinished ? (
              <button
                onClick={onClose}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Done
              </button>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Please wait — do not close this page
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
