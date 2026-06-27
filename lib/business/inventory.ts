import { db } from "../firebase/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";

/**
 * Checks for products that have fallen below the reorder threshold.
 * Useful for automated daily reporting.
 */
export const getLowStockProducts = async (threshold: number = 10) => {
  const productsCol = collection(db, "products");
  const q = query(productsCol, where("stock", "<=", threshold));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};