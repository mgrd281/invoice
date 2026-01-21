'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export function NavigationManager() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isNavigating, setIsNavigating] = useState(false)

    // 1. Scroll Restoration Logic
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Save scroll position for the current page
            sessionStorage.setItem(`scroll-${window.location.pathname}${window.location.search}`, window.scrollY.toString())
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        // Check if we have a saved scroll position for the current page
        const fullPath = `${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`
        const savedPosition = sessionStorage.getItem(`scroll-${fullPath}`) || sessionStorage.getItem(`scroll-${pathname}`)

        if (savedPosition) {
            // Small delay to allow content to load
            setTimeout(() => {
                window.scrollTo({
                    top: parseInt(savedPosition),
                    behavior: 'instant'
                })
            }, 50)
        } else {
            // Only scroll to top if the pathname itself changed (new page)
            // If it's just search params changing, we might want to stay where we are
            // unless it's a pagination event.
            window.scrollTo(0, 0)
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [pathname]) // Only trigger on pathname change, not searchParams

    // 2. Clear stale scroll positions regularly
    useEffect(() => {
        // Basic cleanup: remove oldest items if too many
        const keys = Object.keys(sessionStorage).filter(key => key.startsWith('scroll-'))
        if (keys.length > 50) {
            keys.sort().slice(0, 20).forEach(key => sessionStorage.removeItem(key))
        }
    }, [])

    return null // This is a logic-only component
}
