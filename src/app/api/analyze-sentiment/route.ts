import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { comment, rating } = await req.json();

  if (!comment && !rating) {
    return NextResponse.json(
      { error: "comment or rating is required" },
      { status: 400 }
    );
  }

  const prompt = `You are a sentiment classifier for Korean restroom reviews.
Analyze the following review and classify it as exactly one of: positive, negative, neutral.

Review text: "${comment || "(텍스트 없음)"}"
Star rating: ${rating}/5

Rules:
- If rating >= 4 and text is not negative → positive
- If rating <= 2 and text is not positive → negative
- If rating is 3, rely more on text sentiment
- If text is empty, rely on rating alone
- Respond with ONLY one word: positive, negative, or neutral`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: prompt,
      config: {
        temperature: 0,
        maxOutputTokens: 10,
      },
    });

    const raw = response.text?.trim().toLowerCase() ?? "neutral";
    const sentiment = ["positive", "negative", "neutral"].includes(raw)
      ? raw
      : "neutral";

    return NextResponse.json({ sentiment });
  } catch (err) {
    console.error("Sentiment analysis failed:", err);
    return NextResponse.json(
      { error: "Sentiment analysis failed" },
      { status: 502 }
    );
  }
}
