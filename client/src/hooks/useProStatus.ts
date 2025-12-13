import { useAuth } from './useAuth';

interface ProStatus {
  isPro: boolean;
  isLoading: boolean;
  redirectToCheckout: () => void;
}

// Unlimited semesters for all users (removed paywall from semester creation)
const FREE_TIER_SEMESTER_LIMIT = 999;
const LEMON_SQUEEZY_CHECKOUT_URL = 'https://gradegoal.lemonsqueezy.com/buy/1a922e3f-709c-47a3-9395-7b93865cad80';

export function useProStatus(): ProStatus {
  const { user, isLoading: authLoading } = useAuth();
  
  const isPro = user?.subscriptionTier === 'pro';

  const redirectToCheckout = () => {
    if (!user?.id) {
      console.error('User must be logged in to purchase');
      return;
    }
    
    const checkoutUrl = `${LEMON_SQUEEZY_CHECKOUT_URL}?checkout[custom][user_id]=${encodeURIComponent(user.id)}`;
    window.location.href = checkoutUrl;
  };

  return {
    isPro,
    isLoading: authLoading,
    redirectToCheckout,
  };
}

// Free users now have unlimited semesters - no paywall on core functionality
export function canCreateSemester(semesterCount: number, isPro: boolean): boolean {
  return true; // Always allow semester creation
}

export { FREE_TIER_SEMESTER_LIMIT };
