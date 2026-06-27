import { getFirestore, collection, getDocs, doc, addDoc, updateDoc } from "firebase/firestore";
import { app } from "./firebaseConfig";
import type { CartItem } from "../types";

// Initialize Firestore Database
export const db = getFirestore(app);

export interface CreateOrderData {
  userId: string;
  items: CartItem[];
  total: number;
  timestamp?: Date;
}

/**
 * Fetches all products currently in stock.
 * This will be the main call for your storefront grid.
 */
export const getInventory = async () => {
  const productsCol = collection(db, "products");
  const productSnapshot = await getDocs(productsCol);
  return productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Records a new order in the database.
 */
export const createOrder = async (orderData: CreateOrderData) => {
  try {
    const ordersCol = collection(db, "orders");
    const docRef = await addDoc(ordersCol, {
      ...orderData,
      createdAt: new Date(),
      status: "pending"
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};

/**
 * Updates stock levels after a successful purchase.
 */
export const updateProductStock = async (productId: string, newQuantity: number) => {
  const productRef = doc(db, "products", productId);
  await updateDoc(productRef, { stock: newQuantity });
};