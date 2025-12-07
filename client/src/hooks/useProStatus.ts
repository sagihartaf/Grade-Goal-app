import { useAuth } from './useAuth';

interface ProStatus {
  isPro: boolean;
  isLoading: boolean;
  redirectToCheckout: () => void;
}

const FREE_TIER_SEMESTER_LIMIT = 2;
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

export function canCreateSemester(semesterCount: number, isPro: boolean): boolean {
  if (isPro) return true;
  return semesterCount < FREE_TIER_SEMESTER_LIMIT;
}

export { FREE_TIER_SEMESTER_LIMIT };
