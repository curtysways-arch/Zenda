export interface PinchoCartItem {
    product: {
        id: string;
        nombre: string;
        precio: number;
        imagenUrl?: string | null;
        descripcion?: string | null;
    };
    quantity: number;
    notes?: string;
}

export interface PinchoCartState {
    items: PinchoCartItem[];
    deliveryType: 'RETIRO' | 'DOMICILIO';
    deliveryAddress: string;
    deliveryReference: string;
    lat?: number | null;
    lng?: number | null;
    couponCode?: string;
    couponDiscount?: number;
    observations?: string;
}

const STORAGE_KEY_PREFIX = 'pinchos_cart_state_';

export class PinchoCartService {
    public static getInitialState(): PinchoCartState {
        return {
            items: [],
            deliveryType: 'DOMICILIO',
            deliveryAddress: '',
            deliveryReference: '',
            lat: null,
            lng: null,
            couponCode: '',
            couponDiscount: 0,
            observations: ''
        };
    }

    public static loadCart(storeId: string): PinchoCartState {
        if (typeof window === 'undefined') return this.getInitialState();
        try {
            const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${storeId}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    ...this.getInitialState(),
                    ...parsed
                };
            }
        } catch (e) {
            console.error('[PinchoCartService] Error loading cart from localStorage:', e);
        }
        return this.getInitialState();
    }

    public static saveCart(storeId: string, state: PinchoCartState): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${storeId}`, JSON.stringify(state));
        } catch (e) {
            console.error('[PinchoCartService] Error saving cart to localStorage:', e);
        }
    }

    public static clearCart(storeId: string): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.removeItem(`${STORAGE_KEY_PREFIX}${storeId}`);
        } catch (e) {
            console.error('[PinchoCartService] Error clearing cart:', e);
        }
    }

    public static calculateTotals(items: PinchoCartItem[], shippingCost: number = 0, couponDiscount: number = 0) {
        const subtotal = items.reduce((acc, item) => acc + (item.product.precio * item.quantity), 0);
        const discountAmount = Math.min(subtotal, couponDiscount);
        const finalSubtotal = subtotal - discountAmount;
        const total = Math.max(0, finalSubtotal + shippingCost);

        return {
            subtotal,
            discountAmount,
            finalSubtotal,
            shippingCost,
            total,
            totalItemsCount: items.reduce((acc, item) => acc + item.quantity, 0)
        };
    }
}
