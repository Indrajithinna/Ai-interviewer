"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Send, Volume2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function InterviewRoom() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);

    const [messages, setMessages] = useState<{ role: "assistant" | "user"; content: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isCallEnded, setIsCallEnded] = useState(false);
    const [userInput, setUserInput] = useState("");
    const [resumeText, setResumeText] = useState("");
    const [videoActive, setVideoActive] = useState(false);

    // Web Speech API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const text = localStorage.getItem("resumeText");
        if (!text) {
            router.push("/setup");
            return;
        }
        setResumeText(text);

        let isMounted = true;
        const videoNode = videoRef.current;

        // Camera setup
        const startCamera = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    console.warn("Camera API not available. Please ensure you are using HTTPS or localhost.");
                    if (isMounted) setVideoActive(false);
                    return;
                }
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (isMounted && videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setVideoActive(true);
                } else {
                    stream.getTracks().forEach(track => track.stop());
                }
            } catch (err) {
                console.error("Camera access error:", err);
                if (isMounted) setVideoActive(false);
            }
        };
        startCamera();

        // Speech recognition setup
        if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setUserInput(prev => prev + transcript + " ");
            };
            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        // Start interview manually
        triggerAiResponse(text, [], "Please start the interview by welcoming me and asking the first question based on my resume.");

        return () => {
            isMounted = false;
            if (videoNode) {
                const stream = videoNode.srcObject as MediaStream;
                if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                }
                videoNode.srcObject = null;
            }
            window.speechSynthesis.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const triggerAiResponse = async (resume: string, history: { role: string, content: string }[], nextMessage: string) => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/interviewer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resume, history, message: nextMessage }),
            });
            const data = await res.json();

            if (data.message) {
                setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
                speakText(data.message);
            } else if (data.error) {
                const errorMsg = "API Error: " + data.error;
                setMessages(prev => [...prev, { role: "assistant", content: errorMsg }]);
                speakText("I encountered an error connecting to the AI. Please check your API key and server logs.");
            }
        } catch (err) {
            console.error("Error fetching AI response", err);
            setMessages(prev => [...prev, { role: "assistant", content: "Network error: " + (err as Error).message }]);
        } finally {
            setIsLoading(false);
        }
    };

    const speakText = (text: string) => {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);

            const setVoice = () => {
                const voices = window.speechSynthesis.getVoices();
                const preferredVoice = voices.find(v => v.lang === "en-US" && v.name.includes("Google")) || voices[0];
                if (preferredVoice) utterance.voice = preferredVoice;
                utterance.onstart = () => setIsSpeaking(true);
                utterance.onend = () => setIsSpeaking(false);
                utterance.rate = 1.05;
                window.speechSynthesis.speak(utterance);
            };

            if (window.speechSynthesis.getVoices().length > 0) {
                setVoice();
            } else {
                window.speechSynthesis.onvoiceschanged = setVoice;
            }
        }
    };

    // Keep refs for the latest state to be accessed by SpeechRecognition callbacks (which might be stale closures)
    const userInputRef = useRef(userInput);
    const messagesRef = useRef(messages);
    const isLoadingRef = useRef(isLoading);
    const resumeTextRef = useRef(resumeText);

    useEffect(() => {
        userInputRef.current = userInput;
        messagesRef.current = messages;
        isLoadingRef.current = isLoading;
        resumeTextRef.current = resumeText;
    }, [userInput, messages, isLoading, resumeText]);

    const handleSendMessage = async (forceText?: string) => {
        const textToSend = forceText !== undefined ? forceText : userInputRef.current;
        if (!textToSend.trim() || isLoadingRef.current) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);

        const newHistory = [...messagesRef.current, { role: "user" as const, content: textToSend.trim() }];
        setMessages(newHistory);
        setUserInput("");
        setIsListening(false);
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { }
        }

        await triggerAiResponse(resumeTextRef.current, messagesRef.current, textToSend.trim());
    };

    // Update recognition callbacks dynamically to always use fresh handleSendMessage
    useEffect(() => {
        if (recognitionRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setUserInput(prev => prev + transcript + " ");
            };
            recognitionRef.current.onend = () => {
                setIsListening(false);
                // Auto-submit when user finishes speaking
                if (userInputRef.current.trim()) {
                    handleSendMessage();
                }
            };
        }
    }); // Runs every render to ensure callbacks have fresh references

    const toggleMic = () => {
        if (isListening) {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch { }
            }
            setIsListening(false);
            if (userInput.trim()) {
                handleSendMessage();  // submit immediately if stopped manually
            }
        } else {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setUserInput("");
            if (recognitionRef.current) {
                try { recognitionRef.current.start(); } catch { }
            }
            setIsListening(true);
        }
    };

    const toggleVideo = async () => {
        if (videoActive) {
            // Stop tracks
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach((track) => track.stop());
                videoRef.current.srcObject = null;
            }
            setVideoActive(false);
        } else {
            // Start tracks
            setVideoActive(true);
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    console.warn("Camera API not available. Please ensure you are using HTTPS or localhost.");
                    setVideoActive(false);
                    return;
                }
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access error:", err);
                setVideoActive(false);
            }
        }
    };

    const endCall = () => {
        window.speechSynthesis.cancel();
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { }
        }
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setVideoActive(false);
        setVideoActive(false);
        setIsListening(false);
        setIsCallEnded(true);
    };

    if (isCallEnded) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 font-sans">
                <div className="max-w-xl w-full bg-[#111] p-8 rounded-2xl border border-white/10 shadow-2xl text-center">
                    <h2 className="text-3xl font-bold mb-4">Interview Completed</h2>
                    <p className="text-white/60 mb-8">Great job! Here is a summary of your session.</p>

                    <div className="text-left bg-black/50 rounded-xl p-4 max-h-[400px] overflow-y-auto border border-white/5 mb-8">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-indigo-300' : 'text-white'}`}>
                                <span className="font-bold text-xs uppercase tracking-wider opacity-50 block mb-1">
                                    {msg.role === 'user' ? 'You' : 'Interviewer'}
                                </span>
                                {msg.content}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => {
                                const transcriptText = messages.map(m => `${m.role === 'user' ? 'You' : 'Interviewer'}: ${m.content}`).join('\\n\\n');
                                const blob = new Blob([transcriptText], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'interview-transcript.txt';
                                a.click();
                            }}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl font-medium"
                        >
                            Download Transcript
                        </button>
                        <button
                            onClick={() => router.push("/")}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-xl font-medium"
                        >
                            Return Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
            <header className="p-4 border-b border-white/10 flex justify-between items-center bg-black/50 backdrop-blur-sm z-10">
                <h1 className="font-bold text-xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    Interview Room
                </h1>
                <div className="text-white/50 text-sm">Session recording...</div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 relative max-w-7xl mx-auto w-full">
                {/* Videos Section */}
                <div className="flex-1 flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                        {/* AI Video */}
                        <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/5 shadow-xl flex items-center justify-center min-h-[300px]">
                            <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold">
                                AI Interviewer <Volume2 className={`w-3 h-3 ${isSpeaking ? "text-green-400" : "text-white/40"}`} />
                            </div>

                            <div className="relative flex items-center justify-center">
                                {isSpeaking && (
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                        className="absolute w-40 h-40 bg-indigo-500/20 rounded-full blur-xl"
                                    />
                                )}
                                <div className={`w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(79,70,229,0.4)] transition-all duration-300 ${isSpeaking ? "scale-110 shadow-[0_0_80px_rgba(79,70,229,0.8)]" : ""}`}>
                                    🤖
                                </div>
                            </div>
                        </div>

                        {/* User Video */}
                        <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/5 shadow-xl min-h-[300px]">
                            <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold">
                                You
                            </div>
                            {videoActive ? (
                                <video ref={videoRef} autoPlay playsInline muted className="object-cover w-full h-full transform scale-x-[-1]" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20">
                                    <VideoOff className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center justify-center gap-6">
                        <button
                            onClick={toggleMic}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isListening ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.4)]" : "bg-white/10 hover:bg-white/20"}`}
                        >
                            {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${videoActive ? "bg-white/10 hover:bg-white/20" : "bg-red-500/20 text-red-500"}`}
                        >
                            {videoActive ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={endCall}
                            className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] text-white"
                        >
                            <PhoneOff className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Chat / Transcript Panel */}
                <div className="lg:w-96 flex flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden h-[600px] lg:h-auto">
                    <div className="p-4 border-b border-white/10 bg-black/20 font-semibold mb-2">Transcript</div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}>
                                <span className="text-xs text-white/40 mb-1 px-1">{msg.role === "user" ? "You" : "AI"}</span>
                                <div className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-indigo-600 rounded-br-none" : "bg-white/10 rounded-bl-none"}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="mr-auto items-start max-w-[80%] flex flex-col">
                                <span className="text-xs text-white/40 mb-1 px-1">AI</span>
                                <div className="p-4 rounded-xl bg-white/5 rounded-bl-none flex items-center gap-2 text-white/60 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-black/20 border-t border-white/10 relative">
                        {isListening && <div className="absolute -top-6 left-4 text-xs text-indigo-400 animate-pulse font-semibold">Listening to your voice...</div>}
                        <div className="flex relative">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                placeholder={isListening ? "Transcribing..." : "Type your answer..."}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-indigo-500"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!userInput.trim() || isLoading}
                                className="absolute right-2 top-2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
