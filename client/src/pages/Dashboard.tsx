import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Loader2, FileDown, Brain, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { GpaHeader } from "@/components/GpaHeader";
import { SemesterCard } from "@/components/SemesterCard";
import { CreateSemesterDialog } from "@/components/CreateSemesterDialog";
import { CreateCourseDialog } from "@/components/CreateCourseDialog";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PaywallModal } from "@/components/PaywallModal";
import { AdPlaceholder } from "@/components/AdPlaceholder";
import { SmartStrategyPlanner } from "@/components/SmartStrategyPlanner";
import { useLocation } from "wouter";
import { useProStatus, canCreateSemester } from "@/hooks/useProStatus";
import { 
  calculateDegreeGpa, 
  calculateYearGpa, 
  calculateSemesterGpa,
  getSemesterDisplayName 
} from "@/lib/gpaCalculations";
import { openPrintReport } from "@/components/PrintableReport";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SemesterWithCourses, User, CourseWithComponents } from "@shared/schema";

type FilterScope = "degree" | "year" | "semester";

export default function Dashboard() {
  const { toast } = useToast();
  const { isPro } = useProStatus();
  const [, navigate] = useLocation();
  const [currentFilter, setCurrentFilter] = useState<FilterScope>("degree");
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  
  const [isCreateSemesterOpen, setIsCreateSemesterOpen] = useState(false);
  const [semesterDialogMode, setSemesterDialogMode] = useState<"regular" | "completedYear">("regular");
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<"smart_strategy" | "analytics" | "export" | "feature">("feature");
  const [isSmartStrategyOpen, setIsSmartStrategyOpen] = useState(false);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<CourseWithComponents | null>(null);
  const [localGrades, setLocalGrades] = useState<Record<string, number>>({});
  const pendingGradeUpdates = useRef<Set<string>>(new Set());
  const scoreDebounceTimer = useRef<number | null>(null);
  const [importingSemesterId, setImportingSemesterId] = useState<string | null>(null);
  
  // Hard reset mechanism
  const [isHardRefreshing, setIsHardRefreshing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: semesters = [], isLoading, isFetching } = useQuery<SemesterWithCourses[]>({
    queryKey: ["/api/semesters"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // Merge server semesters with local slider edits for instant feedback
  // If a component has a local override (even null), use it; otherwise fall back to server score.
  const effectiveSemesters = useMemo(() => {
    return semesters.map((semester) => ({
      ...semester,
      courses: semester.courses.map((course) => ({
        ...course,
        gradeComponents: course.gradeComponents.map((component) => {
          const hasLocal = Object.prototype.hasOwnProperty.call(localGrades, component.id);
          const localScore = hasLocal ? localGrades[component.id] : undefined;
          return {
            ...component,
            score: localScore !== undefined ? (localScore as number | null) : (component.score ?? null),
          };
        }),
      })),
    }));
  }, [semesters, localGrades]);

  const handleExportPdf = useCallback(() => {
    if (semesters.length === 0) {
      toast({
        title: "אין נתונים לייצוא",
        description: "הוסף סמסטרים וקורסים לפני ייצוא הדוח",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "מכין את הדוח...",
      description: "חלון הדפסה נפתח - שמור כ-PDF",
    });
    openPrintReport(effectiveSemesters, user);
  }, [semesters.length, effectiveSemesters, user, toast]);

  const sortedSemesters = useMemo(() => {
    return [...effectiveSemesters].sort((a, b) => {
      if (a.academicYear !== b.academicYear) {
        return a.academicYear - b.academicYear;
      }
      const termOrder = { A: 1, B: 2, Summer: 3 };
      return termOrder[a.term] - termOrder[b.term];
    });
  }, [effectiveSemesters]);

  // Use a counter to force recalculation when needed
  const [gpaRefreshKey, setGpaRefreshKey] = useState(0);

  const degreeGpa = useMemo(
    () => calculateDegreeGpa(
      effectiveSemesters,
      user?.legacyCredits || 0,
      user?.legacyGpa || 0
    ),
    [effectiveSemesters, user?.legacyCredits, user?.legacyGpa, gpaRefreshKey]
  );

  const yearGpa = useMemo(
    () => calculateYearGpa(effectiveSemesters, selectedYear),
    [effectiveSemesters, selectedYear, gpaRefreshKey]
  );

  const semesterGpa = useMemo(() => {
    const semester = effectiveSemesters.find((s) => s.id === selectedSemesterId);
    return semester ? calculateSemesterGpa(semester.courses) : null;
  }, [effectiveSemesters, selectedSemesterId, gpaRefreshKey]);

  interface InstitutionStats {
    totalUsers: number;
    userRank: number;
    percentile: number;
    averageGpa: number;
  }

  const { data: institutionStats } = useQuery<InstitutionStats | null>({
    queryKey: ["/api/stats/institution", degreeGpa],
    queryFn: async () => {
      if (degreeGpa === null) return null;
      const response = await fetch(`/api/stats/institution?gpa=${degreeGpa}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: degreeGpa !== null,
  });

  const createSemesterMutation = useMutation({
    mutationFn: async (data: { academicYear: number; term: "A" | "B" | "Summer" }) => {
      const response = await apiRequest("POST", "/api/semesters", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      setIsCreateSemesterOpen(false);
      toast({ title: "הסמסטר נוצר בהצלחה" });
    },
    onError: () => {
      toast({ title: "שגיאה ביצירת הסמסטר", variant: "destructive" });
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: {
      semesterId: string;
      name: string;
      credits: number;
      difficulty?: "easy" | "medium" | "hard";
      isBinary?: boolean;
      components: Array<{ name: string; weight: number; score?: number | null; isMagen: boolean }>;
    }) => {
      const response = await apiRequest("POST", "/api/courses", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      setIsCreateCourseOpen(false);
      setActiveSemesterId(null);
      toast({ title: "הקורס נוצר בהצלחה" });
    },
    onError: () => {
      toast({ title: "שגיאה ביצירת הקורס", variant: "destructive" });
    },
  });

  const importRecommendedCoursesMutation = useMutation({
    mutationFn: async ({ semesterId, courses }: { semesterId: string; courses: Array<{
      course_name: string;
      credits: number;
      grade_breakdown: Array<{ name: string; weight: number; isMagen: boolean }>;
      difficulty: "easy" | "medium" | "hard";
    }> }) => {
      // Create all courses in parallel
      const promises = courses.map(course =>
        apiRequest("POST", "/api/courses", {
          semesterId,
          name: course.course_name,
          credits: course.credits,
          difficulty: course.difficulty,
          components: course.grade_breakdown,
        })
      );
      await Promise.all(promises);
      return courses.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      setImportingSemesterId(null);
      toast({ 
        title: "קורסים יובאו בהצלחה", 
        description: `נוספו ${count} קורסים לסמסטר` 
      });
    },
    onError: (error) => {
      setImportingSemesterId(null);
      toast({ 
        title: "שגיאה ביבוא קורסים", 
        variant: "destructive",
        description: "חלק מהקורסים לא נוספו. נסה שוב." 
      });
    },
  });

  const updateScoreMutation = useMutation({
    mutationFn: async ({ componentId, score }: { componentId: string; score: number | null }) => {
      // Check if this mutation should be aborted
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error("Aborted");
      }
      await apiRequest("PATCH", `/api/grade-components/${componentId}`, { score });
    },
    onError: (error: any) => {
      // Don't show error toast for aborted requests
      if (error?.message !== "Aborted") {
        toast({ title: "שגיאה בשמירת הציון", variant: "destructive" });
      }
    },
  });

  const deleteSemesterMutation = useMutation({
    mutationFn: async (semesterId: string) => {
      await apiRequest("DELETE", `/api/semesters/${semesterId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      toast({ title: "הסמסטר נמחק" });
    },
    onError: () => {
      toast({ title: "שגיאה במחיקת הסמסטר", variant: "destructive" });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("DELETE", `/api/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      toast({ title: "הקורס נמחק" });
    },
    onError: () => {
      toast({ title: "שגיאה במחיקת הקורס", variant: "destructive" });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ courseId, data }: { 
      courseId: string; 
      data: { name: string; credits: number; difficulty?: "easy" | "medium" | "hard"; isBinary?: boolean; components: Array<{ name: string; weight: number; score?: number | null; isMagen: boolean }> } 
    }) => {
      await apiRequest("PUT", `/api/courses/${courseId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      setIsCreateCourseOpen(false);
      setEditingCourse(null);
      toast({ title: "הקורס עודכן בהצלחה" });
    },
    onError: () => {
      toast({ title: "שגיאה בעדכון הקורס", variant: "destructive" });
    },
  });

  const updateTargetGradeMutation = useMutation({
    mutationFn: async ({ courseId, targetGrade }: { courseId: string; targetGrade: number | null }) => {
      await apiRequest("PATCH", `/api/courses/${courseId}/target`, { targetGrade });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      toast({ title: "ציון היעד עודכן" });
    },
    onError: () => {
      toast({ title: "שגיאה בעדכון ציון היעד", variant: "destructive" });
    },
  });

  const handleRefreshGpa = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (isHardRefreshing) return;
    
    setIsHardRefreshing(true);
    
    try {
      // STEP 1: Abort all pending API calls
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      // STEP 2: Explicit state clearing - synchronous, immediate
      setLocalGrades({});
      pendingGradeUpdates.current = new Set(); // Create new Set instance
      
      // STEP 3: Clear any debounce timers
      if (scoreDebounceTimer.current) {
        clearTimeout(scoreDebounceTimer.current);
        scoreDebounceTimer.current = null;
      }
      
      // STEP 4: Force GPA recalculation with new key (clears stale closures)
      setGpaRefreshKey(prev => prev + 1);
      
      // STEP 5: Invalidate queries to mark them as stale
      await queryClient.invalidateQueries({ queryKey: ["/api/semesters"] });
      
      // STEP 6: Force a complete data refetch and wait for completion
      await queryClient.refetchQueries({ 
        queryKey: ["/api/semesters"],
        exact: true 
      });
      
      toast({
        title: "הממוצע עודכן",
        description: "הנתונים רוענו מהשרת",
      });
    } catch (error) {
      console.error("Refresh error:", error);
      toast({
        title: "שגיאה ברענון",
        description: "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setIsHardRefreshing(false);
    }
  }, [isHardRefreshing, toast]);

  const handleComponentScoreChange = useCallback((componentId: string, score: number) => {
    // Don't accept updates during hard refresh
    if (isHardRefreshing) return;
    
    // Instant, synchronous UI update: only touch local state
    setLocalGrades((prev) => ({
      ...prev,
      [componentId]: score,
    }));
    pendingGradeUpdates.current.add(componentId);
  }, [isHardRefreshing]);

  const handleComponentScoreCommit = useCallback((componentId: string, score: number) => {
    // Don't accept updates during hard refresh
    if (isHardRefreshing) return;
    
    // Ensure local state reflects the final drag position
    setLocalGrades((prev) => ({
      ...prev,
      [componentId]: score,
    }));
    // Save immediately on drag end (in addition to the debounce safety net)
    updateScoreMutation.mutate({ componentId, score });
  }, [updateScoreMutation, isHardRefreshing]);

  // Background saver: debounce writes so UI never waits on the network
  useEffect(() => {
    // Don't debounce during hard refresh
    if (isHardRefreshing) return;
    if (pendingGradeUpdates.current.size === 0) return;

    if (scoreDebounceTimer.current) {
      clearTimeout(scoreDebounceTimer.current);
    }

    scoreDebounceTimer.current = window.setTimeout(() => {
      const toSave = Array.from(pendingGradeUpdates.current);
      pendingGradeUpdates.current.clear();
      scoreDebounceTimer.current = null;

      toSave.forEach((componentId) => {
        const score = localGrades[componentId];
        if (score !== undefined) {
          updateScoreMutation.mutate({ componentId, score });
        }
      });
    }, 500);

    // Cleanup function to prevent memory leaks
    return () => {
      if (scoreDebounceTimer.current) {
        clearTimeout(scoreDebounceTimer.current);
        scoreDebounceTimer.current = null;
      }
    };
  }, [localGrades, updateScoreMutation, isHardRefreshing]);

  // Fix potential freezing: Clear stale local grades when server data changes
  useEffect(() => {
    // Don't clean during hard refresh (state is already cleared)
    if (isHardRefreshing) return;
    
    // When semesters data changes from the server, remove any local overrides
    // for components that no longer exist
    const allComponentIds = new Set(
      semesters.flatMap(s => 
        s.courses.flatMap(c => 
          c.gradeComponents.map(gc => gc.id)
        )
      )
    );
    
    setLocalGrades(prev => {
      // Check if any keys need to be removed
      const keysToRemove = Object.keys(prev).filter(id => !allComponentIds.has(id));
      
      // Only update state if there are actually stale keys to remove
      if (keysToRemove.length === 0) {
        return prev; // Return same object to prevent re-render
      }
      
      // Create cleaned object only if necessary
      const cleaned: Record<string, number> = {};
      Object.keys(prev).forEach(id => {
        if (allComponentIds.has(id)) {
          cleaned[id] = prev[id];
        }
      });
      return cleaned;
    });
  }, [semesters, isHardRefreshing]);

  // Cleanup: Abort pending operations on unmount
  useEffect(() => {
    return () => {
      // Abort any pending API calls
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear timers
      if (scoreDebounceTimer.current) {
        clearTimeout(scoreDebounceTimer.current);
      }
    };
  }, []);

  const handleAddCourse = (semesterId: string) => {
    setActiveSemesterId(semesterId);
    setEditingCourse(null);
    setIsCreateCourseOpen(true);
  };

  const handleImportRecommended = async (semesterId: string) => {
    // Find the semester
    const semester = semesters.find(s => s.id === semesterId);
    if (!semester) {
      toast({ title: "שגיאה", description: "סמסטר לא נמצא", variant: "destructive" });
      return;
    }

    // Debug logging
    console.log('Import Recommended - Current User State:', user);
    console.log('Import Recommended - Academic Institution:', user?.academicInstitution);
    console.log('Import Recommended - Degree Name:', user?.degreeName);

    // Lenient validation: warn but don't block
    // Let the API validate instead
    if (!user?.academicInstitution) {
      console.warn('No academic institution set. Proceeding with API call - server will validate.');
    }

    setImportingSemesterId(semesterId);

    try {
      // Fetch recommended courses
      const params = new URLSearchParams({
        year: semester.academicYear.toString(),
        semester: semester.term,
        ...(user.academicInstitution && { university: user.academicInstitution }),
        ...(user.degreeName && { degree: user.degreeName }),
      });

      const token = await (await import("@/lib/supabaseClient")).supabase.auth.getSession().then(
        (res) => res.data.session?.access_token ?? null
      );

      const response = await fetch(`/api/courses/recommended?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Import Recommended API Error:', { status: response.status, errorData });
        
        // If it's a 400 error about missing institution, show specific message
        if (response.status === 400 && errorData.message?.includes('University not set')) {
          setImportingSemesterId(null);
          toast({ 
            title: "נדרש להגדיר מוסד אקדמי", 
            description: "הגדר את המוסד האקדמי שלך בפרופיל כדי לייבא קורסים מומלצים",
            variant: "destructive" 
          });
          return;
        }
        
        throw new Error(`Failed to fetch recommended courses: ${response.status}`);
      }

      const data = await response.json();
      const courses = data.courses || [];

      if (courses.length === 0) {
        setImportingSemesterId(null);
        // Show encouraging info toast (not error) to encourage manual addition
        toast({ 
          title: "עדיין אין לנו המלצות לתואר הזה", 
          description: "היה הראשון להוסיף את הקורסים ידנית! אנחנו נדאג לשמור אותם עבור הסטודנטים הבאים.",
          variant: "default", // Info style, not error
        });
        // Guide user to next step: open add course dialog after toast is visible
        setTimeout(() => {
          handleAddCourse(semesterId);
        }, 800); // Slightly longer delay to let user read the toast
        return;
      }

      // Import all courses
      await importRecommendedCoursesMutation.mutateAsync({ semesterId, courses });
    } catch (error) {
      setImportingSemesterId(null);
      toast({ 
        title: "שגיאה ביבוא קורסים", 
        variant: "destructive",
        description: error instanceof Error ? error.message : "נסה שוב מאוחר יותר"
      });
    }
  };

  const handleEditCourse = useCallback((course: CourseWithComponents) => {
    setEditingCourse(course);
    setIsCreateCourseOpen(true);
  }, []);

  const handleDeleteCourse = useCallback((courseId: string) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את הקורס?")) {
      deleteCourseMutation.mutate(courseId);
    }
  }, [deleteCourseMutation]);

  const handleClearCourseGrades = useCallback((courseId: string) => {
    // Find the course and clear all its grade components
    const course = semesters.flatMap((s) => s.courses).find((c) => c.id === courseId);
    if (!course) return;

    // Optimistic UI: set all component scores to null locally so the grade disappears immediately
    setLocalGrades((prev) => {
      const next = { ...prev };
      course.gradeComponents.forEach((component) => {
        next[component.id] = null as unknown as number; // treated as override; calculators handle null
      });
      return next;
    });

    // Background: persist null scores for each component
    course.gradeComponents.forEach((component) => {
      updateScoreMutation.mutate({ componentId: component.id, score: null });
    });
  }, [semesters, updateScoreMutation]);

  const handleDeleteSemester = useCallback((semesterId: string) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את הסמסטר? כל הקורסים בסמסטר יימחקו.")) {
      deleteSemesterMutation.mutate(semesterId);
    }
  }, [deleteSemesterMutation]);

  const handleAddSemesterClick = useCallback(() => {
    if (canCreateSemester(semesters.length, isPro)) {
      setSemesterDialogMode("regular");
      setIsCreateSemesterOpen(true);
    } else {
      setPaywallTrigger("feature");
      setIsPaywallOpen(true);
    }
  }, [semesters.length, isPro]);

  const handleAddCompletedYearClick = useCallback(() => {
    if (canCreateSemester(semesters.length, isPro)) {
      setSemesterDialogMode("completedYear");
      setIsCreateSemesterOpen(true);
    } else {
      setPaywallTrigger("feature");
      setIsPaywallOpen(true);
    }
  }, [semesters.length, isPro]);

  const handleSmartStrategyClick = useCallback(() => {
    if (!isPro) {
      setPaywallTrigger("smart_strategy");
      setIsPaywallOpen(true);
      return;
    }
    setIsSmartStrategyOpen(true);
  }, [isPro]);

  const handleTargetGradeChange = useCallback((courseId: string, targetGrade: number | null) => {
    updateTargetGradeMutation.mutate({ courseId, targetGrade });
  }, [updateTargetGradeMutation]);

  const handleFilterChange = (filter: FilterScope) => {
    setCurrentFilter(filter);
    if (filter === "year" && sortedSemesters.length > 0) {
      setSelectedYear(sortedSemesters[0].academicYear);
    }
    if (filter === "semester" && sortedSemesters.length > 0) {
      setSelectedSemesterId(sortedSemesters[0].id);
    }
  };

  const activeSemester = sortedSemesters.find((s) => s.id === activeSemesterId);

  // DEBUG: Log state values to diagnose blank screen (after all computations)
  console.log("=== Dashboard State Debug ===");
  console.log("1. Loading States:", {
    isLoading,
    isFetching,
    isHardRefreshing,
  });
  console.log("2. Semesters Data:", {
    semesters: semesters,
    semestersLength: semesters?.length ?? "undefined",
    semestersIsArray: Array.isArray(semesters),
    semestersIsUndefined: semesters === undefined,
    semestersIsNull: semesters === null,
  });
  console.log("3. User Data:", {
    user: user,
    userIsUndefined: user === undefined,
    userIsNull: user === null,
  });
  console.log("4. Effective Semesters:", {
    effectiveSemesters: effectiveSemesters,
    effectiveSemestersLength: effectiveSemesters?.length ?? "undefined",
    effectiveSemestersIsArray: Array.isArray(effectiveSemesters),
  });
  console.log("5. Sorted Semesters:", {
    sortedSemesters: sortedSemesters,
    sortedSemestersLength: sortedSemesters?.length ?? "undefined",
    sortedSemestersIsArray: Array.isArray(sortedSemesters),
  });
  console.log("6. Additional State:", {
    gpaRefreshKey,
    localGradesKeys: Object.keys(localGrades).length,
    activeSemesterId,
  });
  console.log("7. Render Check:", {
    willShowLoading: isLoading,
    willShowEmpty: !isLoading && sortedSemesters.length === 0,
    willShowSemesters: !isLoading && sortedSemesters.length > 0,
  });
  console.log("=== End Dashboard Debug ===");
  
  // IMMEDIATE DEBUG: Check where data is lost
  console.log("RENDER DEBUG:", { 
    rawSemesters: semesters?.length, 
    sorted: sortedSemesters?.length, 
    hasUser: !!user,
    queryKey: ["/api/semesters"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-14 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="fixed top-4 start-4 z-50 flex items-center gap-2">
        <ThemeToggle />
        <Button
          size="icon"
          variant={isPro ? "default" : "ghost"}
          onClick={handleSmartStrategyClick}
          data-testid="button-smart-strategy"
          title="אסטרטגיית לימוד חכמה"
          className={isPro ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" : ""}
        >
          <Brain className="w-5 h-5" />
        </Button>
        {isPro && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleExportPdf}
            data-testid="button-export-pdf"
            title="ייצוא דוח ציונים"
          >
            <FileDown className="w-5 h-5" />
          </Button>
        )}
      </div>

      <GpaHeader
        key={`gpa-header-${gpaRefreshKey}`}
        degreeGpa={degreeGpa}
        yearGpa={yearGpa}
        semesterGpa={semesterGpa}
        selectedYear={selectedYear}
        selectedSemester={activeSemester?.name}
        currentFilter={currentFilter}
        onFilterChange={handleFilterChange}
        institutionStats={institutionStats}
        semesters={effectiveSemesters}
        legacyCredits={user?.legacyCredits || 0}
        legacyGpa={user?.legacyGpa || 0}
        onRefresh={handleRefreshGpa}
        isRefreshing={isHardRefreshing || isFetching}
      />

      <div className="py-3">
        <AdPlaceholder variant="large-banner" testId="ad-inline-dashboard" />
      </div>

      <main 
        className="max-w-2xl mx-auto px-4 py-6 space-y-4"
      >
        {sortedSemesters.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">אין סמסטרים עדיין</h2>
            <p className="text-muted-foreground mb-6">
              התחל להוסיף את הסמסטרים והקורסים שלך
            </p>
            <div className="flex flex-col gap-3 items-center">
              <Button
                onClick={handleAddSemesterClick}
                data-testid="button-add-first-semester"
                className="min-w-[200px]"
              >
                <Plus className="w-4 h-4 ms-2" />
                הוסף סמסטר ראשון
              </Button>
              <Button
                variant="outline"
                onClick={handleAddCompletedYearClick}
                data-testid="button-add-completed-year-empty"
                className="min-w-[200px] border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
              >
                <History className="w-4 h-4 ms-2" />
                הוסף שנה שהסתיימה
              </Button>
            </div>
          </div>
        ) : (
          <>
            {sortedSemesters.map((semester) => (
              <SemesterCard
                key={semester.id}
                semester={semester}
                onComponentScoreChange={handleComponentScoreChange}
                onTargetGradeChange={handleTargetGradeChange}
                onAddCourse={() => handleAddCourse(semester.id)}
                onDeleteSemester={handleDeleteSemester}
                onDeleteCourse={handleDeleteCourse}
                onEditCourse={handleEditCourse}
                onComponentScoreCommit={handleComponentScoreCommit}
                onClearCourseGrades={handleClearCourseGrades}
                onImportRecommended={handleImportRecommended}
                isImporting={importingSemesterId === semester.id}
              />
            ))}

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleAddSemesterClick}
                data-testid="button-add-semester"
              >
                <Plus className="w-4 h-4 ms-2" />
                הוסף סמסטר
              </Button>
              <Button
                variant="outline"
                onClick={handleAddCompletedYearClick}
                data-testid="button-add-completed-year"
                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
              >
                <History className="w-4 h-4 ms-2" />
                הוסף שנה שהסתיימה
              </Button>
            </div>
          </>
        )}
      </main>

      <BottomNavigation />

      <CreateSemesterDialog
        open={isCreateSemesterOpen}
        onOpenChange={setIsCreateSemesterOpen}
        onSubmit={(data) => createSemesterMutation.mutate(data)}
        isPending={createSemesterMutation.isPending}
        mode={semesterDialogMode}
      />

      <CreateCourseDialog
        open={isCreateCourseOpen}
        onOpenChange={(open) => {
          setIsCreateCourseOpen(open);
          if (!open) setEditingCourse(null);
        }}
        onSubmit={(data) => {
          if (editingCourse) {
            updateCourseMutation.mutate({ courseId: editingCourse.id, data });
          } else if (activeSemesterId) {
            createCourseMutation.mutate({ ...data, semesterId: activeSemesterId });
          }
        }}
        isPending={createCourseMutation.isPending || updateCourseMutation.isPending}
        semesterName={activeSemester?.name}
        editCourse={editingCourse}
      />

      <PaywallModal
        open={isPaywallOpen}
        onOpenChange={setIsPaywallOpen}
        trigger={paywallTrigger}
      />

      <SmartStrategyPlanner
        open={isSmartStrategyOpen}
        onOpenChange={setIsSmartStrategyOpen}
        semesters={effectiveSemesters}
        user={user}
      />
    </div>
  );
}
