import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  configureRevenueCat, 
  checkProEntitlement, 
  isRevenueCatConfigured,
  getOfferings,
  purchasePackage,
  type Package,
  type Offerings 
} from '@/services/revenuecat';

interface ProStatus {
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  offerings: Offerings | null;
  refetch: () => Promise<void>;
  purchase: (rcPackage: Package) => Promise<boolean>;
}

const FREE_TIER_SEMESTER_LIMIT = 2;

export function useProStatus(): ProStatus {
  const { user, isLoading: authLoading } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<Offerings | null>(null);

  const checkStatus = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (!isRevenueCatConfigured()) {
        configureRevenueCat(user.id);
      }

      const [hasPro, offeringsData] = await Promise.all([
        checkProEntitlement(),
        getOfferings(),
      ]);

      setIsPro(hasPro);
      setOfferings(offeringsData);
    } catch (err) {
      console.error('Failed to check pro status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check subscription status');
      setIsPro(user?.subscriptionTier === 'pro');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.subscriptionTier]);

  useEffect(() => {
    if (!authLoading && user?.id) {
      checkStatus();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, user?.id, checkStatus]);

  const purchase = useCallback(async (rcPackage: Package): Promise<boolean> => {
    if (!user?.email) {
      setError('User email is required for purchase');
      return false;
    }

    try {
      const customerInfo = await purchasePackage(rcPackage, user.email);
      if (customerInfo) {
        await checkStatus();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Purchase failed:', err);
      setError(err instanceof Error ? err.message : 'Purchase failed');
      return false;
    }
  }, [user?.email, checkStatus]);

  return {
    isPro,
    isLoading: authLoading || isLoading,
    error,
    offerings,
    refetch: checkStatus,
    purchase,
  };
}

export function canCreateSemester(semesterCount: number, isPro: boolean): boolean {
  if (isPro) return true;
  return semesterCount < FREE_TIER_SEMESTER_LIMIT;
}

export { FREE_TIER_SEMESTER_LIMIT };
