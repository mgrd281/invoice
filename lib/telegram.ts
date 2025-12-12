import { prisma } from '@/lib/prisma'

export async function sendTelegramMessage(token: string, chatId: number | string, text: string) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        })
    } catch (error) {
        console.error('Failed to send Telegram message:', error)
    }
}

export async function sendTelegramDocument(token: string, chatId: number | string, buffer: Buffer, filename: string, caption: string = '') {
    const url = `https://api.telegram.org/bot${token}/sendDocument`
    const formData = new FormData()

    // Create a Blob from the Buffer
    const blob = new Blob([buffer as any], { type: 'application/pdf' })
    formData.append('chat_id', chatId.toString())
    formData.append('document', blob, filename)
    if (caption) formData.append('caption', caption)

    try {
        await fetch(url, {
            method: 'POST',
            body: formData
        })
    } catch (error) {
        console.error('Failed to send Telegram document:', error)
    }
}

export async function getActiveTelegramSettings() {
    return await prisma.telegramSettings.findFirst({
        where: { isEnabled: true },
        include: { allowedUsers: true }
    })
}
