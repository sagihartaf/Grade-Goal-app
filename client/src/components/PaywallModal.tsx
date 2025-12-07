import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Crown, Check, Loader2, X } from 'lucide-react';
import { useProStatus, FREE_TIER_SEMESTER_LIMIT } from '@/hooks/useProStatus';
import type { Package } from '@/services/revenuecat';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: 'semester_limit' | 'feature' | 'manual';
}

interface PackageDisplayInfo {
  title: string;
  subtitle: string;
  popular?: boolean;
  savings?: string;
}

function getPackageDisplayInfo(rcPackage: Package): PackageDisplayInfo {
  const identifier = rcPackage.identifier.toLowerCase();
  
  if (identifier.includes('lifetime')) {
    return {
      title: 'לכל החיים',
      subtitle: 'תשלום חד פעמי',
      savings: 'החיסכון הגדול ביותר',
    };
  }
  
  if (identifier.includes('annual') || identifier.includes('yearly')) {
    return {
      title: 'שנתי',
      subtitle: 'לחודש',
      popular: true,
      savings: 'חסכו 33%',
    };
  }
  
  return {
    title: 'חודשי',
    subtitle: 'לחודש',
  };
}

function formatPrice(rcPackage: Package): string {
  const product = rcPackage.webBillingProduct;
  if (!product) return '';
  
  const price = product.currentPrice;
  return price.formattedPrice;
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
  const { offerings, purchase, isLoading } = useProStatus();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const packages = offerings?.current?.availablePackages || [];

  const handlePurchase = async (rcPackage: Package) => {
    setSelectedPackage(rcPackage);
    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const success = await purchase(rcPackage);
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      setPurchaseError('הרכישה נכשלה. אנא נסו שוב.');
    } finally {
      setIsPurchasing(false);
      setSelectedPackage(null);
    }
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
          ) : packages.length > 0 ? (
            <div className="space-y-3 mt-6">
              {packages.map((rcPackage) => {
                const displayInfo = getPackageDisplayInfo(rcPackage);
                const isSelected = selectedPackage?.identifier === rcPackage.identifier;
                
                return (
                  <Card
                    key={rcPackage.identifier}
                    className={`relative p-4 cursor-pointer transition-all hover-elevate ${
                      displayInfo.popular ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => !isPurchasing && handlePurchase(rcPackage)}
                    data-testid={`card-package-${rcPackage.identifier}`}
                  >
                    {displayInfo.popular && (
                      <Badge 
                        className="absolute -top-2 start-4 bg-primary text-primary-foreground"
                      >
                        הכי פופולרי
                      </Badge>
                    )}
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{displayInfo.title}</span>
                          {displayInfo.savings && (
                            <Badge variant="secondary" className="text-xs">
                              {displayInfo.savings}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {displayInfo.subtitle}
                        </p>
                      </div>
                      
                      <div className="text-end">
                        <span className="text-xl font-bold">
                          {formatPrice(rcPackage)}
                        </span>
                      </div>
                    </div>

                    {isSelected && isPurchasing && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>לא נמצאו חבילות זמינות כרגע</p>
            </div>
          )}

          {purchaseError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>{purchaseError}</span>
            </div>
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
