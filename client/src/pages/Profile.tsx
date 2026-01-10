import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { User as UserIcon, Building2, Target, LogOut, Loader2, GraduationCap, Linkedin } from "lucide-react";
import type { User } from "@shared/schema";
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
import { useLocation } from "wouter";
import { ResourceCombobox } from "@/components/ui/ResourceCombobox";

const formSchema = z.object({
  academicInstitution: z.string().optional(),
  degreeName: z.string().optional(),
  targetGpa: z.number().min(0).max(100).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Type guard to ensure user is properly typed
  const typedUser: User | undefined = user || undefined;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      academicInstitution: "",
      degreeName: "",
      targetGpa: null,
    },
  });

  useEffect(() => {
    if (typedUser) {
      // Now academicInstitution and degreeName are stored as Hebrew names directly
      form.reset({
        academicInstitution: typedUser.academicInstitution || "",
        degreeName: typedUser.degreeName || "",
        targetGpa: typedUser.targetGpa || null,
      });
    }
  }, [typedUser, form]);

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
    if (typedUser?.firstName && typedUser?.lastName) {
      return `${typedUser.firstName[0]}${typedUser.lastName[0]}`;
    }
    if (typedUser?.email) {
      return typedUser.email[0].toUpperCase();
    }
    return "U";
  };

  const getDisplayName = () => {
    if (typedUser?.firstName || typedUser?.lastName) {
      return [typedUser.firstName, typedUser.lastName].filter(Boolean).join(" ");
    }
    return typedUser?.email || "משתמש";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-40 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Right side (RTL): page title + theme */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">פרופיל</h1>
            <ThemeToggle />
          </div>

          {/* Left side (RTL): About only */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/about")}
            >
              אודות
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card data-testid="card-user-info">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage 
                  src={typedUser?.profileImageUrl || ""} 
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
                {typedUser?.email && (
                  <p className="text-sm text-muted-foreground truncate" data-testid="text-user-email">
                    {typedUser.email}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-profile-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
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
                        <ResourceCombobox
                          table="academic_institutions"
                          value={field.value || null}
                          onChange={(value) => field.onChange(value || "")}
                          disabled={updateProfileMutation.isPending}
                          placeholder="בחר מוסד אקדמי..."
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
                        <ResourceCombobox
                          table="academic_degrees"
                          value={field.value || null}
                          onChange={(value) => field.onChange(value || "")}
                          disabled={updateProfileMutation.isPending}
                          placeholder="בחר או הקלד שם תואר..."
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

        {/* Created by Footer */}
        <div className="flex flex-col items-center justify-center gap-2 mt-12 text-center">
          <a
            href="https://www.linkedin.com/in/sagi-hartaf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Created by Sagi Hartaf
            <Linkedin className="w-4 h-4" />
          </a>
          <p className="text-xs text-muted-foreground/80">
            משהו לא עובד או שיש רעיון לשיפור? אשמח לשמוע
          </p>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
