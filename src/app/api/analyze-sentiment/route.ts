import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
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
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 10,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini API error:", err);
      return NextResponse.json({ sentiment: "neutral" });
    }

    const data = await res.json();
    const raw =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() ??
      "neutral";

    const sentiment = ["positive", "negative", "neutral"].includes(raw)
      ? raw
      : "neutral";

    return NextResponse.json({ sentiment });
  } catch (err) {
    console.error("Sentiment analysis failed:", err);
    return NextResponse.json({ sentiment: "neutral" });
  }
}
