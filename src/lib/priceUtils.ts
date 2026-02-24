// src/lib/priceUtils.ts

// A list of realistic e-commerce discount percentages
const DISCOUNT_TIERS = [65, 45, 84, 56, 49, 25, 30, 33, 40, 50, 60];

/**
 * Generates a consistent "Random" discount based on the product ID.
 * This ensures the same product always gets the same discount,
 * but different products get different discounts.
 */
export const getDiscountForProduct = (productId: string): number => {
  if (!productId) return 20; // Default fallback

  // Simple hash function: sums the character codes of the ID
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = productId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use the hash to pick a specific index from our tiers
  const index = Math.abs(hash) % DISCOUNT_TIERS.length;
  
  return DISCOUNT_TIERS[index];
};

/**
 * Calculates the fake "Original Price" (MRP) based on the selling price and discount.
 */
export const calculatePriceDetails = (sellingPrice: number, productId: string) => {
  const discountPercent = getDiscountForProduct(productId);
  
  // Formula: MRP = Selling / (1 - discount%)
  // Example: 549 / (1 - 0.20) = 686.25
  const originalPrice = sellingPrice / (1 - (discountPercent / 100));

  return {
    sellingPrice,
    originalPrice: Math.ceil(originalPrice), // Round up to look nice (e.g. 687)
    discountPercent,
    savings: Math.ceil(originalPrice - sellingPrice)
  };
};