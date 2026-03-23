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
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 100,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini comment moderation error:", err);
      return NextResponse.json({ allowed: true, reason: "검증 서비스 오류" });
    }

    const data = await res.json();
    const raw =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleaned);
      return NextResponse.json({
        allowed: Boolean(result.allowed),
        reason: result.reason || "",
      });
    } catch {
      console.error("Failed to parse comment moderation response:", raw);
      return NextResponse.json({ allowed: true, reason: "응답 파싱 실패" });
    }
  } catch (err) {
    console.error("Comment moderation failed:", err);
    return NextResponse.json({ allowed: true, reason: "검증 실패" });
  }
}
