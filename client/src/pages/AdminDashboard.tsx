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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, Shield, Users, X } from "lucide-react";
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

      <BottomNavigation />
    </div>
  );
}
