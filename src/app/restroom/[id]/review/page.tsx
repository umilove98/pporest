"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewForm } from "@/components/restroom/review-form";
import { getRestroomById } from "@/lib/api";
import { mockRestrooms } from "@/lib/mock-data";

export default function WriteReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [restroomName, setRestroomName] = useState("");

  useEffect(() => {
    getRestroomById(id)
      .then((r) => setRestroomName(r?.name ?? ""))
      .catch(() => {
        const mock = mockRestrooms.find((r) => r.id === id);
        setRestroomName(mock?.name ?? "");
      });
  }, [id]);

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background px-2 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold">리뷰 작성</h1>
      </header>

      <div className="px-4 pt-4">
        {restroomName && (
          <p className="mb-4 text-sm text-muted-foreground">{restroomName}</p>
        )}
        <ReviewForm
          restroomId={id}
          onSubmit={() => {
            setTimeout(() => router.back(), 2000);
          }}
        />
      </div>
    </div>
  );
}
