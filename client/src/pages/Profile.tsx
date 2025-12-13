import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { User, Building2, Target, LogOut, Loader2, GraduationCap, History, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { supabase } from "@/lib/supabaseClient";

const formSchema = z.object({
  academicInstitution: z.string().optional(),
  degreeName: z.string().optional(),
  targetGpa: z.number().min(0).max(100).optional().nullable(),
  legacyCredits: z.number().min(0).optional().nullable(),
  legacyGpa: z.number().min(0).max(100).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      academicInstitution: "",
      degreeName: "",
      targetGpa: null,
      legacyCredits: null,
      legacyGpa: null,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        academicInstitution: user.academicInstitution || "",
        degreeName: user.degreeName || "",
        legacyCredits: user.legacyCredits || null,
        legacyGpa: user.legacyGpa || null,
        targetGpa: user.targetGpa || null,
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest("PATCH", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "הפרופיל עודכן בהצלחה" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "לא מורשה",
          description: "נא להתחבר מחדש...",
          variant: "destructive",
        });
        supabase.auth.signOut().finally(() => {
          window.location.href = "/";
        });
        return;
      }
      toast({ title: "שגיאה בעדכון הפרופיל", variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    window.location.href = "/";
  };

  const handleSubmit = (data: FormData) => {
    updateProfileMutation.mutate(data);
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getDisplayName = () => {
    if (user?.firstName || user?.lastName) {
      return [user.firstName, user.lastName].filter(Boolean).join(" ");
    }
    return user?.email || "משתמש";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-32 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">פרופיל</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card data-testid="card-user-info">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage 
                  src={user?.profileImageUrl || ""} 
                  alt={getDisplayName()}
                  className="object-cover"
                />
                <AvatarFallback className="text-lg font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg truncate" data-testid="text-user-name">
                  {getDisplayName()}
                </h2>
                {user?.email && (
                  <p className="text-sm text-muted-foreground truncate" data-testid="text-user-email">
                    {user.email}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-profile-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              הגדרות פרופיל
            </CardTitle>
            <CardDescription>
              עדכן את פרטי החשבון שלך
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="academicInstitution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        מוסד אקדמי
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="לדוגמה: אוניברסיטת תל אביב"
                          {...field}
                          data-testid="input-institution"
                        />
                      </FormControl>
                      <FormDescription>
                        המוסד בו אתה לומד
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="degreeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        שם התואר
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="לדוגמה: הנדסת תעשייה וניהול"
                          {...field}
                          data-testid="input-degree-name"
                        />
                      </FormControl>
                      <FormDescription>
                        התואר או התכנית הלימודית שלך
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetGpa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        ממוצע יעד
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="לדוגמה: 85"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          data-testid="input-target-gpa"
                        />
                      </FormControl>
                      <FormDescription>
                        הממוצע שאתה שואף להשיג בתואר
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Legacy Academic Data Section */}
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-start gap-2">
                    <History className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium">היסטוריה אקדמית (קיצור דרך)</h3>
                      <p className="text-sm text-muted-foreground">
                        אם יש לך קורסים קודמים, הזן את הנתונים כאן כדי לדלג על הזנה ידנית
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      המערכת תשלב את הנתונים האלה עם קורסים חדשים שתוסיף. שימושי לסטודנטים בשנים מתקדמות.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="legacyCredits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          נקודות זכות שצברת עד היום (ללא פירוט קורסים)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="לדוגמה: 40"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            data-testid="input-legacy-credits"
                          />
                        </FormControl>
                        <FormDescription>
                          סך כל נקודות הזכות מקורסים קודמים
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
                        <FormLabel>
                          ממוצע משוקלל של הנקודות האלו
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="לדוגמה: 85"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            data-testid="input-legacy-gpa"
                          />
                        </FormControl>
                        <FormDescription>
                          הממוצע שהיה לך בקורסים הקודמים
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "שמור שינויים"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card data-testid="card-account-actions">
          <CardHeader>
            <CardTitle>פעולות חשבון</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 ms-2" />
              התנתק
            </Button>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
}
