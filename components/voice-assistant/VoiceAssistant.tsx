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

    // --- WAKE WORD LOGIC ---
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // Create separate instance for wake word to avoid conflicts
        const wakeWordRecognition = new SpeechRecognition();
        wakeWordRecognition.lang = 'en-US'; // Use English for better "KariNex" detection
        wakeWordRecognition.continuous = true;
        wakeWordRecognition.interimResults = true;

        wakeWordRecognition.onresult = (event: any) => {
            if (activeRef.current) return; // Don't process wake word if already active

            const current = event.resultIndex;
            const text = event.results[current][0].transcript.toLowerCase();
            console.log("Wake Word Stream:", text); // DEBUG

            // Check for wake words
            if (text.includes('kari') || text.includes('nex') || text.includes('next')) {
                wakeWordRecognition.stop(); // Stop listening for wake word
                startListening(); // Trigger main assistant
            }
        };

        wakeWordRecognition.onend = () => {
            // Restart wake word listener if not active
            if (!activeRef.current) {
                try { wakeWordRecognition.start(); } catch (e) { /* ignore */ }
            }
        };

        wakeWordRef.current = wakeWordRecognition;

        // Initial Start
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
            // Delay restart slightly to avoid conflict with main recognition stopping
            setTimeout(() => {
                if (wakeWordRef.current && !activeRef.current) {
                    try { wakeWordRef.current.start(); } catch (e) { }
                }
            }, 500);
        }
    }, [isOpen]);


    // --- MAIN COMMAND LOGIC ---

    const startListening = () => {
        setIsOpen(true);
        setStatus('LISTENING');
        setTranscript('');
        setReply('');
        transcriptRef.current = '';
        activeRef.current = true;

        // Sound effect for activation (optional, simpler than MP3)
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
                // Only set IDLE if we are not processing a command
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
            const res = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            const data = await res.json();
            console.log("Received AI Response:", data);

            // --- INSTANT NAVIGATION OPTIMIZATION ---
            if (data.intent === 'NAVIGATE' && data.payload?.route) {
                console.log("Navigating to:", data.payload.route);
                router.push(data.payload.route);

                // Close IMMEDIATELY for navigation
                setIsOpen(false);
                stopListening();
                return; // Exit function, no need to speak confirmation
            }

            if (data.reply) {
                setReply(data.reply);
                speak(data.reply, data.language);
            }

            if (data.intent === 'ACTION') {
                const { command, payload } = data;

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
                    // Trigger modal, maybe close assistant? 
                    // Let's keep it open for invoice creation feedback unless user prefers speed.
                }

                else if (command === 'FILTER_INVOICES') {
                    const params = new URLSearchParams();
                    if (payload.status) params.set('status', payload.status);
                    if (payload.date_range) params.set('date', payload.date_range);
                    router.push(`/invoices?${params.toString()}`);
                    // For filters, we might want to see the result, close it.
                    setIsOpen(false);
                }

                else if (command === 'EXPORT_DATA') {
                    showToast(
                        `Export gestartet: ${payload.scope} (${payload.format})`,
                        "info"
                    );
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

    const speak = (text: string, lang: string = 'de') => {
        setStatus('SPEAKING');
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        const voices = window.speechSynthesis.getVoices();
        const targetLang = lang === 'ar' ? 'ar' : 'de';
        const preferredVoice = voices.find(v => v.lang.startsWith(targetLang));

        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.lang = lang === 'ar' ? 'ar-SA' : 'de-DE';

        utterance.onend = () => {
            setStatus('IDLE');
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
