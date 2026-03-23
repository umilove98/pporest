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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "file is required" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/jpeg";

  const prompt = `You are a photo moderator for a public restroom review app.
Analyze this image and determine if it should be ALLOWED or BLOCKED.

BLOCK the image if:
1. It contains sexually explicit or suggestive content
2. It contains nudity or partial nudity
3. It is completely unrelated to restrooms/bathrooms/facilities (e.g. selfies, food, animals, random objects)
4. It contains violent or disturbing content
5. It contains hate symbols or offensive graffiti

ALLOW the image if:
1. It shows a restroom, bathroom, toilet, sink, or related facilities
2. It shows the entrance or exterior of a restroom building
3. It shows restroom signage, directions, or maps
4. It shows cleanliness conditions, damage, or maintenance issues of a restroom

Respond with ONLY a JSON object (no markdown): {"allowed": true/false, "reason": "brief reason in Korean"}`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 100,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini moderation API error:", err);
      // 에러 시 안전하게 허용 (서비스 중단 방지)
      return NextResponse.json({ allowed: true, reason: "검증 서비스 오류" });
    }

    const data = await res.json();
    const raw =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    try {
      // JSON 파싱 (마크다운 코드블록 제거)
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleaned);
      return NextResponse.json({
        allowed: Boolean(result.allowed),
        reason: result.reason || "",
      });
    } catch {
      console.error("Failed to parse moderation response:", raw);
      return NextResponse.json({ allowed: true, reason: "응답 파싱 실패" });
    }
  } catch (err) {
    console.error("Photo moderation failed:", err);
    return NextResponse.json({ allowed: true, reason: "검증 실패" });
  }
}
