'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClientAuth, User } from '@/lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  fallback?: React.ReactNode
}

export default function ProtectedRoute({ 
  children, 
  requiredRole,
  fallback 
}: ProtectedRouteProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const authResult = getClientAuth()
      
      setIsAuthenticated(authResult.isAuthenticated)
      setUser(authResult.user)

      if (!authResult.isAuthenticated) {
        // إعادة توجيه إلى صفحة تسجيل الدخول
        router.push('/landing')
        return
      }

      // التحقق من الصلاحيات إذا كانت مطلوبة
      if (requiredRole && authResult.user) {
        const roleHierarchy = {
          'admin': 3,
          'manager': 2,
          'user': 1
        }

        const userLevel = roleHierarchy[authResult.user.role as keyof typeof roleHierarchy] || 0
        const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

        if (userLevel < requiredLevel) {
          // المستخدم لا يملك الصلاحيات المطلوبة
          router.push('/dashboard') // إعادة توجيه إلى الصفحة الرئيسية
          return
        }
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [router, requiredRole])

  // عرض شاشة التحميل
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري التحقق من الصلاحيات...</p>
          </div>
        </div>
      )
    )
  }

  // عرض المحتوى المحمي
  if (isAuthenticated && user) {
    return <>{children}</>
  }

  // في حالة عدم وجود مصادقة (لن يحدث عادة بسبب إعادة التوجيه)
  return null
}

// مكون للتحقق من الصلاحيات فقط (بدون إعادة توجيه)
interface RoleGuardProps {
  children: React.ReactNode
  requiredRole: string
  fallback?: React.ReactNode
  user?: User | null
}

export function RoleGuard({ children, requiredRole, fallback, user }: RoleGuardProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(user || null)

  useEffect(() => {
    if (!user) {
      const authResult = getClientAuth()
      setCurrentUser(authResult.user)
    }
  }, [user])

  if (!currentUser) {
    return fallback || null
  }

  const roleHierarchy = {
    'admin': 3,
    'manager': 2,
    'user': 1
  }

  const userLevel = roleHierarchy[currentUser.role as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

  if (userLevel >= requiredLevel) {
    return <>{children}</>
  }

  return fallback || null
}
