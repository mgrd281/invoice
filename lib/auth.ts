import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export interface User {
  id: number
  email: string
  name: string
  role: string
}

export interface AuthResult {
  isAuthenticated: boolean
  user: User | null
  error?: string
}

// دالة للتحقق من المصادقة من جانب الخادم
export async function getServerAuth(): Promise<AuthResult> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return {
        isAuthenticated: false,
        user: null,
        error: 'لا يوجد token'
      }
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    const decoded = jwt.verify(token, secret) as any

    // التحقق من انتهاء صلاحية الـ token
    if (decoded.exp && decoded.exp <= Math.floor(Date.now() / 1000)) {
      return {
        isAuthenticated: false,
        user: null,
        error: 'انتهت صلاحية الجلسة'
      }
    }

    const user: User = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name || 'مستخدم',
      role: decoded.role
    }

    return {
      isAuthenticated: true,
      user
    }

  } catch (error) {
    console.error('خطأ في التحقق من المصادقة:', error)
    return {
      isAuthenticated: false,
      user: null,
      error: 'خطأ في التحقق من المصادقة'
    }
  }
}

// دالة للتحقق من المصادقة من جانب العميل
export function getClientAuth(): AuthResult {
  try {
    if (typeof window === 'undefined') {
      return {
        isAuthenticated: false,
        user: null,
        error: 'لا يمكن الوصول للمتصفح'
      }
    }

    // قراءة معلومات المستخدم من cookie
    const userInfoCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user-info='))
      ?.split('=')[1]

    if (!userInfoCookie) {
      return {
        isAuthenticated: false,
        user: null,
        error: 'لا توجد معلومات مستخدم'
      }
    }

    const user = JSON.parse(decodeURIComponent(userInfoCookie)) as User

    return {
      isAuthenticated: true,
      user
    }

  } catch (error) {
    console.error('خطأ في قراءة معلومات المستخدم:', error)
    return {
      isAuthenticated: false,
      user: null,
      error: 'خطأ في قراءة معلومات المستخدم'
    }
  }
}

// دالة لتسجيل الخروج من جانب العميل
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      // إعادة تحميل الصفحة للتأكد من تطبيق التغييرات
      window.location.href = '/landing'
      return true
    } else {
      console.error('فشل في تسجيل الخروج')
      return false
    }

  } catch (error) {
    console.error('خطأ في تسجيل الخروج:', error)
    return false
  }
}

// دالة للتحقق من الصلاحيات
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'admin': 3,
    'manager': 2,
    'user': 1
  }

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

  return userLevel >= requiredLevel
}

// دالة للتحقق من ملكية المورد
export function canAccessResource(userId: number, resourceOwnerId: number, userRole: string): boolean {
  // المدير يمكنه الوصول لجميع الموارد
  if (userRole === 'admin') {
    return true
  }

  // المستخدم يمكنه الوصول لموارده فقط
  return userId === resourceOwnerId
}
