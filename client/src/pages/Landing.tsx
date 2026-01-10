import { GraduationCap, Target, Sliders, Shield, ArrowLeft, BookOpen, Calculator, TrendingUp, Building2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabaseClient";
import { useLocation } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ResourceCombobox } from "@/components/ui/ResourceCombobox";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const features = [
  {
    icon: Target,
    title: "תכנון אסטרטגי",
    description: "הגדר יעד ממוצע וקבל תחזיות מדויקות איזה ציונים אתה צריך",
  },
  {
    icon: Sliders,
    title: "סימולציית What-If",
    description: "שנה ציונים בזמן אמת וראה כיצד הם משפיעים על הממוצע",
  },
  {
    icon: Shield,
    title: "אלגוריתם מגן",
    description: "חישוב אוטומטי של ציון מגן לפי כללי המוסדות האקדמיים בישראל",
  },
];

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [academicInstitution, setAcademicInstitution] = useState<string | null>(null);
  const [degreeName, setDegreeName] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Mutation to update user profile after signup
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { academicInstitution?: string; degreeName?: string }) => {
      await apiRequest("PATCH", "/api/profile", data);
    },
    onSuccess: () => {
      toast({ title: "הפרופיל עודכן בהצלחה" });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      // Don't show error toast on signup - user can update later in profile
    },
  });

  const handleAuth = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      if (mode === "signup") {
        // Validate required fields for signup
        if (!academicInstitution || !degreeName) {
          setStatus("נא למלא את כל השדות הנדרשים: מוסד אקדמי ותואר");
          setIsLoading(false);
          return;
        }

        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (!data.session) {
          setStatus("נשלח מייל אישור. בדוק את התיבה שלך כדי להשלים הרשמה.");
          // Note: Profile will be updated when user confirms email and signs in
        } else {
          // User has session immediately - update profile
          try {
            await updateProfileMutation.mutateAsync({
              academicInstitution: academicInstitution || undefined,
              degreeName: degreeName || undefined,
            });
          } catch (profileError) {
            console.error("Failed to update profile:", profileError);
            // Continue anyway - user can update in profile page
          }
          setStatus("ההרשמה הצליחה! מועבר לדשבורד...");
          // Small delay to show success message
          setTimeout(() => {
            navigate("/");
          }, 1000);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setStatus("התחברת בהצלחה! מועבר לדשבורד...");
        // Immediate client-side redirect to ensure UX even if async listeners lag
        navigate("/");
      }
    } catch (err: any) {
      setStatus(err?.message || "שגיאה בהתחברות");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">GradeGoal</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate("/about")}
            >
              אודות
            </Button>
            <ThemeToggle />
            <Button
              onClick={() => {
                setMode("signin");
                document.getElementById("email")?.scrollIntoView({ behavior: "smooth", block: "center" });
                document.getElementById("email")?.focus();
              }}
              data-testid="button-login-header"
            >
              התחברות
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <GraduationCap className="w-4 h-4" />
              לסטודנטים ישראליים
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              תכנן את הממוצע שלך
              <br />
              <span className="text-primary">בצורה חכמה</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              GradeGoal הוא הכלי האסטרטגי המתקדם ביותר לחישוב ואופטימיזציה של ממוצע התואר. 
              חשב בדיוק אילו ציונים אתה צריך כדי להשיג את היעדים שלך.
            </p>

            <div className="max-w-md mx-auto bg-card border rounded-xl p-6 text-start space-y-4 shadow-sm">
              <div className="flex gap-2 mb-2">
                <Button
                  variant={mode === "signin" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMode("signin");
                    setAcademicInstitution(null);
                    setDegreeName(null);
                    setStatus(null);
                  }}
                >
                  התחברות
                </Button>
                <Button
                  variant={mode === "signup" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMode("signup");
                    setStatus(null);
                  }}
                >
                  הרשמה
                </Button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email">אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password">סיסמה</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                </div>
                {mode === "signup" && (
                  <>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        מוסד אקדמי <span className="text-destructive">*</span>
                      </Label>
                      <ResourceCombobox
                        table="academic_institutions"
                        value={academicInstitution}
                        onChange={setAcademicInstitution}
                        disabled={isLoading}
                        placeholder="בחר מוסד אקדמי..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        שם התואר <span className="text-destructive">*</span>
                      </Label>
                      <ResourceCombobox
                        table="academic_degrees"
                        value={degreeName}
                        onChange={setDegreeName}
                        disabled={isLoading}
                        placeholder="בחר או הקלד שם תואר..."
                      />
                    </div>
                  </>
                )}
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleAuth}
                  disabled={
                    isLoading || 
                    !email || 
                    !password || 
                    (mode === "signup" && (!academicInstitution || !degreeName))
                  }
                  data-testid="button-auth-submit"
                >
                  {isLoading ? "מעבד..." : mode === "signin" ? "התחבר" : "הירשם"}
                  <ArrowLeft className="w-5 h-5 me-2" />
                </Button>
                {status && (
                  <p className="text-sm text-muted-foreground text-center" data-testid="auth-status">
                    {status}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: The Problem & Solution */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">
              למה חשוב לנהל את הממוצע שלך?
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p className="text-right">
                הצלחה אקדמית אינה רק עניין של לימודים קשים ושעות רבות בספרייה. 
                סטודנטים רבים מגלים כי למרות המאמץ הרב שהם משקיעים, הממוצע המשוקלל שלהם 
                לא מתקדם כפי שציפו. הסיבה לכך היא שניהול נכון של הממוצע דורש אסטרטגיה חכמה 
                ולא רק עבודה קשה. תכנון תואר נכון כולל הבנה של אילו קורסים כדאי לקחת מחדש, 
                אילו ציונים באמת משפיעים על הממוצע המשוקלל, ואיך לבנות מסלול לימודים שיביא 
                אותך ליעד שלך בצורה היעילה ביותר.
              </p>
              <p className="text-right">
                GradeGoal נוצר בדיוק כדי לפתור את הבעיה הזו. הכלי שלנו מאפשר לך לנהל את כל 
                הקורסים שלך במקום אחד, לחשב את הממוצע המשוקלל שלך בזמן אמת, ולבנות אסטרטגיה 
                אקדמית מותאמת אישית. בעזרת מנוע האסטרטגיה החכם שלנו, תוכל לדעת בדיוק אילו 
                קורסים כדאי לך לקחת מחדש, אילו ציונים אתה צריך להשיג כדי להגיע ליעד הממוצע 
                שלך, ולחזות את ההשפעה של כל החלטה על הממוצע המשוקלל שלך. זהו כלי חיוני 
                לכל סטודנט שרוצה לנהל את התואר שלו בצורה אסטרטגית וחכמה.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: How It Works */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              איך זה עובד?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-3">הזנת ציונים</h3>
                  <p className="text-muted-foreground text-right leading-relaxed">
                    עקוב אחר כל הקורסים שלך במקום אחד. הזן את הציונים, נקודות הזכות, 
                    והסמסטרים של כל קורס, והמערכת תשמור את כל המידע בצורה מסודרת 
                    ונגישה.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calculator className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-3">חישוב בזמן אמת</h3>
                  <p className="text-muted-foreground text-right leading-relaxed">
                    המערכת שלנו מחשבת את הממוצע המשוקלל שלך באופן מיידי. כל פעם שאתה 
                    מוסיף או משנה ציון, הממוצע מתעדכן אוטומטית לפי כללי המוסדות האקדמיים 
                    בישראל.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-3">בניית אסטרטגיה</h3>
                  <p className="text-muted-foreground text-right leading-relaxed">
                    השתמש במנוע האסטרטגיה כדי למצוא את הדרך הקלה ביותר להגיע ליעד הממוצע 
                    שלך. המערכת תציע לך אילו קורסים כדאי לקחת מחדש ואילו ציונים אתה צריך 
                    להשיג.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section 3: FAQ */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              שאלות ותשובות
            </h2>
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="item-1" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-right hover:no-underline">
                  <span className="font-semibold text-lg">האם השימוש בחינם?</span>
                </AccordionTrigger>
                <AccordionContent className="text-right text-muted-foreground leading-relaxed">
                  כן, התכונות הבסיסיות של GradeGoal זמינות בחינם. תוכל להזין את כל הקורסים 
                  שלך, לחשב את הממוצע המשוקלל, ולבצע סימולציות בסיסיות. תכונות מתקדמות כמו 
                  מנוע האסטרטגיה החכם זמינות במנוי פרימיום.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-right hover:no-underline">
                  <span className="font-semibold text-lg">איך מחושב הממוצע?</span>
                </AccordionTrigger>
                <AccordionContent className="text-right text-muted-foreground leading-relaxed">
                  הממוצע המשוקלל מחושב לפי הסטנדרט המקובל במוסדות האקדמיים בישראל. כל ציון 
                  מוכפל בנקודות הזכות של הקורס, סכום כל התוצאות מחולק בסכום נקודות הזכות הכולל. 
                  המערכת תומכת גם בחישוב ציון מגן אוטומטי לפי כללי המוסדות השונים.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-right hover:no-underline">
                  <span className="font-semibold text-lg">האם זה מתאים לכל התארים?</span>
                </AccordionTrigger>
                <AccordionContent className="text-right text-muted-foreground leading-relaxed">
                  כן, GradeGoal מתאים לכל סוגי התארים במוסדות האקדמיים בישראל. בין אם אתה 
                  לומד הנדסה, מדעי החברה, מדעים מדויקים, או כל תחום אחר, המערכת תחשב את 
                  הממוצע המשוקלל שלך בצורה מדויקת ותסייע לך בתכנון האסטרטגי של התואר.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-12">
              למה GradeGoal?
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card 
                    key={index} 
                    className="text-center"
                    data-testid={`card-feature-${index}`}
                  >
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">מוכן להתחיל?</h2>
            <p className="text-muted-foreground mb-8">
              הצטרף לאלפי סטודנטים שכבר משתמשים ב-GradeGoal לניהול הציונים שלהם
            </p>
            <Button 
              size="lg" 
              onClick={() => {
                setMode("signin");
                document.getElementById("email")?.scrollIntoView({ behavior: "smooth", block: "center" });
                document.getElementById("email")?.focus();
              }}
              data-testid="button-login-cta"
            >
              התחבר עכשיו - חינם
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
