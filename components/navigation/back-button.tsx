'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BackButtonProps {
    fallbackUrl?: string
    label?: string
    variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
    className?: string
    showIcon?: boolean
}

export function BackButton({
    fallbackUrl = '/',
    label = 'Zurück',
    variant = 'ghost',
    className,
    showIcon = true
}: BackButtonProps) {
    const router = useRouter()

    const handleBack = () => {
        // Check if there's history to go back to
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
        } else {
            // No history, go to fallback
            router.push(fallbackUrl)
        }
    }

    return (
        <Button
            variant={variant}
            onClick={handleBack}
            className={cn('gap-2', className)}
        >
            {showIcon && <ArrowLeft className="h-4 w-4" />}
            {label}
        </Button>
    )
}
