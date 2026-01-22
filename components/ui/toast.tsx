import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, X, Info, AlertTriangle } from 'lucide-react'

export interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  onClose: () => void
  duration?: number
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border border-red-200 text-red-800'
      case 'info':
        return 'bg-blue-50 border border-blue-200 text-blue-800'
      case 'warning':
        return 'bg-yellow-50 border border-yellow-200 text-yellow-800'
      default:
        return 'bg-gray-50 border border-gray-200 text-gray-800'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
      case 'error':
        return <XCircle className="h-5 w-5 mr-3 text-red-600" />
      case 'info':
        return <Info className="h-5 w-5 mr-3 text-blue-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 mr-3 text-yellow-600" />
    }
  }

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg max-w-md ${getStyles()}`}>
      <div className="flex items-center">
        {getIcon()}
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-4 text-gray-400 hover:text-gray-600"
        aria-label="Toast schließen"
        title="Toast schließen"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Array<{
    id: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  }>>([])

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )

  return {
    showToast,
    ToastContainer
  }
}
