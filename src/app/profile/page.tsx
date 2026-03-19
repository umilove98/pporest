"use client";

import { User, MessageSquare, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background px-4 py-3">
        <h1 className="text-lg font-bold">프로필</h1>
      </header>

      <div className="flex flex-col items-center px-4 pt-8">
        {/* Avatar */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <User className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="mt-3 text-lg font-semibold">게스트 사용자</h2>
        <p className="text-sm text-muted-foreground">로그인하여 리뷰를 관리하세요</p>

        {/* Stats */}
        <div className="mt-6 flex w-full gap-4">
          <div className="flex flex-1 flex-col items-center rounded-lg border p-4">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-xl font-bold">0</span>
            <span className="text-xs text-muted-foreground">리뷰</span>
          </div>
          <div className="flex flex-1 flex-col items-center rounded-lg border p-4">
            <Camera className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-xl font-bold">0</span>
            <span className="text-xs text-muted-foreground">사진</span>
          </div>
        </div>

        <Separator className="my-6" />

        <Button className="w-full" disabled>
          로그인 (준비 중)
        </Button>
      </div>
    </div>
  );
}
