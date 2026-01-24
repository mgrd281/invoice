'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, X, Loader2, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Fallback for SpeechRecognition type handled in app/types/speech.d.ts

import { useToast } from '@/components/ui/use-toast';

export function VoiceAssistant() {
    const { showToast } = useToast();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING'>('IDLE');
    const [transcript, setTranscript] = useState('');
    const [reply, setReply] = useState('');

    // Recognition Ref
    const recognitionRef = useRef<any>(null);

    const startListening = () => {
        setIsOpen(true);
        setStatus('LISTENING');
        setTranscript('');
        setReply('');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setReply('Browser not supported.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'de-DE'; // Default, but we can make this dynamic or mixed
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
            const current = event.resultIndex;
            const transcriptText = event.results[current][0].transcript;
            setTranscript(transcriptText);
        };

        recognition.onend = () => {
            // If user stopped talking, send to backend
            if (status === 'LISTENING' && transcript.length > 2) {
                processCommand(transcript);
            } else {
                setStatus('IDLE');
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    const processCommand = async (text: string) => {
        setStatus('PROCESSING');
        try {
            const res = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            const data = await res.json();

            if (data.reply) {
                setReply(data.reply);
                speak(data.reply, data.language);
            }

            // --- COMMAND ROUTER ---

            if (data.intent === 'NAVIGATE' && data.payload?.route) {
                router.push(data.payload.route);
            }

            else if (data.intent === 'ACTION') {
                const { command, payload } = data;

                if (command === 'SEND_INVOICE') {
                    // Simulation of sending
                    showToast(
                        `E-Mail gesendet: Rechnung ${payload.id} wurde an ${payload.recipient} gesendet.`,
                        "success"
                    );
                }

                else if (command === 'CREATE_INVOICE') {
                    // Navigate to dashboard with query params to triger modal
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
                }

                else if (command === 'EXPORT_DATA') {
                    showToast(
                        `Export gestartet: Deine ${payload.scope} werden als ${payload.format} exportiert.`,
                        "info"
                    );
                }
            }

            setStatus('IDLE');

        } catch (e) {
            setReply('Sorry, something went wrong.');
            speak('Entschuldigung, ein Fehler ist aufgetreten.', 'de');
            setStatus('IDLE');
        }
    };

    const speak = (text: string, lang: string = 'de') => {
        setStatus('SPEAKING');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'ar' ? 'ar-SA' : 'de-DE';
        utterance.onend = () => setStatus('IDLE');
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
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                        <Button variant="ghost" className="rounded-full h-12 w-12 p-0 hover:bg-red-50 hover:text-red-500 transition-colors" onClick={() => setIsOpen(false)}>
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
