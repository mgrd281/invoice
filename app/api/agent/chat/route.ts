
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';

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
                { role: "system", content: `You are an autonomous dev agent embedded in an admin app. You can plan tasks. 
                
                CONTEXT:
                ${projectContext}

                INSTRUCTIONS:
                1. If the user asks for a code change, reply with a plan and set a special flag starting with [TASK_PLAN] followed by JSON.
                2. IMPORTANT: Always reply in the same language as the user unless they explicitly ask to switch. 
                3. If the user asks to switch languages (e.g., 'speak Arabic', 'auf arabisch'), IMMEDIATELY switch to that language for the response and future messages.
                4. BE AUTONOMOUS. Do not ask "which file?" if it's obvious from the project structure. make a reasonable assumption and proceed.
                5. SYSTEM ACCESS: You *can* execute system commands on the user's machine.
                   - To open Finder/Explorer: Output exactly \`[EXEC_CMD] open .\` (mac) or \`[EXEC_CMD] explorer .\` (win).
                   - To list files: \`[EXEC_CMD] ls -la\`
                   - Use this sparingly and only when requested (e.g., "Go to finder", "Show me files").` },
                ...historyMessages,
                { role: "user", content: message }
            ]
        });
        aiResponseText = completion.choices[0].message.content || "I couldn't generate a response.";

        // SYSTEM COMMAND EXECUTION
        if (aiResponseText.includes("[EXEC_CMD]")) {
            const match = aiResponseText.match(/\[EXEC_CMD\]\s*(.*)/);
            if (match && match[1]) {
                const cmd = match[1].trim();
                console.log("Executing System Command:", cmd);
                try {
                    await execAsync(cmd);
                    // Optionally append success message
                    // aiResponseText += "\n\n(System command executed successfully)";
                } catch (err) {
                    console.error("Command Execution Failed:", err);
                    aiResponseText += `\n\n(Error executing command: ${err})`;
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
