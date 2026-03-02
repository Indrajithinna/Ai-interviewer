import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";

export async function POST(req: NextRequest) {
    try {
        const data = await req.formData();
        const file = data.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const type = file.type;
        let text = "";

        if (type === "application/pdf") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const pdfData = await pdfParse(buffer);
            text = pdfData.text;
        } else if (type === "text/plain") {
            text = await file.text();
        } else {
            return NextResponse.json({ error: "Unsupported file format. Please upload PDF or TXT" }, { status: 400 });
        }

        return NextResponse.json({ text });
    } catch (error: unknown) {
        console.error("Error parsing file:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to parse file" }, { status: 500 });
    }
}
