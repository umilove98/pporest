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

  const { comment } = await req.json();

  if (!comment || comment.trim().length === 0) {
    return NextResponse.json({ allowed: true, reason: "" });
  }

  const prompt = `You are a content moderator for a Korean public restroom review app.
Analyze the following review comment and determine if it should be ALLOWED or BLOCKED.

Review: "${comment}"

Rules:
- BLOCK: sexual harassment, sexual comments, discriminatory remarks (racism, sexism, homophobia), threats, doxxing, spam/ads
- ALLOW: general profanity/swearing (e.g. 씨발, 개같은, 존나), complaints, negative opinions, harsh criticism about restroom conditions
- The key distinction: raw frustration and swearing about a dirty restroom is fine. Sexual harassment or targeting specific people/groups is not.

Respond with ONLY a JSON object (no markdown): {"allowed": true/false, "reason": "brief reason in Korean"}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: prompt,
      config: {
        temperature: 0,
        maxOutputTokens: 100,
      },
    });

    const raw = response.text?.trim() ?? "";

    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleaned);
      return NextResponse.json({
        allowed: Boolean(result.allowed),
        reason: result.reason || "",
      });
    } catch {
      console.error("Failed to parse comment moderation response:", raw);
      return NextResponse.json({ allowed: false, reason: "검증 응답 처리 실패로 등록이 보류됩니다" });
    }
  } catch (err) {
    console.error("Comment moderation failed:", err);
    return NextResponse.json({ allowed: false, reason: "검증 서비스 연결 실패로 등록이 보류됩니다" });
  }
}
