import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface ProNotificationResponse {
  hasNotification: boolean;
  requestId?: string;
}

export function ProCelebrationModal() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: notificationData, isLoading } = useQuery<ProNotificationResponse>({
    queryKey: ["/api/user/pro-notification"],
    enabled: isAuthenticated,
    retry: false,
  });

  const markSeenMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("POST", "/api/user/pro-notification/mark-seen", { requestId });
    },
    onSuccess: () => {
      // Optimistically update the query to close dialog immediately
      queryClient.setQueryData<ProNotificationResponse>(["/api/user/pro-notification"], {
        hasNotification: false,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/pro-notification"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setShowConfetti(false);
    },
  });

  const hasNotification = notificationData?.hasNotification === true;
  const requestId = notificationData?.requestId;

  useEffect(() => {
    if (hasNotification && !isLoading) {
      setShowConfetti(true);
      // Stop confetti after 3 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasNotification, isLoading]);

  const handleOpenChange = (open: boolean) => {
    if (!open && requestId && !markSeenMutation.isPending) {
      // Mark as seen when dialog is closed
      markSeenMutation.mutate(requestId);
    }
  };

  const handleButtonClick = () => {
    if (requestId && !markSeenMutation.isPending) {
      markSeenMutation.mutate(requestId);
    }
  };

  // Don't render anything if there's no notification or still loading
  if (!hasNotification || isLoading) {
    return null;
  }

  return (
    <>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                backgroundColor: [
                  "#fbbf24", // amber-400
                  "#f59e0b", // amber-500
                  "#d97706", // amber-600
                  "#fbbf24", // amber-400
                  "#fbbf24", // amber-400
                ][Math.floor(Math.random() * 5)],
              }}
            />
          ))}
        </div>
      )}

      {/* Celebration Modal */}
      <Dialog open={hasNotification && !markSeenMutation.isSuccess} onOpenChange={handleOpenChange}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <Crown className="w-16 h-16 text-amber-500 animate-bounce" />
                <Sparkles className="w-8 h-8 text-amber-400 absolute -top-2 -right-2 animate-pulse" />
              </div>
            </div>
            <DialogTitle className="text-2xl text-center font-bold">
              תודה רבה! קיבלת מנוי Pro מתנה! 👑
            </DialogTitle>
            <DialogDescription className="text-center text-base mt-4">
              הקורסים שהעלית נבדקו ואושרו. כאות תודה, שדרגנו את החשבון שלך למנוי Pro לשנה שלמה.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleButtonClick}
              disabled={markSeenMutation.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white text-lg py-6"
              size="lg"
            >
              {markSeenMutation.isPending ? "סוגר..." : "איזה כיף! 🎉"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confetti CSS Styles */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          border-radius: 50%;
          animation: confetti-fall linear forwards;
        }

        .confetti-piece:nth-child(odd) {
          width: 8px;
          height: 8px;
          border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
        }

        .confetti-piece:nth-child(even) {
          width: 12px;
          height: 12px;
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
        }
      `}</style>
    </>
  );
}
