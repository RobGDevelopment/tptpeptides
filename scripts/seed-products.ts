/**
 * Seeds the Firestore `products` collection from catalog.json (all variants).
 *
 * Usage: npm run seed:products
 */
import { config } from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getCatalogSeedProducts } from '../lib/data/seedCatalog';

config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    'Missing Admin SDK credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local'
  );
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const db = getFirestore();

async function seedProducts() {
  const products = getCatalogSeedProducts();
  console.log(`Seeding ${products.length} product variants from catalog.json...`);

  const batchSize = 400;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = db.batch();
    const chunk = products.slice(i, i + batchSize);

    for (const product of chunk) {
      batch.set(
        db.collection('products').doc(product.id),
        {
          ...product.data,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(`  ✓ Committed batch ${Math.floor(i / batchSize) + 1}`);
  }

  console.log(`Done — ${products.length} variants seeded.`);
}

seedProducts().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
