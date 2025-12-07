import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Check, Crown, Sparkles } from "lucide-react";
import { useProStatus } from "@/hooks/useProStatus";

interface SubscriptionData {
  subscriptionTier: string;
}

export default function Subscription() {
  const { data: subscription, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
  });

  const { redirectToCheckout } = useProStatus();

  const isPro = subscription?.subscriptionTier === "pro";

  const features = [
    { name: "חישוב ממוצע ציונים", free: true, pro: true },
    { name: "ניהול סמסטרים וקורסים", free: true, pro: true },
    { name: "אלגוריתם מגן", free: true, pro: true },
    { name: "סימולציות What-If", free: true, pro: true },
    { name: "ניתוח אנליטי מתקדם", free: false, pro: true },
    { name: "דירוג אחוזוני", free: false, pro: true },
    { name: "ללא פרסומות", free: false, pro: true },
    { name: "ייצוא PDF", free: false, pro: true },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20" dir="rtl">
        <div className="fixed top-4 start-4 z-50">
          <ThemeToggle />
        </div>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <div className="fixed top-4 start-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6" data-testid="heading-subscription">מנוי</h1>

        <div className="grid gap-4">
          <Card className={isPro ? "" : "ring-2 ring-primary"}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">חינם</CardTitle>
                {!isPro && <Badge variant="default">נוכחי</Badge>}
              </div>
              <CardDescription>התחל לעקוב אחרי הציונים שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">₪0<span className="text-sm font-normal text-muted-foreground">/חודש</span></div>
              <ul className="space-y-2">
                {features.filter(f => f.free).map((feature) => (
                  <li key={feature.name} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    <span>{feature.name}</span>
                  </li>
                ))}
                {features.filter(f => !f.free).map((feature) => (
                  <li key={feature.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4" />
                    <span className="line-through">{feature.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className={isPro ? "ring-2 ring-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <CardTitle className="text-lg">פרו</CardTitle>
                </div>
                {isPro && <Badge variant="default">נוכחי</Badge>}
              </div>
              <CardDescription>כל הכלים לאופטימיזציה מקסימלית</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                ₪19.90<span className="text-sm font-normal text-muted-foreground">/חודש</span>
              </div>
              <ul className="space-y-2 mb-6">
                {features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    <span>{feature.name}</span>
                    {feature.pro && !feature.free && (
                      <Sparkles className="w-3 h-3 text-amber-500" />
                    )}
                  </li>
                ))}
              </ul>

              {isPro ? (
                <div className="text-center text-sm text-muted-foreground py-2">
                  אתם מנויי Pro פעילים
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={redirectToCheckout}
                  data-testid="button-upgrade-pro"
                >
                  <Crown className="w-4 h-4 ms-2" />
                  שדרג לפרו
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
