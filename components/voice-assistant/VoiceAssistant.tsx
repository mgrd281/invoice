'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, X, Loader2, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';

import { useToast } from '@/components/ui/use-toast';

export function VoiceAssistant() {
    const { showToast } = useToast();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING'>('IDLE');
    const [transcript, setTranscript] = useState('');
    const [reply, setReply] = useState('');

    // Refs for safe access in closures
    const transcriptRef = useRef('');
    const activeRef = useRef(false);

    // Refs for recognition instances
    const recognitionRef = useRef<any>(null);
    const wakeWordRef = useRef<any>(null);

    // --- WAKE WORD LOGIC (HYBRID) ---
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const wakeWordRecognition = new SpeechRecognition();
        wakeWordRecognition.lang = 'en-US';
        wakeWordRecognition.continuous = true;
        wakeWordRecognition.interimResults = true;

        wakeWordRecognition.onresult = (event: any) => {
            if (activeRef.current) return;

            const current = event.resultIndex;
            const text = event.results[current][0].transcript.toLowerCase();
            console.log("Wake Word Stream:", text);

            // Normalize text to check for keywords
            const normalizedText = text.replace(/[^a-zA-Z\s]/g, "");

            // Check for wake words
            if (normalizedText.includes('kari') || normalizedText.includes('nex')) {
                wakeWordRecognition.stop();

                // HYBRID CHECK: Did user say "KariNex [command]"?
                // Split by wake word and check if there is a tail
                const lowerText = text.toLowerCase();
                let commandTail = "";

                if (lowerText.includes("siri")) {
                    commandTail = lowerText.split("siri")[1].trim();
                } else if (lowerText.includes("serie")) {
                    commandTail = lowerText.split("serie")[1].trim();
                } else if (lowerText.includes("seari")) {
                    commandTail = lowerText.split("seari")[1].trim();
                } else if (lowerText.includes("ceari")) {
                    commandTail = lowerText.split("ceari")[1].trim();
                }

                if (commandTail && commandTail.length > 2) {
                    console.log("Hybrid Command Detected:", commandTail);
                    // Process immediately!
                    setIsOpen(true);
                    setTranscript(commandTail);
                    processCommand(commandTail);
                } else {
                    // Just open and listen
                    startListening();
                }
            }
        };

        wakeWordRecognition.onend = () => {
            if (!activeRef.current) {
                try { wakeWordRecognition.start(); } catch (e) { /* ignore */ }
            }
        };

        wakeWordRef.current = wakeWordRecognition;

        try { wakeWordRecognition.start(); } catch (e) { /* ignore */ }

        return () => {
            if (wakeWordRef.current) wakeWordRef.current.stop();
        };
    }, []);

    // Ensure wake word stops/starts based on active state
    useEffect(() => {
        if (isOpen) {
            if (wakeWordRef.current) wakeWordRef.current.stop();
        } else {
            setTimeout(() => {
                if (wakeWordRef.current && !activeRef.current) {
                    try { wakeWordRef.current.start(); } catch (e) { }
                }
            }, 500);
        }
    }, [isOpen]);


    // Safety: Reset processing if stuck
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (status === 'PROCESSING') {
            timeout = setTimeout(() => {
                if (status === 'PROCESSING') {
                    console.warn("Safety Reset: Stuck in PROCESSING");
                    setStatus('IDLE');
                    setReply("Zeitüberschreitung.");
                }
            }, 10000);
        }
        return () => clearTimeout(timeout);
    }, [status]);

    // --- MAIN COMMAND LOGIC ---

    const startListening = () => {
        setIsOpen(true);
        setStatus('LISTENING');
        setTranscript('');
        setReply('');
        transcriptRef.current = '';
        activeRef.current = true;

        // Optional Ping Sound
        // const audio = new Audio('/sounds/ping.mp3');
        // audio.play().catch(e => {});

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setReply('Browser nicht unterstützt / Browser not supported.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = navigator.language || 'de-DE';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
            const current = event.resultIndex;
            const transcriptText = event.results[current][0].transcript;
            setTranscript(transcriptText);
            transcriptRef.current = transcriptText;
        };

        recognition.onend = () => {
            const finalTranscript = transcriptRef.current;

            if (activeRef.current && finalTranscript.length > 1) {
                processCommand(finalTranscript);
            } else {
                if (status === 'LISTENING') {
                    setStatus('IDLE');
                    activeRef.current = false;
                }
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
    };

    const stopListening = () => {
        activeRef.current = false;
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setStatus('IDLE');
    };

    const processCommand = async (text: string) => {
        setStatus('PROCESSING');
        activeRef.current = false;

        console.log("Sending command:", text);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const res = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await res.json();
            console.log("Received AI Response:", data);

            // --- INSTANT NAVIGATION OPTIMIZATION ---
            if (data.intent === 'NAVIGATE' && data.payload?.route) {
                console.log("Navigating to:", data.payload.route);
                router.push(data.payload.route);

                // Close IMMEDIATELY
                setIsOpen(false);
                stopListening();
                return;
            }

            // --- CHAT & Q_AND_A MODE ---
            // If it's a CHAT or Q_AND_A, we want to KEEP the window open so user can hear the reply.
            if (data.intent === 'CHAT' || data.intent === 'Q_AND_A') {
                console.log("Chat/Q&A Mode - Keeping window open");
            }

            if (data.reply) {
                // For NAVIGATE commands, force silence even if backend sent a reply
                if (data.intent !== 'NAVIGATE') {
                    console.log("Speaking reply for intent:", data.intent);
                    setReply(data.reply);
                    const shouldAutoListen = data.intent === 'CHAT' || data.intent === 'Q_AND_A';
                    speak(data.reply, data.language, shouldAutoListen);
                } else {
                    console.log("Navigation intent detected, suppressing speech.");
                    setIsOpen(false);
                }
            }

            if (data.intent === 'ACTION') {
                const { command, payload } = data;

                if (command === 'NAVIGATE') {
                    // Fallback if LLM returns NAVIGATE command inside ACTION intent
                    if (payload?.route) {
                        router.push(payload.route);
                        setIsOpen(false);
                        stopListening();
                        return;
                    }
                }

                if (command === 'SEND_INVOICE') {
                    showToast(
                        `E-Mail gesendet: Rechnung ${payload.id || '?'} wurde an ${payload.recipient || 'Kunde'} gesendet.`,
                        "success"
                    );
                }

                else if (command === 'CREATE_INVOICE') {
                    const params = new URLSearchParams();
                    params.set('action', 'new-invoice');
                    if (payload.amount) params.set('amount', payload.amount);
                    router.push(`/dashboard?${params.toString()}`);
                }

                else if (command === 'FILTER_INVOICES') {
                    const params = new URLSearchParams();
                    if (payload.status) params.set('status', payload.status);
                    if (payload.date_range) params.set('date', payload.date_range);
                    router.push(`/invoices?${params.toString()}`);
                    setIsOpen(false);
                }

                else if (command === 'EXPORT_DATA') {
                    showToast(
                        `Export gestartet: ${payload.scope} (${payload.format})`,
                        "info"
                    );
                }

                else if (command === 'UPDATE_INVOICE') {
                    const { id, status } = payload;
                    // Map STATUS to Frontend German Format for the API
                    let germanStatus = 'Offen';
                    if (status === 'PAID') germanStatus = 'Bezahlt';
                    if (status === 'CANCELLED') germanStatus = 'Storniert';
                    if (status === 'OVERDUE') germanStatus = 'Mahnung';

                    try {
                        // Call the API to update
                        await fetch(`/api/invoices/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: germanStatus })
                        });

                        showToast(
                            `Rechnung ${id} Status geändert zu: ${germanStatus}`,
                            "success"
                        );
                        // Refresh dashboard stats if we just updated a status
                        window.dispatchEvent(new Event('invoiceUpdated'));
                    } catch (e) {
                        console.error("Update failed", e);
                        setReply("Fehler beim Aktualisieren der Rechnung.");
                    }
                }
            }

            // --- FETCH DETAILS (RECURSIVE) ---
            if (data.intent === 'FETCH_DETAILS') {
                const { command, payload } = data;
                if (command === 'GET_INVOICE') {
                    console.log("Fetching details for invoice:", payload.id);
                    try {
                        // Use SEARCH API instead of ID lookup to support Invoice Numbers (e.g. "5")
                        const searchRes = await fetch(`/api/invoices?search=${payload.id}&limit=1`);

                        if (searchRes.ok) {
                            const searchData = await searchRes.json();
                            const invoices = searchData.invoices || [];

                            if (invoices.length > 0) {
                                const invData = invoices[0];
                                // RECURSIVE CALL: Send data back to AI
                                const contextMessage = `DATA_FETCHED: Invoice ${invData.number} (ID: ${invData.id}) details: Total ${invData.total}€, Customer ${invData.customer.name}, Status ${invData.status}, Date ${invData.date}. Summarize this for the user.`;

                                // Call processCommand again with the data
                                await processCommand(contextMessage);
                                return; // Exit this loop
                            } else {
                                setReply(`Rechnung ${payload.id} nicht gefunden.`);
                                speak(`Rechnung ${payload.id} nicht gefunden.`);
                            }
                        } else {
                            setReply("Fehler beim Suchen der Rechnung.");
                            speak("Fehler beim Suchen.");
                        }
                    } catch (e) {
                        console.error(e);
                        setReply("Fehler beim Abrufen der Daten.");
                        speak("Es gab einen Fehler beim Abrufen der Daten.");
                    }
                }
            }

            if (!data.reply) {
                setStatus('IDLE');
            }

        } catch (e) {
            console.error("Voice Assistant Error:", e);
            setReply('Fehler bei der Verarbeitung.');
            speak('Es gab einen Fehler.', 'de');
            setStatus('IDLE');
        }
    };

    const speak = (text: string, lang: string = 'de', shouldListenAfter: boolean = false) => {
        setStatus('SPEAKING');
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        const voices = window.speechSynthesis.getVoices();
        const targetLang = lang === 'ar' ? 'ar' : 'de';
        const preferredVoice = voices.find(v => v.lang.startsWith(targetLang));

        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.lang = lang === 'ar' ? 'ar-SA' : 'de-DE';

        utterance.onend = () => {
            if (shouldListenAfter) {
                console.log("Auto-listening for follow-up...");
                startListening();
            } else {
                setStatus('IDLE');
            }
        };
        utterance.onerror = (e) => {
            console.error("TTS Error:", e);
            setStatus('IDLE');
        };

        window.speechSynthesis.speak(utterance);
    };

    return (
        <>
            {/* Floating Button */}
            <Button
                onClick={startListening}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-violet-600 hover:bg-violet-700 z-50 flex items-center justify-center transition-transform hover:scale-105 animate-in slide-in-from-bottom-10 fade-in duration-700"
            >
                <Mic className="h-6 w-6 text-white" />
            </Button>

            {/* Panel */}
            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) stopListening();
            }}>
                <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-violet-100 p-6 shadow-2xl rounded-3xl">
                    <div className="flex flex-col items-center gap-6 text-center">

                        {/* Dynamic Status Icon */}
                        <div className={`
                            h-20 w-20 rounded-full flex items-center justify-center transition-all duration-500
                            ${status === 'LISTENING' ? 'bg-red-100 animate-pulse scale-110' :
                                status === 'PROCESSING' ? 'bg-violet-100 animate-spin' :
                                    status === 'SPEAKING' ? 'bg-blue-100 animate-bounce' : 'bg-gray-100'}
                        `}>
                            {status === 'LISTENING' ? <Mic className="h-8 w-8 text-red-600" /> :
                                status === 'PROCESSING' ? <Loader2 className="h-8 w-8 text-violet-600" /> :
                                    status === 'SPEAKING' ? <Volume2 className="h-8 w-8 text-blue-600" /> :
                                        <Mic className="h-8 w-8 text-gray-400" />}
                        </div>

                        {/* Text Output */}
                        <div className="space-y-4 w-full min-h-[100px] flex flex-col justify-center">
                            {status === 'LISTENING' ? (
                                <p className="text-2xl font-medium text-gray-800 animate-pulse">{transcript || "Ich höre zu..."}</p>
                            ) : (
                                <p className="text-xl font-medium text-violet-700 leading-relaxed">{reply}</p>
                            )}

                            {status === 'PROCESSING' && (
                                <span className="text-xs text-violet-400 font-semibold tracking-widest uppercase">Verarbeite...</span>
                            )}
                        </div>

                        {/* Stop Button */}
                        <Button variant="ghost" className="rounded-full h-12 w-12 p-0 hover:bg-red-50 hover:text-red-500 transition-colors" onClick={() => {
                            setIsOpen(false);
                            stopListening();
                        }}>
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
