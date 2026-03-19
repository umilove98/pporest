"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth";

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userName, setUserName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, userName);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp && (
        <div>
          <label className="mb-1 block text-sm font-medium">닉네임</label>
          <Input
            type="text"
            placeholder="닉네임을 입력하세요"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
          />
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
