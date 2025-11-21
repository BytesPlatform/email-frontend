'use client'

import { useState, useEffect } from 'react'

interface QueuedEmail {
  id: number
  emailDraftId: number
  scheduledAt: string
  status: 'pending' | 'sent' | 'failed'
}

interface GamifiedQueueProgressProps {
  sentCount: number
  totalQueued: number
  pendingCount: number
  progressPercentage: number
  queuedEmails: QueuedEmail[]
  countdown: number // milliseconds until next email
}

export function GamifiedQueueProgress({
  sentCount,
  totalQueued,
  pendingCount,
  progressPercentage,
  queuedEmails,
  countdown: initialCountdown,
}: GamifiedQueueProgressProps) {
  const [countdown, setCountdown] = useState(initialCountdown)
  const [initialTime, setInitialTime] = useState(initialCountdown)
  const [currentProgress, setCurrentProgress] = useState(0)

  // Update countdown and initial time when it changes
  useEffect(() => {
    setCountdown(initialCountdown)
    setInitialTime(initialCountdown)
  }, [initialCountdown])

  // Update countdown every second and calculate progress
  useEffect(() => {
    // If countdown is 0 or less, set progress to 100% and stop updating
    if (countdown <= 0) {
      setCurrentProgress(100)
      return
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        const next = prev - 1000
        return next > 0 ? next : 0
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [countdown, initialCountdown])

  // Calculate progress based on countdown timer or completion status
  useEffect(() => {
    // If batch is complete (all sent), show 100%
    if (pendingCount === 0 && sentCount > 0) {
      setCurrentProgress(100)
      return
    }
    
    // Otherwise use countdown-based progress
    if (initialTime > 0 && countdown > 0) {
      // Progress = (time elapsed / total time) * 100
      // Time elapsed = initialTime - countdown
      const timeElapsed = initialTime - countdown
      const progress = Math.min(100, (timeElapsed / initialTime) * 100)
      setCurrentProgress(progress)
    } else if (countdown <= 0 && initialTime > 0) {
      // When countdown reaches 0, show 100% progress
      setCurrentProgress(100)
    } else {
      setCurrentProgress(0)
    }
  }, [countdown, initialTime, pendingCount, sentCount])

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00'
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Check if batch is complete (all sent)
  const isBatchComplete = pendingCount === 0 && sentCount > 0
  
  // Calculate batch analytics if complete
  let batchAnalytics: { totalSent: number; timeTaken: string; startTime: string; endTime: string } | null = null
  if (isBatchComplete && queuedEmails.length > 0) {
    const sentEmails = queuedEmails.filter(q => q.status === 'sent').sort((a, b) => 
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )
    if (sentEmails.length > 0) {
      const firstSent = new Date(sentEmails[0].scheduledAt)
      const lastSent = new Date(sentEmails[sentEmails.length - 1].scheduledAt)
      const timeTaken = lastSent.getTime() - firstSent.getTime()
      
      batchAnalytics = {
        totalSent: sentCount,
        timeTaken: formatDuration(timeTaken),
        startTime: firstSent.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        endTime: lastSent.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      }
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Schedule Progress
            </h3>
            <p className="text-sm text-gray-600">
              {sentCount} / {totalQueued} sent • {pendingCount} pending
            </p>
          </div>
          
          {/* Countdown Timer or Analytics */}
          {isBatchComplete && batchAnalytics ? (
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                Batch Complete
              </div>
              <div className="text-sm font-semibold text-green-600">
                ✓ All Sent
              </div>
            </div>
          ) : (
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                Next Email In
              </div>
              <div className="text-xl font-semibold text-gray-900 font-mono">
                {formatCountdown(countdown)}
              </div>
            </div>
          )}
        </div>

        {/* Professional Progress Bar */}
        <div className="relative mb-6">
          {/* Background track */}
          <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
            {/* Progress fill */}
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                isBatchComplete ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${isBatchComplete ? 100 : currentProgress}%` }}
            />
          </div>
          
          {/* Progress percentage indicator */}
          <div className="flex justify-between items-center mt-2">
            <span className={`text-xs font-medium ${
              isBatchComplete ? 'text-green-600' : 'text-gray-500'
            }`}>
              {isBatchComplete ? '100% Complete' : `${Math.round(currentProgress)}% Complete`}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Email Delivery</span>
            </div>
          </div>
        </div>

        {/* Batch Analytics (when complete) or Simplified Timeline */}
        {isBatchComplete && batchAnalytics ? (
          <div className="border-t border-gray-100 pt-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-1">
                    Batch Completed Successfully
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-gray-900">{batchAnalytics.totalSent}</span> emails sent
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-gray-900">{batchAnalytics.timeTaken}</span> total time
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{batchAnalytics.startTime} - {batchAnalytics.endTime}</div>
                </div>
              </div>
            </div>
          </div>
        ) : queuedEmails.length > 0 ? (
          <div className="border-t border-gray-100 pt-4">
            {/* Simplified Timeline - Just show summary */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  {(() => {
                    const firstEmail = queuedEmails[0]
                    const lastEmail = queuedEmails[queuedEmails.length - 1]
                    const firstDate = new Date(firstEmail.scheduledAt)
                    const lastDate = new Date(lastEmail.scheduledAt)
                    const firstStr = firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    const lastStr = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    
                    if (firstStr === lastStr) {
                      return `Scheduled for ${firstStr}`
                    }
                    return `Scheduled from ${firstStr} to ${lastStr}`
                  })()}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {sentCount} sent • {pendingCount} pending
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
