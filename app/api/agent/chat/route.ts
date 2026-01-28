
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

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

    if (openai) {
        // Simple Agent Implementation
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: "You are an autonomous dev agent embedded in an admin app. You can plan tasks. If the user asks for a code change, reply with a plan and set a special flag starting with [TASK_PLAN] followed by JSON. IMPORTANT: Always reply in the same language as the user. If the user speaks Arabic, reply in Arabic. If the user speaks German, reply in German." },
                { role: "user", content: message }
            ]
        });
        aiResponseText = completion.choices[0].message.content || "I couldn't generate a response.";
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
