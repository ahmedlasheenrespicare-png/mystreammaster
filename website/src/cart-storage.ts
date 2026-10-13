import { CURRENCIES, PRICING_PLANS } from './data';
import type { CartItem } from './components/CartModal';

export const CART_KEY = 'stream-master-cart';

/** Read both the original static storefront's items and the redesigned cart.
 * Recompute prices from our catalogue instead of trusting localStorage. */
export function readCart(): CartItem[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.slice(0, 100).flatMap((item) => {
      const plan = PRICING_PLANS.find(p => p.id === item?.plan?.id || item?.id === `${p.serverCode}-12m`);
      if (!plan) return [];
      const currency = Object.prototype.hasOwnProperty.call(CURRENCIES, item.currency || '') ? item.currency : 'USD';
      const quantity = Math.min(20, Math.max(1, Number(item.quantity) || 1));
      return Array.from({ length: quantity }, (_, n) => ({
        id: item.plan ? String(item.id) : `${item.id}-${n}`,
        plan,
        months: '12' as const,
        price: plan.prices['12'][currency as "USD" | "SAR" | "EGP" | "AED" | "KWD"] as number,
        currency,
      }));
    });
  } catch { return []; }
}

export function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart-updated'));
  } catch { /* Private browsing/storage quota must not disable checkout. */ }
}
