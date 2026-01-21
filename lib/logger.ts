// Simple in-memory logger for debugging Vercel deployments
export const runtimeLogs: string[] = []

export function log(message: string, data?: any) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8)
    const logMessage = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}`

    console.log(logMessage)

    // Keep only last 100 logs
    if (runtimeLogs.length > 100) {
        runtimeLogs.shift()
    }
    runtimeLogs.push(logMessage)
}

// Helper to get logs
export function getLogs() {
    return [...runtimeLogs].reverse()
}

