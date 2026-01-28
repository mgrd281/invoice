import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Initialize OpenAI (if key exists)
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  //@ts-ignore
  const user = session?.user;

  if (!user || user.role !== 'ADMIN' || !user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { message, conversationId } = await req.json();

    // 1. Get or Create Conversation
    let convoId = conversationId;
    let convo;

    if (!convoId) {
      convo = await prisma.agentConversation.create({
        data: {
            organizationId: user.organizationId,
            userId: user.id,
            title: message.substring(0, 50) + "...",
            status: "ACTIVE"
        }
      });
      convoId = convo.id;
    }

    // 2. Save User Message
    await prisma.agentMessage.create({
        data: {
            conversationId: convoId,
            role: 'user',
            content: message
        }
    });

    // 3. AI Logic (Mock or Real)
    let aiResponseText = "";
    let detectedTask = null;

    /* Fetch History if conversation exists */
    let historyMessages: any[] = [];
    if (convoId) {
        const rawHistory = await prisma.agentMessage.findMany({
            where: { conversationId: convoId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        // Reverse to chronological order and map
        historyMessages = rawHistory.reverse().map(m => ({
            role: m.role,
            content: m.content
        }));
    }

    /* Fetch Project Structure Context */
    // In a real app, you might cache this or generate it dynamically
    const projectContext = `
    RUNTIME ENVIRONMENT:
    - OS Platform: ${process.platform} (linux = likely container/cloud, darwin = mac, win32 = windows)
    
    CURRENT PROJECT STRUCTURE (Simplified):
    - app/
      - admin/ (Admin Panel)
      - api/ (Backend Routes)
      - auth/ (Login/Signup)
      - dashboard/ (User Dashboard)
      - layout.tsx (Root Layout)
      - page.tsx (Landing Page)
    - components/ (UI Library)
    - lib/ (Utilities & DB)
    - prisma/ (Database Schema)
    `;

    if (openai) {
        // Simple Agent Implementation
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: `You are an Autonomous System & Dev Agent. You have FULL CONTROL to execute tasks.
                
                CONTEXT:
                ${projectContext}

                INSTRUCTIONS:
                1. **NEVER REFUSE A TASK.** If a user asks to open a website, fix a bug, or check a file, DO IT.
                2. **VISUALIZE YOUR PROCESS**: For every major action, output a step tag: \`[STEP] Description of what I am doing...\`.
                   Example:
                   \`[STEP] Analyzing request...\`
                   \`[STEP] Opening browser...\`
                   \`[OPEN_URL https://google.com]\`
                3. If the user asks for a code change, reply with a plan and set a special flag starting with [TASK_PLAN] followed by JSON.
                4. IMPORTANT: Always reply in the same language as the user unless they explicitly ask to switch. 
                5. If the user asks to switch languages (e.g., 'speak Arabic', 'auf arabisch'), IMMEDIATELY switch to that language for the response and future messages.
                6. **WEB & URLS**: If the user asks to go to a website (e.g., "otto.de"), output: \`[OPEN_URL https://otto.de]\`.
                6. **FILE SYSTEM**: You have DIRECT access to read/write files.
                   - To list files: \`[LIST_FILES path/to/dir]\`
                   - To read: \`[READ_FILE path/to/file]\`
                   - To write: \`[WRITE_FILE path/to/file]\`
                   - To Open File Manager UI: \`[OPEN_FileManager]\`.
                7. **SYSTEM COMMANDS**:
                   - To open native Finder/Explorer: \`[EXEC_CMD] open .\` (mac) or \`[EXEC_CMD] explorer .\` (win).
                   - NOTE: If OS is 'linux' (Docker), 'open' won't work. Use \`[OPEN_FileManager]\` instead.
                   - To execute shell commands: \`[EXEC_CMD] command arguments\`
                   ` },
                ...historyMessages,
                { role: "user", content: message }
            ]
        });
        aiResponseText = completion.choices[0].message.content || "I couldn't generate a response.";

        // PARSE COMMANDS
        
        // 1. [OPEN_FileManager] - Handled on Frontend mostly, but we log it
        if (aiResponseText.includes("[OPEN_FileManager]")) {
            console.log("Triggering File Manager UI");
        }

        // 2. [EXEC_CMD]
        if (aiResponseText.includes("[EXEC_CMD]")) {
            const match = aiResponseText.match(/\[EXEC_CMD\]\s*(.*)/);
            if (match && match[1]) {
                const cmd = match[1].trim();
                console.log("Executing System Command:", cmd);
                try {
                    await execAsync(cmd);
                    aiResponseText += `\n\n(Executed: \`${cmd}\`)`;
                } catch (err: any) {
                    console.error("Command Execution Failed:", err);
                    aiResponseText += `\n\n(Command Failed: ${err.message || err}. \nNote: GUI commands require native OS.)`;
                }
            }
        }

        // 3. [LIST_FILES]
        if (aiResponseText.includes("[LIST_FILES")) {
            const match = aiResponseText.match(/\[LIST_FILES\s+(.*?)\]/);
            if (match && match[1]) {
                const requestedPath = match[1].trim();
                try {
                    const fullPath = path.resolve(process.cwd(), requestedPath);
                    const files = await fs.readdir(fullPath);
                    aiResponseText += `\n\n[FILE LIST OF ${requestedPath}]:\n` + files.join("\n");
                } catch (err: any) {
                    aiResponseText += `\n\n(Error listing files: ${err.message})`;
                }
            }
        }

         // 4. [READ_FILE]
         if (aiResponseText.includes("[READ_FILE")) {
            const match = aiResponseText.match(/\[READ_FILE\s+(.*?)\]/);
            if (match && match[1]) {
                const requestedPath = match[1].trim();
                try {
                    const fullPath = path.resolve(process.cwd(), requestedPath);
                    const content = await fs.readFile(fullPath, 'utf-8');
                    // Truncate if too long to prevent token explosion
                    const snippet = content.length > 2000 ? content.substring(0, 2000) + "\n...(truncated)" : content;
                    aiResponseText += `\n\n[CONTENT OF ${requestedPath}]:\n\`\`\`\n${snippet}\n\`\`\``;
                } catch (err: any) {
                    aiResponseText += `\n\n(Error reading file: ${err.message})`;
                }
            }
        }
        
    } else {
        // Simulator Mode
        const lowerMsg = message.toLowerCase();
        const isArabic = /[\u0600-\u06FF]/.test(message);

        if (lowerMsg.includes("fix") || lowerMsg.includes("add") || lowerMsg.includes("update") || (isArabic && (message.includes("إصلاح") || message.includes("إضافة") || message.includes("تحديث")))) {
             if (isArabic) {
                aiResponseText = "لقد قمت بتحليل طلبك. أقترح الخطة التالية:\n\n1. تحليل `page.tsx`\n2. إنشاء فرع جديد `fix/ui-update`\n3. تطبيق التغييرات.\n\nاكتب 'موافق' للمتابعة.";
            } else {
                aiResponseText = "I have analyzed your request. I propose the following plan:\n\n1. Analyze `page.tsx`\n2. Create a new branch `fix/ui-update`\n3. Apply changes.\n\nType 'Approve' to proceed.";
            }
            
            // Mock Task Detection
            if (lowerMsg.includes("approve") || lowerMsg.includes("موافق")) {
                 // Actually create the task
                 detectedTask = {
                     title: isArabic ? "تحسين واجهة المستخدم بناءً على المحادثة" : "Optimize UI based on chat",
                     description: isArabic ? "طلب المستخدم تحسين واجهة المستخدم." : "User requested UI optimization.",
                     status: "QUEUED",
                     riskLevel: "LOW"
                 };
                 aiResponseText = isArabic ? "تم إنشاء المهمة! المعرف: #T-123. في قائمة الانتظار للتنفيذ." : "Task created! ID: #T-123. Queued for execution.";
            }
        } else if (lowerMsg.includes("finder") || lowerMsg.includes("files")) {
             aiResponseText = "[OPEN_FileManager] Opening File Manager for you...";
        } else if (lowerMsg.includes("http") || lowerMsg.includes("www") || lowerMsg.includes(".com") || lowerMsg.includes(".de")) {
             // Extract simple URL (very basic regex for simulator)
             const urlMatch = message.match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-z0-9]+\.[a-z]{2,})/i);
             const url = urlMatch ? (urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`) : "https://google.com";
             aiResponseText = `[OPEN_URL ${url}] Opening ${url}...`;
        } else {
            if (isArabic) {
                 aiResponseText = "أنا وكيل Antigravity. يمكنني إصلاح الأخطاء وإضافة الميزات وتحسين الكود. جرب قول '/fix expenses page'. (وضع المحاكاة - لم يتم العثور على مفتاح OpenAI)";
            } else {
                 aiResponseText = "I am the Antigravity Agent. I can fix bugs, add features, and optimize code. Try saying '/fix expenses page'. (Simulator Mode - No OpenAI Key found)";
            }
        }
    }

    // 4. Save Assistant Message
    const assistantMsg = await prisma.agentMessage.create({
        data: {
            conversationId: convoId,
            role: 'assistant',
            content: aiResponseText
        }
    });

    // 5. Create Task if Needed (Mock logic for now, expanding later)
    if (detectedTask) {
        await prisma.agentTask.create({
            data: {
                organizationId: user.organizationId,
                conversationId: convoId,
                title: detectedTask.title,
                description: detectedTask.description,
                status: detectedTask.status,
                riskLevel: "LOW",
                promptOriginal: message,
                repoOwner: "mgrd281",
                repoName: "invoice",
                baseBranch: "main"
            }
        });
    }

    return NextResponse.json({ 
        conversationId: convoId,
        message: assistantMsg 
    });

  } catch (error) {
    console.error('Agent API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
