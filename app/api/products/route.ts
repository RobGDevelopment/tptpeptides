import { NextResponse } from 'next/server';
import { getStorefrontProducts } from '../../../lib/firebase/products.server';

export const revalidate = 60;

export async function GET() {
  const products = await getStorefrontProducts();
  return NextResponse.json({ products });
}
