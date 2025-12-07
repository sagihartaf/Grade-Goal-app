import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Check, Loader2 } from 'lucide-react';
import { useProStatus, FREE_TIER_SEMESTER_LIMIT } from '@/hooks/useProStatus';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: 'semester_limit' | 'feature' | 'manual';
}

const PRO_FEATURES = [
  'סמסטרים ללא הגבלה',
  'קורסים ללא הגבלה',
  'סימולציות What-If מתקדמות',
  'ייצוא דוחות PDF',
  'דירוג אחוזונים',
  'אנליטיקות מתקדמות',
  'ללא פרסומות',
];

export function PaywallModal({ open, onOpenChange, trigger = 'manual' }: PaywallModalProps) {
  const { redirectToCheckout, isLoading } = useProStatus();

  const handlePurchase = () => {
    redirectToCheckout();
  };

  const getTriggerMessage = () => {
    switch (trigger) {
      case 'semester_limit':
        return `הגעתם למגבלת ${FREE_TIER_SEMESTER_LIMIT} הסמסטרים בחינם. שדרגו ל-Pro כדי להוסיף עוד!`;
      case 'feature':
        return 'פיצ\'ר זה זמין למנויי Pro. שדרגו עכשיו!';
      default:
        return 'שדרגו לחוויה המלאה';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            GradeGoal Pro
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {getTriggerMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          <div className="space-y-3">
            {PRO_FEATURES.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3"
                data-testid={`text-feature-${index}`}
              >
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Button 
              className="w-full mt-6" 
              size="lg"
              onClick={handlePurchase}
              data-testid="button-buy-pro"
            >
              <Crown className="w-4 h-4 me-2" />
              שדרגו ל-Pro
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center mt-4">
            ניתן לבטל בכל עת. התשלום מתבצע באופן מאובטח.
          </p>
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
