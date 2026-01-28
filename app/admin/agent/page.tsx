'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Bot, User as UserIcon, Terminal, Play, Pause, AlertTriangle, CheckCircle, Clock, GitBranch, Folder, X, FileCode, CornerLeftUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AgentPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Poll for tasks
    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, 5000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/agent/tasks');
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const tempMsg = { id: Date.now(), role: 'user', content: input };
        setMessages(prev => [...prev, tempMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: tempMsg.content, conversationId })
            });
            const data = await res.json();
            
            if (data.conversationId) setConversationId(data.conversationId);
            if (data.message) {
                setMessages(prev => [...prev, data.message]);
            }
        } catch (e) {
            toast.error("Failed to send message");
        } finally {
            setIsLoading(false);
            fetchTasks(); // Refresh tasks immediately
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // File Manager State
    const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
    const [currentPath, setCurrentPath] = useState(".");
    const [files, setFiles] = useState<any[]>([]);
    const [viewingFile, setViewingFile] = useState<{path: string, content: string} | null>(null);

    // Watch for Agent Commands
    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'assistant' && lastMsg.content.includes("[OPEN_FileManager]")) {
                setIsFileManagerOpen(true);
                fetchFiles(".");
            }
        }
    }, [messages]);

    const fetchFiles = async (pathStr: string) => {
        try {
            const res = await fetch('/api/agent/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'LIST', path: pathStr })
            });
            const data = await res.json();
            if (data.files) {
                setFiles(data.files);
                setCurrentPath(data.cwd);
            }
        } catch (e) {
            toast.error("Failed to load files");
        }
    };

    const loadFileContent = async (pathStr: string) => {
        try {
            const res = await fetch('/api/agent/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'READ', path: pathStr })
            });
            const data = await res.json();
            if (data.content !== undefined) {
                setViewingFile({ path: pathStr, content: data.content });
            }
        } catch (e) {
            toast.error("Failed to read file");
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#F7F8FC] relative">
            {/* FILE MANAGER MODAL */}
            {isFileManagerOpen && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-8">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-slate-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Folder className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">File Manager</h3>
                                    <p className="text-xs text-slate-500 font-mono">/{currentPath}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setIsFileManagerOpen(false)}>
                                <X className="w-5 h-5 text-slate-400" />
                            </Button>
                        </div>
                        
                        <div className="flex-1 flex overflow-hidden">
                            {/* File List */}
                            <div className={cn("flex-1 overflow-y-auto p-2 space-y-1 bg-white", viewingFile ? "w-1/3 border-r border-slate-100 hidden md:block" : "w-full")}>
                                {currentPath !== "." && (
                                    <div 
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer text-slate-600"
                                        onClick={() => fetchFiles(currentPath.split('/').slice(0, -1).join('/') || '.')}
                                    >
                                        <CornerLeftUp className="w-4 h-4" />
                                        <span className="text-sm font-medium">..</span>
                                    </div>
                                )}
                                {files.sort((a,b) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1)).map((file: any) => (
                                    <div 
                                        key={file.path}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                                        onClick={() => file.isDirectory ? fetchFiles(file.path) : loadFileContent(file.path)}
                                    >
                                        {file.isDirectory ? (
                                            <Folder className="w-4 h-4 text-amber-400 fill-amber-400" />
                                        ) : (
                                            <FileCode className="w-4 h-4 text-blue-500" />
                                        )}
                                        <span className="text-sm text-slate-700 font-medium group-hover:text-violet-600 truncate">{file.name}</span>
                                    </div>
                                ))}
                            </div>

                            {/* File Preview */}
                            {viewingFile && (
                                <div className="flex-[2] flex flex-col bg-slate-50">
                                    <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-white">
                                        <span className="text-xs font-mono text-slate-500 h-6 flex items-center">{viewingFile.path}</span>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setViewingFile(null)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <ScrollArea className="flex-1 p-4">
                                        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">{viewingFile.content}</pre>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT: CHAT AREA (60%) */}
            <div className="flex-1 flex flex-col border-r border-slate-200 bg-white">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">Antigravity Agent</h2>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-xs text-slate-500 font-medium">Online • 24/7 Runner Active</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <Button variant="ghost" size="icon" onClick={() => { setIsFileManagerOpen(true); fetchFiles("."); }} title="Open File Context">
                             <Folder className="w-4 h-4 text-slate-500" />
                         </Button>
                         <Button variant="outline" size="sm" onClick={() => setMessages([])}>
                            Clear Chat
                         </Button>
                    </div>
                </div>
                {/* ... existing chat UI ... */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
                    {/* ... existing messages map ... */}
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                            <Bot className="w-16 h-16 mb-4 opacity-20" />
                            <h3 className="text-lg font-semibold text-slate-600">Ready to help</h3>
                            <p className="max-w-md mt-2">I can fix bugs, scaffold features, and run tests. Try commands like:</p>
                            <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                <Button variant="secondary" size="sm" onClick={() => setInput("/fix existing bug")}>/fix</Button>
                                <Button variant="secondary" size="sm" onClick={() => setInput("/add-feature name")}>/add-feature</Button>
                                <Button variant="secondary" size="sm" onClick={() => setInput("/refactor component")}>/refactor</Button>
                            </div>
                        </div>
                    )}
                    
                    {messages.map((msg, i) => (
                        <div key={i} className={cn("flex gap-3 max-w-3xl", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0", 
                                msg.role === 'user' ? "bg-slate-200" : "bg-violet-600 text-white"
                            )}>
                                {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-slate-600" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={cn(
                                "p-4 rounded-2xl text-sm shadow-sm whitespace-pre-wrap",
                                msg.role === 'user' 
                                    ? "bg-white border border-slate-200 text-slate-800" 
                                    : "bg-white border border-violet-100 text-slate-800 shadow-violet-100"
                            )} dir="auto">
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white shrink-0">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="p-4 rounded-2xl bg-white border border-violet-100 shadow-sm">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-200">
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe a task or fix..."
                            className="w-full min-h-[50px] max-h-[150px] p-3 pr-12 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                            dir="auto"
                            rows={1}
                        />
                        <Button 
                            className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-lg bg-violet-600 hover:bg-violet-700" 
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                        >
                            <Send className="w-4 h-4 text-white" />
                        </Button>
                    </div>
                    <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <Terminal className="w-3 h-3" />
                             <span>Antigravity Engine v2.0 • PR-Only Mode</span>
                        </div>
                        <button onClick={() => fetch('/api/agent/engine', { method: 'POST' }).then(() => fetchTasks())} className="text-[10px] text-slate-300 hover:text-violet-500 underline">
                            Force Run Queue
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT: TASK INSPECTOR (40%) */}
            <div className="w-[400px] border-l border-slate-200 bg-slate-50 flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-white">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-violet-600" />
                        Task Inspector
                    </h3>
                    <p className="text-xs text-slate-500">Live execution logs and PR status</p>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {tasks.length === 0 && (
                            <div className="text-center text-slate-400 py-10">
                                <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>No active tasks</p>
                            </div>
                        )}

                        {tasks.map(task => (
                            <Card key={task.id} className="overflow-hidden border-slate-200 shadow-none hover:shadow-md transition-shadow">
                                <CardHeader className="p-4 pb-2 bg-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="outline" className={cn(
                                            "text-xs font-bold uppercase",
                                            task.status === 'QUEUED' ? "bg-slate-100 text-slate-600 border-slate-200" :
                                            task.status === 'RUNNING' ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" :
                                            task.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                            "bg-red-50 text-red-700 border-red-200"
                                        )}>
                                            {task.status}
                                        </Badge>
                                        <span className="text-[10px] text-slate-400 font-mono">#{task.id.substring(0,6)}</span>
                                    </div>
                                    <CardTitle className="text-sm font-bold text-slate-800 leading-tight">
                                        {task.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-2 bg-white">
                                    <div className="space-y-3">
                                        <div className="text-xs text-slate-500 line-clamp-2">
                                            {task.description || "No description provided."}
                                        </div>
                                        
                                        {/* Progress Steps (Mock) */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 text-xs">
                                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                                <span className="text-slate-600 line-through">Draft Plan</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <Clock className="w-3 h-3 text-blue-500" />
                                                <span className="text-slate-800 font-medium">Running Tests...</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs opacity-50">
                                                <GitBranch className="w-3 h-3" />
                                                <span>Create PR</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                            {task.status === 'RUNNING' ? (
                                                <Button variant="destructive" size="sm" className="h-7 text-xs w-full">Cancel</Button>
                                            ) : task.status === 'COMPLETED' ? (
                                                  <Button variant="outline" size="sm" className="h-7 text-xs w-full text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
                                                    <GitBranch className="w-3 h-3 mr-1" /> View PR
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" className="h-7 text-xs w-full">Details</Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
