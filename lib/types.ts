export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  tag?: string;
  supplierId?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status?: string;
  createdAt?: { toDate: () => Date };
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: Product[];
  status: string;
  generatedAt?: { toDate: () => Date };
}
