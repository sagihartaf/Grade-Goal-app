import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Calculator, Shield, Target, Mail } from "lucide-react";

export default function About() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">אודות GradeGoal</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            הכלי האסטרטגי המתקדם לסטודנטים בישראל לחישוב, תכנון ואופטימיזציה של התואר האקדמי.
          </p>
        </div>

        {/* Mission Statement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              המטרה שלנו
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              GradeGoal נולד מתוך צורך אמיתי של סטודנטים: חוסר הבהירות בחישוב הממוצע והקושי לתכנן קדימה.
              אנחנו מאמינים שניהול התואר לא צריך להיות מבוסס על ניחושים, אלא על דאטה ואיסטרטגיה.
            </p>
            <p>
              המערכת שפיתחנו מאפשרת לכל סטודנט לחשב בדיוק אילו ציונים הוא צריך כדי להשיג את יעדי הקריירה והלימודים שלו,
              תוך התחשבות בחוקים המורכבים של המוסדות האקדמיים השונים.
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-amber-500" />
                תכנון אסטרטגי
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                הגדרת יעד ממוצע וקבלת תחזיות מדויקות לגבי הציונים הנדרשים בכל קורס כדי לעמוד ביעד הסופי.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-500" />
                סימולציות What-If
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                מנוע סימולציה המאפשר לשנות ציונים בזמן אמת ולראות כיצד כל שינוי משפיע על הממוצע הכולל והסמסטריאלי.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                אלגוריתם מגן
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                חישוב אוטומטי של ציון מגן ושקלול קורסים בהתאם לכללי המוסדות האקדמיים בישראל, למניעת טעויות חישוב נפוצות.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Section - Critical for AdSense */}
        <Card id="contact">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              צור קשר
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              אנחנו כאן לכל שאלה, בקשה או הצעה לשיפור.
              אנו עושים מאמצים לענות לכל פנייה בהקדם האפשרי.
            </p>
            <div className="bg-muted p-4 rounded-md">
              <p className="font-medium">פניות בנושא תמיכה ושיתופי פעולה:</p>
              <Button asChild>
                <a
                  href="mailto:hrtf.trade@gmail.com"
                  className="font-mono"
                >
                  ליצירת קשר
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


