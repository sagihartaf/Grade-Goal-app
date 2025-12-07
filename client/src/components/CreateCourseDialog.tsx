import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import type { CourseWithComponents } from "@shared/schema";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const componentSchema = z.object({
  name: z.string().min(1, "שם המרכיב נדרש"),
  weight: z.number().min(0).max(100),
  score: z.number().min(0).max(100).optional().nullable(),
  isMagen: z.boolean().default(false),
});

const formSchema = z.object({
  name: z.string().min(1, "שם הקורס נדרש"),
  credits: z.number().min(0.1, "יש להזין נקודות זכות").max(20),
  components: z.array(componentSchema).min(1, "יש להוסיף לפחות מרכיב אחד"),
}).refine((data) => {
  const totalWeight = data.components.reduce((sum, c) => sum + c.weight, 0);
  return totalWeight === 100;
}, {
  message: "סכום המשקלים חייב להיות 100%",
  path: ["components"],
});

type FormData = z.infer<typeof formSchema>;

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    credits: number;
    components: Array<{ name: string; weight: number; score?: number | null; isMagen: boolean }>;
  }) => void;
  isPending?: boolean;
  semesterName?: string;
  editCourse?: CourseWithComponents | null;
}

export function CreateCourseDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  semesterName,
  editCourse,
}: CreateCourseDialogProps) {
  const isEditMode = !!editCourse;
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      credits: 3,
      components: [
        { name: "מבחן סופי", weight: 70, score: null, isMagen: false },
        { name: "תרגילים", weight: 30, score: null, isMagen: false },
      ],
    },
  });
  
  useEffect(() => {
    if (editCourse && open) {
      form.reset({
        name: editCourse.name,
        credits: editCourse.credits,
        components: editCourse.gradeComponents.map(c => ({
          name: c.name,
          weight: c.weight,
          score: c.score,
          isMagen: c.isMagen || false,
        })),
      });
    } else if (!editCourse && open) {
      form.reset({
        name: "",
        credits: 3,
        components: [
          { name: "מבחן סופי", weight: 70, score: null, isMagen: false },
          { name: "תרגילים", weight: 30, score: null, isMagen: false },
        ],
      });
    }
  }, [editCourse, open, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "components",
  });

  const totalWeight = form.watch("components").reduce((sum, c) => sum + (c.weight || 0), 0);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
    form.reset();
  };

  const addComponent = () => {
    append({ name: "", weight: 0, score: null, isMagen: false });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-create-course">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "עריכת קורס" : "קורס חדש"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? `עריכת ${editCourse?.name}` 
              : semesterName && `הוסף קורס ל${semesterName}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם הקורס</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="לדוגמה: מבוא למדעי המחשב"
                      {...field}
                      data-testid="input-course-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>נקודות זכות (נ״ז)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      min="0.1"
                      max="20"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      data-testid="input-course-credits"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>מרכיבי הציון</FormLabel>
                <span
                  className={cn(
                    "text-sm font-medium",
                    totalWeight === 100
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  )}
                >
                  סה״כ: {totalWeight}%
                </span>
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name={`components.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="שם המרכיב"
                                {...field}
                                data-testid={`input-component-name-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`components.${index}.weight`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="משקל"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(parseInt(e.target.value) || 0)
                                  }
                                  className="ps-7"
                                  data-testid={`input-component-weight-${index}`}
                                />
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                  %
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`components.${index}.score`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="ציון"
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  field.onChange(val === "" ? null : parseInt(val));
                                }}
                                data-testid={`input-component-score-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`components.${index}.isMagen`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 pt-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid={`checkbox-magen-${index}`}
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-normal cursor-pointer">
                            מגן
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="shrink-0"
                        data-testid={`button-remove-component-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addComponent}
                className="w-full"
                data-testid="button-add-component"
              >
                <Plus className="w-4 h-4 ms-2" />
                הוסף מרכיב
              </Button>

              {form.formState.errors.components?.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.components.root.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                data-testid="button-cancel-course"
              >
                ביטול
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isPending}
                data-testid="button-submit-course"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  isEditMode ? "שמור שינויים" : "צור קורס"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
