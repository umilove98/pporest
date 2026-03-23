"use client";

import { useState } from "react";
import { Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth";
import { generateRandomNickname } from "@/lib/nickname";

/** Supabase 에러 메시지 한글화 */
function translateError(message: string): string {
  const translations: Record<string, string> = {
    "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "Email not confirmed": "이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.",
    "User already registered": "이미 가입된 이메일입니다.",
    "Password should be at least 6 characters": "비밀번호는 최소 6자 이상이어야 합니다.",
    "Unable to validate email address: invalid format": "올바른 이메일 형식이 아닙니다.",
    "Signup requires a valid password": "비밀번호를 입력해주세요.",
    "Anonymous sign-ins are disabled": "이메일과 비밀번호를 입력해주세요.",
  };

  // 정확히 일치하는 번역 확인
  if (translations[message]) return translations[message];

  // 부분 일치 확인
  for (const [key, value] of Object.entries(translations)) {
    if (message.includes(key)) return value;
  }

  // rate limit 메시지 한글화
  const rateLimitMatch = message.match(/you can only request this after (\d+) seconds/i);
  if (rateLimitMatch) {
    return `보안을 위해 ${rateLimitMatch[1]}초 후에 다시 시도할 수 있습니다.`;
  }

  const rateLimitMatch2 = message.match(/rate limit.*?(\d+)\s*second/i);
  if (rateLimitMatch2) {
    return `요청이 너무 잦습니다. ${rateLimitMatch2[1]}초 후에 다시 시도해주세요.`;
  }

  if (message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("too many")) {
    return "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.";
  }

  // 번역 없으면 원문 반환
  return message;
}

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSignUp && !nickname.trim()) {
      setError("활동 닉네임을 입력하거나 자동생성 해주세요.");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(email, password, nickname.trim());
        // Supabase는 이메일 인증이 필요하면 session이 null로 옴
        if (result.user && !result.session) {
          setEmailSent(true);
        }
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
      setError(translateError(msg));
    } finally {
      setLoading(false);
    }
  };

  // 인증 메일 발송 완료 화면
  if (emailSent) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Mail className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold">인증 메일을 보냈습니다!</h3>
        <div className="text-center text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">{email}</span> 으로</p>
          <p>인증 메일을 발송했습니다.</p>
          <p className="mt-2">메일함을 확인하고 인증 링크를 클릭해주세요.</p>
          <p className="mt-1 text-xs">(스팸 메일함도 확인해주세요)</p>
        </div>
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => {
            setEmailSent(false);
            setIsSignUp(false);
            setPassword("");
          }}
        >
          로그인 화면으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp && (
        <div>
          <label className="mb-1 block text-sm font-medium">활동 닉네임</label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="닉네임을 입력하세요"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1 text-xs"
              onClick={() => setNickname(generateRandomNickname())}
            >
              <Sparkles className="h-3.5 w-3.5" />
              자동생성
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            리뷰 등 활동 시 이 닉네임으로 표시됩니다
          </p>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">이메일</label>
        <Input
          type="email"
          placeholder="이메일을 입력하세요"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">비밀번호</label>
        <Input
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "처리 중..." : isSignUp ? "회원가입" : "로그인"}
      </Button>

      <button
        type="button"
        className="w-full text-center text-sm text-muted-foreground"
        onClick={() => {
          setIsSignUp(!isSignUp);
          setError("");
        }}
      >
        {isSignUp ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
      </button>
    </form>
  );
}
