import { useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PayPalSubscriptionProps {
  clientId: string;
}

export function PayPalSubscription({ clientId }: PayPalSubscriptionProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const planIds = {
    monthly: "P-57T72664747934907NE6BWDA",
    yearly: "P-9DW09974KX486404FNE6BXOA",
  };

  const prices = {
    monthly: "19.90",
    yearly: "199.90",
  };

  const yearlySavings = Math.round(((19.90 * 12 - 199.90) / (19.90 * 12)) * 100);

  const handleApprove = async (data: any) => {
    try {
      await apiRequest("POST", "/api/subscription/upgrade", {
        subscriptionId: data.subscriptionID,
        planId: planIds[billingCycle],
      });

      toast({
        title: "שודרגת בהצלחה!",
        description: "המנוי שלך עודכן לפרו",
      });

      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      toast({
        title: "שגיאה בשדרוג",
        description: "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    }
  };

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        intent: "subscription",
        vault: true,
      }}
    >
      <div className="space-y-4">
        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-3">
            <Switch
              id="billing-cycle"
              checked={billingCycle === "yearly"}
              onCheckedChange={(checked) =>
                setBillingCycle(checked ? "yearly" : "monthly")
              }
            />
            <Label htmlFor="billing-cycle" className="cursor-pointer">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-medium",
                    billingCycle === "monthly" && "text-foreground"
                  )}
                >
                  חודשי ({prices.monthly}₪)
                </span>
                <span className="text-muted-foreground">/</span>
                <span
                  className={cn(
                    "font-medium",
                    billingCycle === "yearly" && "text-foreground"
                  )}
                >
                  שנתי ({prices.yearly}₪)
                </span>
                {billingCycle === "yearly" && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    חסכון {yearlySavings}%
                  </span>
                )}
              </div>
            </Label>
          </div>
        </div>

        {/* PayPal Buttons */}
        <PayPalButtons
          style={{
            shape: "rect",
            color: "blue",
            layout: "vertical",
            label: "subscribe",
          }}
          createSubscription={(data, actions) => {
            return actions.subscription.create({
              plan_id: planIds[billingCycle],
            });
          }}
          onApprove={async (data, actions) => {
            if (actions.subscription) {
              const details = await actions.subscription.get();
              await handleApprove({
                subscriptionID: data.subscriptionID,
                ...details,
              });
            }
          }}
          onError={(err) => {
            console.error("PayPal error:", err);
            toast({
              title: "שגיאה בתשלום",
              description: "נסה שוב מאוחר יותר",
              variant: "destructive",
            });
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}

