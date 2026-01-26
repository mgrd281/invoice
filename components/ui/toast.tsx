'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Check, XCircle, X, Info, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastProps {
  id: string
  title?: string
  description?: string
  message?: string // Compatibility for old API
  type: 'success' | 'error' | 'info' | 'warning' | 'loading'
  onClose: (id: string) => void
  duration?: number
  variant?: 'standard' | 'premium'
  action?: ToastAction
}

export function Toast({
  id,
  title,
  description,
  message,
  type,
  onClose,
  duration = 5000,
  variant = 'standard',
  action
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const remainingRef = useRef<number>(duration)

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => onClose(id), 300) // Wait for exit animation
  }, [id, onClose])

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now()
    timerRef.current = setTimeout(handleClose, remainingRef.current)
  }, [handleClose])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      remainingRef.current -= Date.now() - startTimeRef.current
    }
  }, [])

  useEffect(() => {
    startTimer()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [startTimer])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Check className="h-4 w-4 text-emerald-500" />
          </div>
        )
      case 'error':
        return (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
        )
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  // Premium Black Style as requested
  if (variant === 'premium') {
    return (
      <div
        role="status"
        aria-live="polite"
        onMouseEnter={clearTimer}
        onMouseLeave={startTimer}
        className={cn(
          "relative group w-[360px] sm:w-[420px] bg-[#0B0F19] border border-white/10 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all duration-300 transform",
          isVisible ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"
        )}
      >
        <div className="flex gap-4">
          {getIcon()}

          <div className="flex-1 min-w-0 pr-2">
            {title && (
              <h4 className="text-sm font-bold text-white leading-tight mb-1">
                {title}
              </h4>
            )}
            <p className="text-[13px] font-medium text-gray-400 leading-snug">
              {description || message}
            </p>

            {action && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  action.onClick()
                }}
                className="mt-3 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-all"
              >
                {action.label}
              </button>
            )}
          </div>

          <button
            onClick={handleClose}
            className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            aria-label="Schließen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress Bar (Auto-dismiss cue) */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-white/5 w-full overflow-hidden rounded-b-2xl">
          {/* Visual cue only, active bar could be added here if desired */}
        </div>
      </div>
    )
  }

  // Fallback to Standard Style
  const standardStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    loading: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  return (
    <div
      className={cn(
        "flex items-center p-4 rounded-xl border shadow-lg max-w-md transition-all duration-300",
        standardStyles[type] || standardStyles.info,
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="flex items-center">
        {type === 'success' ? <Check className="h-5 w-5 mr-3 text-green-600" /> : getIcon()}
        <p className="text-sm font-medium">{description || message}</p>
      </div>
      <button onClick={handleClose} className="ml-4 text-gray-400 hover:text-gray-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastOptions {
  title?: string
  description?: string
  variant?: 'standard' | 'premium'
  duration?: number
  action?: ToastAction
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Array<ToastProps>>([])

  const showToast = (message: string, type: ToastProps['type'] = 'info', options?: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastProps = {
      id,
      message,
      type,
      title: options?.title,
      description: options?.description,
      variant: options?.variant || 'standard',
      duration: options?.duration,
      action: options?.action,
      onClose: removeToast
    }
    setToasts(prev => [...prev.slice(-4), newToast]) // Limit to last 5 toasts
    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // ToastContainer component
  const ToastContainer = () => (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} />
        </div>
      ))}
    </div>
  )

  return {
    showToast,
    toasts,
    removeToast,
    ToastContainer
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { ToastContainer } = useToast()

  return (
    <>
      {children}
      <ToastContainer />
    </>
  )
}
