import { Purchases, type CustomerInfo, type Package, type Offerings } from '@revenuecat/purchases-js';

const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY;
const ENTITLEMENT_ID = 'GradeGoal Pro';

let purchasesInstance: typeof Purchases.prototype | null = null;

export function configureRevenueCat(userId: string): typeof Purchases.prototype {
  if (purchasesInstance) {
    return purchasesInstance;
  }

  if (!REVENUECAT_API_KEY) {
    throw new Error('RevenueCat API key not configured');
  }

  purchasesInstance = Purchases.configure({
    apiKey: REVENUECAT_API_KEY,
    appUserId: userId,
  });

  return purchasesInstance;
}

export function isRevenueCatConfigured(): boolean {
  return purchasesInstance !== null;
}

export function getRevenueCatInstance(): typeof Purchases.prototype {
  if (!purchasesInstance) {
    throw new Error('RevenueCat not configured. Call configureRevenueCat first.');
  }
  return purchasesInstance;
}

export async function getOfferings(): Promise<Offerings | null> {
  try {
    const purchases = getRevenueCatInstance();
    return await purchases.getOfferings();
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const purchases = getRevenueCatInstance();
    return await purchases.getCustomerInfo();
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

export async function checkProEntitlement(): Promise<boolean> {
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return false;
    
    return ENTITLEMENT_ID in customerInfo.entitlements.active;
  } catch (error) {
    console.error('Failed to check entitlement:', error);
    return false;
  }
}

export async function purchasePackage(rcPackage: Package, email?: string): Promise<CustomerInfo | null> {
  try {
    const purchases = getRevenueCatInstance();
    const { customerInfo } = await purchases.purchase({
      rcPackage,
      email,
    });
    return customerInfo;
  } catch (error: any) {
    if (error?.errorCode === 'UserCancelledError') {
      console.log('User cancelled purchase');
      return null;
    }
    console.error('Purchase failed:', error);
    throw error;
  }
}

export { ENTITLEMENT_ID };
export type { Package, Offerings, CustomerInfo };
