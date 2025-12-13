import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, History } from "lucide-react";

const regularFormSchema = z.object({
  academicYear: z.string().min(1, "יש לבחור שנה"),
  term: z.enum(["A", "B", "Summer", "Yearly"], { required_error: "יש לבחור סמסטר" }),
});

const completedYearFormSchema = z.object({
  academicYear: z.string().min(1, "יש לבחור שנה"),
  term: z.enum(["A", "B", "Summer", "Yearly"], { required_error: "יש לבחור סמסטר" }),
  legacyCredits: z.number().min(0.1, "יש להזין נקודות זכות"),
  legacyGpa: z.number().min(0, "ציון מינימלי הוא 0").max(100, "ציון מקסימלי הוא 100"),
});

type RegularFormData = z.infer<typeof regularFormSchema>;
type CompletedYearFormData = z.infer<typeof completedYearFormSchema>;

interface CreateSemesterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { academicYear: number; term: "A" | "B" | "Summer"; legacyCredits?: number; legacyGpa?: number; isLegacyVisible?: boolean }) => void;
  isPending?: boolean;
  mode?: "regular" | "completedYear";
}

export function CreateSemesterDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  mode = "regular",
}: CreateSemesterDialogProps) {
  const isCompletedYearMode = mode === "completedYear";
  
  const form = useForm<RegularFormData | CompletedYearFormData>({
    resolver: zodResolver(isCompletedYearMode ? completedYearFormSchema : regularFormSchema),
    defaultValues: isCompletedYearMode ? {
      academicYear: "",
      term: undefined,
      legacyCredits: 0,
      legacyGpa: 0,
    } : {
      academicYear: "",
      term: undefined,
    },
  });

  const handleSubmit = (data: RegularFormData | CompletedYearFormData) => {
    if (isCompletedYearMode && "legacyCredits" in data) {
      onSubmit({
        academicYear: parseInt(data.academicYear),
        term: data.term,
        legacyCredits: data.legacyCredits,
        legacyGpa: data.legacyGpa,
        isLegacyVisible: true, // Mark as hybrid semester
      });
    } else {
      onSubmit({
        academicYear: parseInt(data.academicYear),
        term: data.term,
      });
    }
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-semester">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCompletedYearMode && <History className="w-5 h-5 text-amber-500" />}
            {isCompletedYearMode ? "הוסף שנה שהסתיימה" : "סמסטר חדש"}
          </DialogTitle>
          <DialogDescription>
            {isCompletedYearMode 
              ? "הזן נתוני שנה שהסתיימה בפורמט מקוצר (ניתן להוסיף קורסים מפורטים מאוחר יותר)"
              : "בחר את השנה והסמסטר שברצונך להוסיף"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="academicYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שנת לימודים</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-academic-year">
                        <SelectValue placeholder="בחר שנה" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          שנה {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="term"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>סמסטר</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-term">
                        <SelectValue placeholder="בחר סמסטר" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A">סמסטר א׳</SelectItem>
                      <SelectItem value="B">סמסטר ב׳</SelectItem>
                      <SelectItem value="Summer">סמסטר קיץ</SelectItem>
                      <SelectItem value="Yearly">שנתי (כל השנה)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isCompletedYearMode && (
              <>
                <div className="border-t pt-4 space-y-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <History className="w-4 h-4" />
                    <span>נתוני שנה מקוצרים (ניתן להוסיף קורסים מפורטים מאוחר יותר)</span>
                  </div>

                  <FormField
                    control={form.control}
                    name="legacyCredits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>נקודות זכות שצברת</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="לדוגמה: 30 או 36.25"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            data-testid="input-legacy-credits"
                          />
                        </FormControl>
                        <FormDescription>
                          סך כל נקודות הזכות בשנה זו (תומך בעשרוניות)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="legacyGpa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ממוצע משוקלל</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="לדוגמה: 85"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            data-testid="input-legacy-gpa"
                          />
                        </FormControl>
                        <FormDescription>
                          הממוצע שהיה לך בשנה זו
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                data-testid="button-cancel-semester"
              >
                ביטול
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isPending}
                data-testid="button-submit-semester"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  isCompletedYearMode ? "שמור שנה" : "צור סמסטר"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

