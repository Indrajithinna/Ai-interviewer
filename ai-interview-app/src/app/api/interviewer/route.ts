import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBvHRGyx630JsyP2zYxPz5TMki7L19B7VM";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function POST(req: NextRequest) {
    try {
        const { history, resume, message } = await req.json();

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.7 } });

        const systemPrompt = `You are a professional technical interviewer online. You are conducting an interview based on the candidate's resume.
Be conversational, ask one highly relevant technical question at a time. If the candidate answers, give brief feedback (correcting if necessary) and move to the next topic. 
Do not break character. Do not use complex markdown that cannot be spoken aloud easily, avoid lists unless necessary. Keep your responses concise (like a real spoken conversation). 

Candidate's Resume Text:
${resume}
`;

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Understood. I'm ready to begin." }] },
                ...history.map((msg: { role: string; content: string }) => ({
                    role: msg.role === "assistant" ? "model" : "user",
                    parts: [{ text: msg.content }],
                }))
            ],
        });

        const result = await chat.sendMessage(message || "Hello!");
        const responseText = result.response.text();

        return NextResponse.json({ message: responseText });
    } catch (error: unknown) {
        console.error("Gemini Error:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to generate AI response" }, { status: 500 });
    }
}
