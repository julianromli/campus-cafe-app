import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type CartState = Record<string, number>;

type CartContextValue = {
  add: (menuItemId: Id<"menuItems">, amount?: number) => void;
  cart: CartState;
  clear: () => void;
  decrement: (menuItemId: Id<"menuItems">) => void;
  increment: (menuItemId: Id<"menuItems">) => void;
  setQty: (menuItemId: Id<"menuItems">, qty: number) => void;
  tableId: Id<"tables">;
};

const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = {
  children: ReactNode;
  tableId: Id<"tables">;
};

export function CartProvider({ children, tableId }: CartProviderProps) {
  const [cart, setCart] = useState<CartState>({});

  const add = useCallback((menuItemId: Id<"menuItems">, amount = 1) => {
    const key = menuItemId;
    setCart((previous) => ({
      ...previous,
      [key]: (previous[key] ?? 0) + amount,
    }));
  }, []);

  const increment = useCallback((menuItemId: Id<"menuItems">) => {
    add(menuItemId, 1);
  }, [add]);

  const decrement = useCallback((menuItemId: Id<"menuItems">) => {
    const key = menuItemId;
    setCart((previous) => {
      const nextQty = (previous[key] ?? 0) - 1;
      if (nextQty <= 0) {
        const { [key]: _, ...rest } = previous;
        return rest;
      }

      return { ...previous, [key]: nextQty };
    });
  }, []);

  const setQty = useCallback((menuItemId: Id<"menuItems">, qty: number) => {
    const key = menuItemId;
    setCart((previous) => {
      if (qty <= 0) {
        const { [key]: _, ...rest } = previous;
        return rest;
      }

      return { ...previous, [key]: qty };
    });
  }, []);

  const clear = useCallback(() => {
    setCart({});
  }, []);

  const value = useMemo(
    () => ({
      add,
      cart,
      clear,
      decrement,
      increment,
      setQty,
      tableId,
    }),
    [add, cart, clear, decrement, increment, setQty, tableId],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
