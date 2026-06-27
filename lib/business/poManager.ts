import { db } from "../firebase/firestore";
import { collection, addDoc } from "firebase/firestore";
import type { Product } from "../types";

/**
 * Generates an automated Purchase Order for your suppliers.
 * Triggers when your system identifies low stock.
 */
export const generatePurchaseOrder = async (orderData: {
  supplierId: string;
  items: Product[];
}) => {
  try {
    const poCol = collection(db, "purchaseOrders");
    const docRef = await addDoc(poCol, {
      ...orderData,
      status: "pending_supplier_review",
      generatedAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating PO:", error);
    throw error;
  }
};