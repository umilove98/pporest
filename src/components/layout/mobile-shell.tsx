"use client";

import { BottomNav } from "./bottom-nav";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <main className="pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}
