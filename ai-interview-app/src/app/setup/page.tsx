"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2 } from "lucide-react";

export default function SetupPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.type === "text/plain")) {
            setFile(droppedFile);
            setError("");
        } else {
            setError("Please upload a PDF or TXT file.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError("");
        }
    };

    const handleStart = async () => {
        if (!file) return;
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to parse resume");
            }

            // Save parsed resume to local storage to be accessed in the interview room
            localStorage.setItem("resumeText", data.text);
            router.push("/interview");

        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
            <div className="max-w-xl w-full bg-[#111] p-8 rounded-2xl border border-white/10 shadow-2xl">
                <h2 className="text-3xl font-bold mb-2">Upload Resume</h2>
                <p className="text-white/50 mb-8">
                    Upload your resume so the AI can tailor the interview questions to your experience.
                </p>

                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-white/20 rounded-xl p-10 flex flex-col items-center justify-center bg-white/5 cursor-pointer hover:bg-white/10 transition-colors relative"
                >
                    <input
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {file ? (
                        <div className="flex flex-col items-center">
                            <FileText className="w-12 h-12 text-indigo-400 mb-4" />
                            <p className="font-medium text-lg">{file.name}</p>
                            <p className="text-sm text-white/50 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center">
                            <UploadCloud className="w-12 h-12 text-white/40 mb-4" />
                            <p className="font-medium text-lg mb-1">Click or drag and drop</p>
                            <p className="text-sm text-white/40">PDF or TXT (Max 5MB)</p>
                        </div>
                    )}
                </div>

                {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}

                <button
                    onClick={handleStart}
                    disabled={!file || loading}
                    className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold flex items-center justify-center transition-all"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Preparing Interview...
                        </>
                    ) : (
                        "Start Interview"
                    )}
                </button>
            </div>
        </div>
    );
}
