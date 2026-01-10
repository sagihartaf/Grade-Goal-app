import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, Shield, Users, X, Crown } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";

interface CourseCandidate {
  university: string;
  degree: string | null;
  course_name: string;
  academic_year: number | null;
  semester: "A" | "B" | "Summer" | "Yearly" | null;
  credits: number;
  difficulty: "easy" | "medium" | "hard";
  components: Array<{ name: string; weight: number; isMagen: boolean }>;
  user_count: number;
  uploader_user_id: string | null;
  uploader_email: string | null;
  uploader_first_name: string | null;
  uploader_last_name: string | null;
  upload_count: number;
}

const ADMIN_EMAILS = [
  "sagi.hartaf@gmail.com",
];

export default function AdminDashboard() {
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  const user = authUser as User | null | undefined;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [grantProDialog, setGrantProDialog] = useState<{
    open: boolean;
    candidate: CourseCandidate | null;
  }>({ open: false, candidate: null });
  const [grantingProUserId, setGrantingProUserId] = useState<string | null>(null);

  const { data: candidatesData, isLoading: isCandidatesLoading } = useQuery<{ candidates: CourseCandidate[] }>({
    queryKey: ["/api/admin/candidates"],
    enabled: !!user?.email && ADMIN_EMAILS.includes(user.email),
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: async (candidate: CourseCandidate) => {
      // Map "Summer" and "Yearly" to database values
      let semester: "A" | "B" | "S" | null = null;
      if (candidate.semester === "A" || candidate.semester === "B") {
        semester = candidate.semester;
      } else if (candidate.semester === "Summer") {
        semester = "S";
      } else if (candidate.semester === "Yearly") {
        semester = "A"; // Default yearly to A
      }

      await apiRequest("POST", "/api/admin/approve", {
        university: candidate.university,
        degree: candidate.degree,
        courseName: candidate.course_name,
        credits: candidate.credits,
        academicYear: candidate.academic_year,
        semester: semester,
        difficulty: candidate.difficulty,
        components: candidate.components,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/candidates"] });
      setApprovingId(null);
      toast({
        title: "קורס אושר בהצלחה",
        description: "הקורס נוסף לקטלוג הגלובלי",
      });
    },
    onError: (error) => {
      setApprovingId(null);
      toast({
        title: "שגיאה באישור קורס",
        description: error instanceof Error ? error.message : "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    },
  });

  const grantProMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log("[AdminDashboard] Starting grant Pro mutation for userId:", userId);
      
      const token = await (async () => {
        const { supabase } = await import("@/lib/supabaseClient");
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      })();
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      console.log("[AdminDashboard] Making POST request to /api/admin/grant-pro with userId:", userId);

      const response = await fetch("/api/admin/grant-pro", {
        method: "POST",
        headers,
        body: JSON.stringify({ userId }),
      });

      console.log("[AdminDashboard] Response status:", response.status, response.statusText);

      if (!response.ok) {
        let errorText = "";
        let errorData: any = {};
        
        try {
          errorText = await response.text();
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          errorData = { message: errorText || response.statusText };
        }
        
        console.error("[AdminDashboard] API returned error:", {
          status: response.status,
          statusText: response.statusText,
          errorText,
          errorData,
        });
        
        const error = new Error(`${response.status}: ${errorData.message || errorData.error || "Failed to grant Pro subscription"}`);
        (error as any).status = response.status;
        (error as any).data = errorData;
        (error as any).responseText = errorText;
        throw error;
      }

      const data = await response.json();
      console.log("[AdminDashboard] Success response:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("[AdminDashboard] Successfully granted Pro:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setGrantingProUserId(null);
      setGrantProDialog({ open: false, candidate: null });
      toast({
        title: "מנוי Pro הוענק בהצלחה",
        description: data?.message || "המשתמש קיבל מנוי Pro לשנה",
      });
    },
    onError: (error) => {
      console.error("[AdminDashboard] Error granting Pro subscription:", error);
      console.error("[AdminDashboard] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        status: (error as any)?.status,
        data: (error as any)?.data,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      setGrantingProUserId(null);
      
      // Don't close dialog on error - let user try again
      // setGrantProDialog({ open: false, candidate: null });
      
      // Extract detailed error message
      let errorMessage = "נסה שוב מאוחר יותר";
      let errorTitle = "שגיאה בהענקת מנוי Pro";
      
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          errorTitle = "שגיאת הרשאה";
          errorMessage = "ההרשאה שלך פגה. אנא התחבר מחדש.";
        } else if (error.message.includes("403") || error.message.includes("Access denied")) {
          errorTitle = "גישה נדחתה";
          errorMessage = "אין לך הרשאה לבצע פעולה זו. משתמשים מנהל בלבד.";
        } else if (error.message.includes("404") || error.message.includes("not found")) {
          errorTitle = "משתמש לא נמצא";
          errorMessage = "לא ניתן למצוא את המשתמש. נסה לרענן את הדף.";
        } else if (error.message.includes("500") || error.message.includes("Internal Server Error")) {
          errorTitle = "שגיאת שרת";
          errorMessage = "שגיאה בשרת. בדוק את לוגי Vercel לפרטים נוספים.";
        } else if (error.message.includes("column") || error.message.includes("relation")) {
          errorTitle = "שגיאת מסד נתונים";
          errorMessage = "טבלה או עמודה חסרים במסד הנתונים. בדוק את סכמת המסד.";
        } else if (error.message.includes("permission") || error.message.includes("denied")) {
          errorTitle = "שגיאת הרשאות";
          errorMessage = "אין הרשאה לעדכן את מסד הנתונים. בדוק את מדיניות RLS.";
        } else {
          errorMessage = error.message;
        }
        
        // Try to extract message from error data
        if ((error as any)?.data?.message) {
          errorMessage = (error as any).data.message;
        } else if ((error as any)?.data?.error) {
          errorMessage = (error as any).data.error;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Check if user is admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  // Helper function to generate unique key for candidate
  const getCandidateKey = (candidate: CourseCandidate) => {
    return `${candidate.university}-${candidate.degree}-${candidate.course_name}-${candidate.academic_year}-${candidate.semester}`;
  };

  const handleReject = (candidate: CourseCandidate) => {
    const key = getCandidateKey(candidate);
    setDismissedIds(prev => new Set(prev).add(key));
    toast({
      title: "קורס נדחה",
      description: "הקורס הוסר מהרשימה",
    });
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <div className="fixed top-4 start-4 z-50">
          <ThemeToggle />
        </div>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-3xl font-bold mb-2">גישה נדחתה</h1>
          <p className="text-muted-foreground mb-6">
            דף זה מיועד למנהלי מערכת בלבד.
          </p>
          <Button onClick={() => navigate("/")}>חזור לדף הבית</Button>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const candidates = candidatesData?.candidates || [];
  
  // Filter out dismissed candidates
  const visibleCandidates = candidates.filter(candidate => 
    !dismissedIds.has(getCandidateKey(candidate))
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "";
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "קל";
      case "medium":
        return "בינוני";
      case "hard":
        return "קשה";
      default:
        return difficulty;
    }
  };

  const getSemesterLabel = (semester: string | null) => {
    if (!semester) return "—";
    switch (semester) {
      case "A":
        return "א׳";
      case "B":
        return "ב׳";
      case "Summer":
        return "קיץ";
      case "Yearly":
        return "שנתי";
      default:
        return semester;
    }
  };

  const getUploadCountColor = (count: number) => {
    if (count < 5) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    } else if (count >= 8) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    } else {
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    }
  };

  const handleGrantProClick = (candidate: CourseCandidate) => {
    if (!candidate.uploader_user_id) {
      toast({
        title: "שגיאה",
        description: "לא ניתן להעניק מנוי - אין ID משתמש",
        variant: "destructive",
      });
      return;
    }
    setGrantProDialog({ open: true, candidate });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="fixed top-4 start-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  לוח ניהול - קטלוג קורסים
                </CardTitle>
                <CardDescription className="mt-2">
                  קורסים פופולריים שנוצרו על ידי משתמשים. אשר קורסים כדי להוסיף אותם לקטלוג הגלובלי.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate("/")}>
                חזור לדף הבית
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isCandidatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : visibleCandidates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {candidates.length > 0 
                    ? "כל הקורסים נדחו או אושרו" 
                    : "אין קורסים ממתינים לאישור"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>מוסד</TableHead>
                      <TableHead>תואר</TableHead>
                      <TableHead>שם קורס</TableHead>
                      <TableHead className="text-center">שנה/סמסטר</TableHead>
                      <TableHead className="text-center">נ״ז</TableHead>
                      <TableHead className="text-center">קושי</TableHead>
                      <TableHead className="text-center">
                        <Users className="w-4 h-4 inline me-1" />
                        משתמשים
                      </TableHead>
                      <TableHead>מעלה</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCandidates.map((candidate) => {
                      const key = getCandidateKey(candidate);
                      const isApproving = approvingId === key;

                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium">{candidate.university}</TableCell>
                          <TableCell>{candidate.degree || "—"}</TableCell>
                          <TableCell>{candidate.course_name}</TableCell>
                          <TableCell className="text-center">
                            {candidate.academic_year && candidate.semester
                              ? `${candidate.academic_year} ${getSemesterLabel(candidate.semester)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-center">{candidate.credits}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={getDifficultyColor(candidate.difficulty)}>
                              {getDifficultyLabel(candidate.difficulty)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{candidate.user_count}</Badge>
                          </TableCell>
                          <TableCell>
                            {candidate.uploader_email ? (
                              <div className="text-sm">
                                <div className="font-medium flex items-center gap-2">
                                  {candidate.uploader_first_name || candidate.uploader_last_name
                                    ? `${candidate.uploader_first_name || ""} ${candidate.uploader_last_name || ""}`.trim()
                                    : "משתמש"}
                                  {candidate.upload_count > 0 && (
                                    <Badge className={getUploadCountColor(candidate.upload_count)}>
                                      {candidate.upload_count} העלאות
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">{candidate.uploader_email}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setApprovingId(key);
                                  approveMutation.mutate(candidate);
                                }}
                                disabled={isApproving}
                              >
                                {isApproving ? (
                                  <>
                                    <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                                    מאשר...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 ms-2" />
                                    אשר
                                  </>
                                )}
                              </Button>
                              {candidate.uploader_user_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGrantProClick(candidate)}
                                  disabled={isApproving || grantingProUserId === candidate.uploader_user_id}
                                  className="text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                                >
                                  <Crown className="w-4 h-4 ms-1" />
                                  Pro
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReject(candidate)}
                                disabled={isApproving}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <X className="w-4 h-4 ms-1" />
                                דחה
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Show count of visible vs total */}
            {!isCandidatesLoading && candidates.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground text-center">
                מציג {visibleCandidates.length} מתוך {candidates.length} קורסים
                {dismissedIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDismissedIds(new Set())}
                    className="ms-2"
                  >
                    איפוס סינון
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grant Pro Confirmation Dialog */}
      <AlertDialog 
        open={grantProDialog.open} 
        onOpenChange={(open) => {
          if (!open && !grantProMutation.isPending) {
            setGrantProDialog({ open: false, candidate: null });
            setGrantingProUserId(null);
          }
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>הענקת מנוי Pro</AlertDialogTitle>
            <AlertDialogDescription>
              האם ברצונך להעניק מנוי Pro לשנה למשתמש{" "}
              <strong>{grantProDialog.candidate?.uploader_email || "לא ידוע"}</strong>?
              <br />
              המשתמש העלה עד כה <strong>{grantProDialog.candidate?.upload_count || 0}</strong> קורסים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={grantProMutation.isPending}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (grantProDialog.candidate?.uploader_user_id) {
                  setGrantingProUserId(grantProDialog.candidate.uploader_user_id);
                  grantProMutation.mutate(grantProDialog.candidate.uploader_user_id);
                }
              }}
              disabled={grantProMutation.isPending || !grantProDialog.candidate?.uploader_user_id}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {grantProMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                  מעניק...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 ms-2" />
                  אשר והענק
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation />
    </div>
  );
}
