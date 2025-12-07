import { useLocation, Link } from "wouter";
import { LayoutDashboard, User, BarChart3, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { path: "/", label: "לוח בקרה", icon: LayoutDashboard },
  { path: "/analytics", label: "אנליטיקה", icon: BarChart3 },
  { path: "/subscription", label: "פרו", icon: Crown },
  { path: "/profile", label: "פרופיל", icon: User },
];

export function BottomNavigation() {
  const [location] = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-card-border z-50 safe-area-pb"
      data-testid="nav-bottom"
    >
      <div className="flex items-center justify-around h-full max-w-2xl mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-w-16 py-2 px-3 rounded-lg transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover-elevate"
                )}
                data-testid={`nav-${item.path === "/" ? "dashboard" : item.path.slice(1)}`}
              >
                <div className="relative">
                  {isActive && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                  )}
                  <Icon 
                    className={cn(
                      "w-6 h-6 transition-all",
                      isActive ? "stroke-[2.5]" : "stroke-[1.5]"
                    )} 
                  />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
