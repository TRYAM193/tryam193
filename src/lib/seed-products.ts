// scripts/seed-products.js
import { db } from "../firebase"; // Ensure this points to your firebase config
import { doc, setDoc, writeBatch, collection } from "firebase/firestore";
import { INITIAL_PRODUCTS } from '../data/initialProducts'

// --- 2. UPLOAD FUNCTION ---
export const seedProducts = async () => {
  console.log("🚀 Starting Product Seed...");
  const batch = writeBatch(db);

  INITIAL_PRODUCTS.forEach((product) => {
    const docRef = doc(db, "base_products", product.id);
    batch.set(docRef, product);
  });

  try {
    await batch.commit();
    console.log("✅ Successfully seeded 8 products with Vendor Maps!");
    alert("Database Updated Successfully!");
  } catch (error) {
    console.error("❌ Error seeding products:", error);
    alert("Error Updating Database");
  }
};

