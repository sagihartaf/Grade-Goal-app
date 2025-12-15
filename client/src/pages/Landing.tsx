import { GraduationCap, Target, Sliders, Shield, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";
import { useLocation } from "wouter";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleAuth = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      if (mode === "signup") {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (!data.session) {
          setStatus("נשלח מייל אישור. בדוק את התיבה שלך כדי להשלים הרשמה.");
        } else {
          setStatus("ההרשמה הצליחה! מועבר לדשבורד...");
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
    <div className="min-h-screen bg-background flex flex-col">
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
                  onClick={() => setMode("signin")}
                >
                  התחברות
                </Button>
                <Button
                  variant={mode === "signup" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("signup")}
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
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleAuth}
                  disabled={isLoading || !email || !password}
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

      <Footer />
    </div>
  );
}
