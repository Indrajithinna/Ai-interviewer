import Link from "next/link";
import { ArrowRight, Video } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30 flex flex-col font-sans">
      <header className="px-8 py-6 flex items-center justify-between border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">AI Interviewer</span>
        </div>
        <nav className="flex gap-6 text-sm font-medium text-white/70">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-6">
        {/* Abstract shapes */}
        <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl w-full mx-auto text-center z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-300 mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Powered by Google Gemini
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Master your next <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">technical interview</span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl leading-relaxed">
            Upload your resume and practice with our highly realistic AI interviewer. Get tailored questions, real-time voice interaction, and actionable feedback.
          </p>

          <Link href="/setup">
            <button className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-xl hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600">
              Start Practice Session
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
