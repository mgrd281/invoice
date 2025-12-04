import { useAuth } from '@/hooks/use-auth-compat'

// Helper function to create authenticated API requests
export function createAuthenticatedRequest(user: any) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'x-user-info': JSON.stringify(user)
    }
  }
}

// Custom hook for authenticated API calls
export function useAuthenticatedFetch() {
  const { user } = useAuth()

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    if (!user) {
      console.warn('⚠️ useAuthenticatedFetch called without authenticated user')
      // For login/register pages, just use regular fetch
      return fetch(url, options)
    }

    const authHeaders = createAuthenticatedRequest(user)
    
    const mergedOptions: RequestInit = {
      ...options,
      headers: {
        ...authHeaders.headers,
        ...options.headers
      }
    }

    return fetch(url, mergedOptions)
  }

  return authenticatedFetch
}

// Utility function for non-hook contexts
export function createAuthenticatedFetchOptions(user: any, options: RequestInit = {}): RequestInit {
  if (!user) {
    throw new Error('User not authenticated')
  }

  const authHeaders = createAuthenticatedRequest(user)
  
  return {
    ...options,
    headers: {
      ...authHeaders.headers,
      ...options.headers
    }
  }
}
