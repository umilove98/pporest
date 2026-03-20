"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, MapPin, PenLine, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth/auth-provider";
import {
  getPendingRestrooms,
  approveRestroom,
  rejectRestroom,
  getPendingEditRequests,
  resolveEditRequest,
  checkIsAdmin,
} from "@/lib/api";
import { UserRestroom, EditRequest } from "@/lib/types";

type Tab = "restrooms" | "edits";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("restrooms");
  const [pendingRestrooms, setPendingRestrooms] = useState<UserRestroom[]>([]);
  const [pendingEdits, setPendingEdits] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const admin = await checkIsAdmin();
        if (!admin) {
          setError("관리자 권한이 없습니다.");
          setLoading(false);
          return;
        }
        const [restrooms, edits] = await Promise.all([
          getPendingRestrooms(),
          getPendingEditRequests(),
        ]);
        setPendingRestrooms(restrooms);
        setPendingEdits(edits);
      } catch {
        setError("Supabase 연결이 필요합니다. .env.local에 Supabase 설정을 확인해주세요.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleApproveRestroom = async (id: string) => {
    setProcessing(id);
    await approveRestroom(id);
    setPendingRestrooms((prev) => prev.filter((r) => r.id !== id));
    setProcessing(null);
  };

  const handleRejectRestroom = async (id: string) => {
    setProcessing(id);
    await rejectRestroom(id);
    setPendingRestrooms((prev) => prev.filter((r) => r.id !== id));
    setProcessing(null);
  };

  const handleResolveEdit = async (id: string, status: "approved" | "rejected") => {
    setProcessing(id);
    await resolveEditRequest(id, status);
    setPendingEdits((prev) => prev.filter((r) => r.id !== id));
    setProcessing(null);
  };

  if (!user) {
    return (
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-4 py-3">
          <button onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">관리자</h1>
        </header>
        <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">로그인이 필요합니다.</p>
          <Button onClick={() => router.push("/profile")} className="bg-emerald-500 hover:bg-emerald-600">
            로그인하기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-4 py-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">관리자</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTab("restrooms")}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            tab === "restrooms" ? "border-b-2 border-emerald-500 text-emerald-600" : "text-muted-foreground"
          }`}
        >
          등록 요청
          {pendingRestrooms.length > 0 && (
            <Badge className="ml-1.5 bg-red-500 text-[10px] px-1.5">{pendingRestrooms.length}</Badge>
          )}
        </button>
        <button
          onClick={() => setTab("edits")}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            tab === "edits" ? "border-b-2 border-emerald-500 text-emerald-600" : "text-muted-foreground"
          }`}
        >
          수정 요청
          {pendingEdits.length > 0 && (
            <Badge className="ml-1.5 bg-red-500 text-[10px] px-1.5">{pendingEdits.length}</Badge>
          )}
        </button>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">로딩 중...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-500">{error}</p>
        ) : tab === "restrooms" ? (
          /* 등록 요청 목록 */
          pendingRestrooms.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">대기 중인 등록 요청이 없습니다</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingRestrooms.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">{r.name}</h3>
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{r.address}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="mr-1 h-3 w-3" />
                          대기
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        <span>{r.gender_type === "separated" ? "남녀분리" : r.gender_type === "mixed" ? "남녀공용" : r.gender_type === "male_only" ? "남자화장실" : "여자화장실"}</span>
                        {r.is_free && <span>· 무료</span>}
                        {r.open_hours && <span>· {r.open_hours}</span>}
                      </div>

                      {r.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {r.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                          ))}
                        </div>
                      )}

                      <div className="text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("ko-KR")} · {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                      </div>

                      <Separator />

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-500 hover:bg-red-50 hover:text-red-600"
                          disabled={processing === r.id}
                          onClick={() => handleRejectRestroom(r.id)}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          거절
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                          disabled={processing === r.id}
                          onClick={() => handleApproveRestroom(r.id)}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          승인
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          /* 수정 요청 목록 */
          pendingEdits.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">대기 중인 수정 요청이 없습니다</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingEdits.map((req) => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <PenLine className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-semibold">{req.field}</span>
                        <span className="text-xs text-muted-foreground">({req.restroom_id})</span>
                      </div>

                      <div className="flex flex-col gap-1 rounded bg-muted p-2 text-xs">
                        <div className="flex gap-2">
                          <span className="w-12 text-muted-foreground">현재:</span>
                          <span>{req.current_value || "(없음)"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="w-12 font-medium text-emerald-600">제안:</span>
                          <span className="font-medium">{req.suggested_value}</span>
                        </div>
                      </div>

                      {req.reason && (
                        <p className="text-xs text-muted-foreground">사유: {req.reason}</p>
                      )}

                      <div className="text-[10px] text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString("ko-KR")}
                      </div>

                      <Separator />

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-500 hover:bg-red-50 hover:text-red-600"
                          disabled={processing === req.id}
                          onClick={() => handleResolveEdit(req.id, "rejected")}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          거절
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                          disabled={processing === req.id}
                          onClick={() => handleResolveEdit(req.id, "approved")}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          승인
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
