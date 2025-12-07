import { useProStatus } from "@/hooks/useProStatus";
import { cn } from "@/lib/utils";

type AdVariant = "banner" | "large-banner";

interface AdPlaceholderProps {
  variant?: AdVariant;
  className?: string;
  testId?: string;
}

const AD_SIZES: Record<AdVariant, { height: string; label: string }> = {
  "banner": { height: "h-[50px]", label: "320×50" },
  "large-banner": { height: "h-[100px]", label: "320×100" },
};

export function AdPlaceholder({ 
  variant = "banner", 
  className,
  testId = "ad-placeholder"
}: AdPlaceholderProps) {
  const { isPro, isLoading } = useProStatus();

  if (isLoading || isPro) {
    return null;
  }

  const { height } = AD_SIZES[variant];

  return (
    <div
      className={cn(
        "w-full max-w-[320px] mx-auto",
        "bg-muted/50 dark:bg-muted/30",
        "border border-border/50 rounded-md",
        "flex items-center justify-center",
        "text-muted-foreground text-sm",
        height,
        className
      )}
      data-testid={testId}
      role="complementary"
      aria-label="שטח פרסום"
    >
      <span className="select-none opacity-60">שטח פרסום</span>
    </div>
  );
}

export function StickyBottomAd() {
  const { isPro, isLoading } = useProStatus();

  if (isLoading || isPro) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-16 left-0 right-0 z-40 flex justify-center py-2 bg-background/80 backdrop-blur-sm border-t border-border/30 safe-area-pb"
      data-testid="ad-sticky-bottom"
    >
      <div
        className={cn(
          "w-full max-w-[320px]",
          "h-[50px]",
          "bg-muted/50 dark:bg-muted/30",
          "border border-border/50 rounded-md",
          "flex items-center justify-center",
          "text-muted-foreground text-sm"
        )}
        role="complementary"
        aria-label="שטח פרסום"
      >
        <span className="select-none opacity-60">שטח פרסום</span>
      </div>
    </div>
  );
}
