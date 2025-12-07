import { GraduationCap, Target, Sliders, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const handleLogin = () => {
    window.location.href = "/api/login";
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
            <ThemeToggle />
            <Button onClick={handleLogin} data-testid="button-login-header">
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

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleLogin}
                className="text-lg px-8"
                data-testid="button-login-hero"
              >
                התחל עכשיו
                <ArrowLeft className="w-5 h-5 me-2" />
              </Button>
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
              onClick={handleLogin}
              data-testid="button-login-cta"
            >
              התחבר עכשיו - חינם
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} GradeGoal. כל הזכויות שמורות.</p>
        </div>
      </footer>
    </div>
  );
}
