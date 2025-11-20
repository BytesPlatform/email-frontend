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
  const [currentProgress, setCurrentProgress] = useState(progressPercentage)

  // Update countdown every second
  useEffect(() => {
    setCountdown(initialCountdown)
  }, [initialCountdown])

  useEffect(() => {
    if (countdown <= 0) return

    const interval = setInterval(() => {
      setCountdown(prev => {
        const next = prev - 1000
        return next > 0 ? next : 0
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [countdown])

  // Animate progress smoothly
  useEffect(() => {
    setCurrentProgress(progressPercentage)
  }, [progressPercentage])

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00'
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      <div className="relative bg-gradient-to-br from-indigo-50 via-indigo-100 to-blue-50 p-6">
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(99, 102, 241, 0.1) 20px, rgba(99, 102, 241, 0.1) 21px),
              repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(99, 102, 241, 0.1) 20px, rgba(99, 102, 241, 0.1) 21px)
            `
          }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Queue Progress
              </h3>
              <p className="text-sm text-gray-600">
                {sentCount} / {totalQueued} sent • {pendingCount} pending
              </p>
            </div>
            
            {/* Countdown Timer */}
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1 font-medium">Next Email In</div>
              <div className="text-2xl font-bold text-indigo-600 font-mono tracking-wider">
                {formatCountdown(countdown)}
              </div>
            </div>
          </div>

          {/* Delivery-style Progress Line */}
          <div className="relative mb-4">
            {/* Background track */}
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              {/* Progress fill */}
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${currentProgress}%` }}
              >
                {/* Shimmer effect */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={{ 
                    animation: 'shimmer 2s infinite linear',
                    transform: 'translateX(-100%)',
                  }}
                ></div>
              </div>
              
              {/* Moving mail icon at the tip of progress */}
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
                style={{ 
                  left: `calc(${currentProgress}% - 16px)`,
                  transform: `translateY(-50%) ${currentProgress > 0 ? 'scale(1)' : 'scale(0)'}`,
                }}
              >
                <div className="relative">
                  {/* Mail icon with animation */}
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-110">
                    <svg 
                      className="w-5 h-5 text-white" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                      />
                    </svg>
                  </div>
                  {/* Pulse effect */}
                  <div className="absolute inset-0 bg-indigo-400 rounded-lg animate-ping opacity-75"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress milestones (like delivery stops) */}
          {queuedEmails.length > 0 && (
            <div className="relative mt-6">
              {/* Milestone markers */}
              <div className="flex justify-between items-start">
                {queuedEmails.map((queued, index) => {
                  const scheduledDate = new Date(queued.scheduledAt)
                  const timeStr = scheduledDate.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })
                  const isSent = queued.status === 'sent'
                  const position = queuedEmails.length > 1 
                    ? (index / (queuedEmails.length - 1)) * 100 
                    : 50
                  const isPassed = position <= currentProgress
                  
                  return (
                    <div 
                      key={queued.id} 
                      className="flex flex-col items-center flex-1"
                      style={{ maxWidth: queuedEmails.length > 1 ? `${100 / queuedEmails.length}%` : '100%' }}
                    >
                      {/* Milestone dot */}
                      <div className="relative mb-2">
                        <div 
                          className={`w-3 h-3 rounded-full transition-all duration-500 ${
                            isSent
                              ? 'bg-green-500 shadow-lg shadow-green-500/50'
                              : isPassed
                              ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50'
                              : 'bg-gray-300'
                          }`}
                        />
                        {isSent && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* Time label */}
                      <div className={`text-xs font-medium text-center transition-colors ${
                        isSent 
                          ? 'text-green-600' 
                          : isPassed 
                          ? 'text-indigo-600' 
                          : 'text-gray-500'
                      }`}>
                        {timeStr}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline style for shimmer animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(200%);
            }
          }
        `
      }} />
    </div>
  )
}
