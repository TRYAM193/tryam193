import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDocs } from "firebase/firestore";

export interface CartItem {
  id: string;
  title: string;
  productId: string;
  variant: {
    color: string;
    size: string;
  };
  thumbnail: string;
  price: number;
  currency: {
    code: string;
    symbol: string;
  };
  quantity: number;
  region: string;
  vendor: string;
  designData?: any;
}

interface CartContextType {
  items: CartItem[];
  savedItems: CartItem[]; // <--- NEW STATE
  addItem: (item: Omit<CartItem, "id">) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, delta: number) => Promise<void>;
  updateItemContent: (id: string, updates: Partial<CartItem>) => Promise<void>;

  // ✅ NEW ACTIONS
  saveForLater: (id: string) => Promise<void>;
  moveToCart: (id: string) => Promise<void>;
  removeSavedItem: (id: string) => Promise<void>;

  clearCart: () => Promise<void>; // ✅ This will now work
  cartTotal: number;
  cartCount: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [savedItems, setSavedItems] = useState<CartItem[]>([]); // <--- NEW STATE
  const [isLoading, setIsLoading] = useState(false);

  // 1. ACTIVE CART LISTENER
  useEffect(() => {
    if (!user || !user?.uid) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    const cartRef = collection(db, `users/${user.uid}/cart`);
    const unsubscribe = onSnapshot(cartRef, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as CartItem[];
      setItems(fetchedItems);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // 2. ✅ SAVED FOR LATER LISTENER
  useEffect(() => {
    if (!user?.uid) {
      setSavedItems([]);
      return;
    }
    const savedRef = collection(db, `users/${user.uid}/saved_items`);
    const unsubscribe = onSnapshot(savedRef, (snapshot) => {
      const fetchedSaved = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as CartItem[];
      setSavedItems(fetchedSaved);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // --- ACTIONS ---

  const addItem = async (newItem: Omit<CartItem, "id">) => {
    if (!user?.uid) {
      toast.error("Please sign in to save items.");
      return;
    }
    try {
      const newDocRef = doc(collection(db, `users/${user.uid}/cart`));
      console.log(newItem)
      await setDoc(newDocRef, newItem);
      toast.success("Added to cart");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add");
    }
  };

  const removeItem = async (id: string) => {
    if (!user?.uid) return;
    await deleteDoc(doc(db, `users/${user.uid}/cart`, id));
  };

  const updateQuantity = async (id: string, delta: number) => {
    if (!user?.uid) return;
    const item = items.find(i => i.id === id);
    if (!item || (item.quantity + delta) < 1) return;
    await updateDoc(doc(db, `users/${user.uid}/cart`, id), { quantity: item.quantity + delta });
  };

  const updateItemContent = async (id: string, updates: Partial<CartItem>) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/cart`, id), updates);
      toast.success("Cart updated");
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  // ✅ NEW: Move from Cart -> Saved
  const saveForLater = async (id: string) => {
    if (!user?.uid) return;
    const item = items.find(i => i.id === id);
    if (!item) return;

    try {
      // 1. Add to saved collection
      await setDoc(doc(db, `users/${user.uid}/saved_items`, id), item);
      // 2. Remove from active cart
      await deleteDoc(doc(db, `users/${user.uid}/cart`, id));
      toast.success("Saved for later");
    } catch (error) {
      console.error("Save error", error);
      toast.error("Failed to save item");
    }
  };

  // ✅ NEW: Move from Saved -> Cart
  const moveToCart = async (id: string) => {
    if (!user?.uid) return;
    const item = savedItems.find(i => i.id === id);
    if (!item) return;

    try {
      await setDoc(doc(db, `users/${user.uid}/cart`, id), item);
      await deleteDoc(doc(db, `users/${user.uid}/saved_items`, id));
      toast.success("Moved back to cart");
    } catch (error) {
      console.error("Move error", error);
    }
  };

  // ✅ NEW: Delete Saved Item
  const removeSavedItem = async (id: string) => {
    if (!user?.uid) return;
    await deleteDoc(doc(db, `users/${user.uid}/saved_items`, id));
  };

  const clearCart = async () => {
    if (!user?.uid) return;
    try {
      // 1. Get all documents in the cart collection
      const cartRef = collection(db, `users/${user.uid}/cart`);
      const snapshot = await getDocs(cartRef);

      // 2. Delete them one by one (in parallel)
      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      console.log("Cart cleared successfully from Firestore");
    } catch (error) {
      console.error("Failed to clear cart:", error);
    }
  };

  const cartTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, savedItems,
      addItem, removeItem, updateQuantity, updateItemContent,
      saveForLater, moveToCart, removeSavedItem,
      clearCart, cartTotal, cartCount, isLoading
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}