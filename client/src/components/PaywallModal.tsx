import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Check, Brain, Sparkles } from 'lucide-react';
import { PayPalSubscription } from './PayPalSubscription';
import { useProStatus } from '@/hooks/useProStatus';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: 'smart_strategy' | 'analytics' | 'export' | 'feature';
}

export function PaywallModal({ open, onOpenChange, trigger = 'feature' }: PaywallModalProps) {
  const { isPro } = useProStatus();
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  const features = [
    { name: "חישוב ממוצע ציונים", free: true, pro: true },
    { name: "ניהול סמסטרים וקורסים", free: true, pro: true },
    { name: "אלגוריתם מגן", free: true, pro: true },
    { name: "סימולציות What-If", free: true, pro: true },
    { name: "בניית אסטרטגיית ציונים חכמה (AI)", free: false, pro: true, icon: "brain" },
    { name: "ניתוח אנליטי מתקדם", free: false, pro: true },
    { name: "דירוג אחוזוני", free: false, pro: true },
    { name: "ללא פרסומות", free: false, pro: true },
    { name: "ייצוא PDF", free: false, pro: true },
  ];

  const getTriggerMessage = () => {
    switch (trigger) {
      case 'smart_strategy':
        return 'אסטרטגיית הלימוד החכמה זמינה למנויי Pro בלבד 🧠';
      case 'analytics':
        return 'ניתוח אנליטי מתקדם זמין למנויי Pro';
      case 'export':
        return 'ייצוא PDF זמין למנויי Pro';
      default:
        return 'שדרגו לחוויה המלאה';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            שדרגו ל-GradeGoal Pro
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {getTriggerMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Free Tier Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">חינם</CardTitle>
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

          {/* Pro Tier Card */}
          <Card className="ring-2 ring-amber-500">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <CardTitle className="text-lg">פרו</CardTitle>
                </div>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0">
                  <Sparkles className="w-3 h-3 me-1" />
                  מומלץ
                </Badge>
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
                      feature.icon === "brain" ? (
                        <Brain className="w-3 h-3 text-amber-500" />
                      ) : (
                        <Crown className="w-3 h-3 text-amber-500" />
                      )
                    )}
                  </li>
                ))}
              </ul>

              {isPro ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  אתם מנויי Pro פעילים ✓
                </div>
              ) : paypalClientId ? (
                <PayPalSubscription clientId={paypalClientId} />
              ) : (
                <div className="text-center text-sm text-muted-foreground py-4">
                  PayPal לא מוגדר
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Button 
          variant="ghost" 
          className="mt-4 w-full"
          onClick={() => onOpenChange(false)}
          data-testid="button-close-paywall"
        >
          אולי אחר כך
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default PaywallModal;
