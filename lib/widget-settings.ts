
export interface WidgetSettings {
    primaryColor: string
    layout: 'list' | 'grid'
}

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
    primaryColor: '#2563eb',
    layout: 'list'
}

/**
 * Get Widget settings from storage
 */
export function getWidgetSettings(): WidgetSettings {
    if (typeof window === 'undefined') {
        // Server-side: load from file
        return loadWidgetSettingsFromFile()
    }

    // Client-side: load from localStorage
    const stored = localStorage.getItem('widget-settings')
    if (stored) {
        try {
            return { ...DEFAULT_WIDGET_SETTINGS, ...JSON.parse(stored) }
        } catch (error) {
            console.error('Error parsing Widget settings:', error)
        }
    }

    return DEFAULT_WIDGET_SETTINGS
}

/**
 * Save Widget settings to storage
 */
export function saveWidgetSettings(settings: WidgetSettings): void {
    if (typeof window === 'undefined') {
        // Server-side: save to file
        saveWidgetSettingsToFile(settings)
    } else {
        // Client-side: save to localStorage
        localStorage.setItem('widget-settings', JSON.stringify(settings))
    }
}

/**
 * Load settings from file (server-side)
 */
function loadWidgetSettingsFromFile(): WidgetSettings {
    try {
        const fs = require('fs')
        const path = require('path')

        const isVercel = process.env.VERCEL === '1'
        const settingsPath = isVercel
            ? path.join('/tmp', 'widget-settings.json')
            : path.join(process.cwd(), 'user-storage', 'widget-settings.json')

        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8')
            return { ...DEFAULT_WIDGET_SETTINGS, ...JSON.parse(data) }
        }
    } catch (error) {
        console.error('Error loading Widget settings from file:', error)
    }

    return DEFAULT_WIDGET_SETTINGS
}

/**
 * Save settings to file (server-side)
 */
function saveWidgetSettingsToFile(settings: WidgetSettings): void {
    try {
        const fs = require('fs')
        const path = require('path')

        const isVercel = process.env.VERCEL === '1'
        // On Vercel, we can only write to /tmp
        const userStorageDir = isVercel ? '/tmp' : path.join(process.cwd(), 'user-storage')
        const settingsPath = path.join(userStorageDir, 'widget-settings.json')

        // Create directory if it doesn't exist
        if (!fs.existsSync(userStorageDir)) {
            fs.mkdirSync(userStorageDir, { recursive: true })
        }

        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    } catch (error) {
        console.error('Error saving Widget settings to file:', error)
    }
}
