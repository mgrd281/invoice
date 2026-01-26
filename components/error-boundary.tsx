'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from './ui/button'

interface Props {
    children?: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="p-8 text-center bg-red-50 border border-red-100 rounded-3xl space-y-4">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase">Komponenten-Fehler</h3>
                        <p className="text-xs text-slate-500 mt-1">Dieser Teil der Seite konnte nicht geladen werden.</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => this.setState({ hasError: false })}
                        className="h-8 px-4 font-black text-[10px] uppercase border-red-200 text-red-600 hover:bg-red-100"
                    >
                        <RefreshCcw className="w-3 h-3 mr-2" /> Neu laden
                    </Button>
                </div>
            )
        }

        return this.props.children
    }
}
