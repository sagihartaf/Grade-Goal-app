import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CourseSearchResult {
  id: string;
  course_name: string;
  credits: number;
  grade_breakdown: Array<{ name: string; weight: number; isMagen: boolean }>;
  difficulty: "easy" | "medium" | "hard";
  degree_specific: boolean;
}

interface CourseSearchComboboxProps {
  value?: string;
  onSelect: (course: CourseSearchResult | null) => void;
  university?: string | null;
  degree?: string | null;
  disabled?: boolean;
  placeholder?: string;
}

export function CourseSearchCombobox({
  value,
  onSelect,
  university,
  degree,
  disabled = false,
  placeholder = "חפש קורס...",
}: CourseSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceTimer = useRef<number | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query (300ms delay)
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Fetch courses from API
  const { data, isLoading, error } = useQuery<{ courses: CourseSearchResult[] } | null>({
    queryKey: ["/api/courses/search", debouncedQuery, university, degree],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedQuery,
        ...(university && { university }),
        ...(degree && { degree }),
      });
      const token = await (await import("@/lib/supabaseClient")).supabase.auth.getSession().then(
        (res) => res.data.session?.access_token ?? null
      );
      const res = await fetch(`/api/courses/search?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        if (res.status === 401) return null;
        if (res.status === 400) {
          const errorData = await res.json().catch(() => ({ message: "Bad request" }));
          throw new Error(errorData.message || "שגיאה בבקשה");
        }
        throw new Error(`Failed to search courses: ${res.status}`);
      }
      return res.json();
    },
    enabled: 
      !disabled && 
      !!university && 
      debouncedQuery.trim().length >= 2 && // Minimum 2 characters
      open, // Only fetch when popover is open
    retry: false, // Don't retry on error
  });

  const courses = data?.courses || [];
  const selectedCourse = courses.find((c) => c.id === value);

  const handleSelect = (course: CourseSearchResult) => {
    onSelect(course);
    setOpen(false);
    setSearchQuery("");
  };

  if (disabled || !university) {
    return (
      <div className="text-sm text-muted-foreground">
        {!university ? "הגדר את המוסד האקדמי שלך בפרופיל כדי להשתמש בקטלוג הקורסים" : "קטלוג הקורסים לא זמין"}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedCourse ? (
            <span className="truncate">{selectedCourse.course_name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="mr-2 text-sm text-muted-foreground">טוען...</span>
              </div>
            )}
            {error && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-destructive px-4">
                  {error instanceof Error && error.message.includes("שגיאה")
                    ? error.message
                    : "שגיאה בחיפוש קורסים. נסה שוב מאוחר יותר."}
                </div>
              </CommandEmpty>
            )}
            {!isLoading && !error && courses.length === 0 && debouncedQuery.trim().length >= 2 && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  לא נמצאו קורסים תואמים. נסה חיפוש אחר או הוסף קורס ידנית.
                </div>
              </CommandEmpty>
            )}
            {!isLoading && !error && debouncedQuery.trim().length < 2 && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  הקלד לפחות 2 תווים לחיפוש
                </div>
              </CommandEmpty>
            )}
            {!isLoading && !error && courses.length > 0 && (
              <CommandGroup>
                {courses.map((course) => (
                  <CommandItem
                    key={course.id}
                    value={course.id}
                    onSelect={() => handleSelect(course)}
                    className="flex flex-col items-start gap-1"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === course.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1 font-medium">{course.course_name}</span>
                      {course.degree_specific && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          ספציפי לתואר
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mr-6">
                      {course.credits} נ״ז • {course.grade_breakdown.length} מרכיבים
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
