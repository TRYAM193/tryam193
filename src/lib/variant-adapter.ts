// Define or import your DB types here
// For demonstration, I'm defining a flexible interface based on your description
interface DatabaseVariant {
  id: string;
  price: number;
  inventory: number;
  // The specific field you mentioned
  qikink?: {
    price?: number;
    inventory?: number;
    sku?: string;
    active: boolean;
  };
  // Potentially other providers like Printful, Gelato, etc.
  printful?: {
    price?: number;
    inventory?: number;
    id?: string;
  };
}

export type Region = "IN" | "GLOBAL"; // Add more regions as needed

interface AdaptedVariant {
  id: string;
  price: number;
  inventory: number;
  source: "qikink" | "default" | "printful";
}

/**
 * Adapter to normalize variant data based on the user's region.
 * It prioritizes region-specific providers (like Qikink for India)
 * and falls back to the default DB values if necessary.
 */
export function adaptVariantForRegion(
  variants: DatabaseVariant, 
  region: Region
): AdaptedVariant {
  
  // Logic for India Region (Qikink priority)
  if (region === "IN" && variants.qikink?.active) {
    return {
      id: variants.id,
      // Use Qikink price/inventory if available, otherwise fallback to base
      price: variants.qikink.price ?? variants.price,
      inventory: variants.qikink.inventory ?? variants.inventory,
      source: "qikink",
    };
  }

  // Logic for Global/Other Regions (Default or Printful priority)
  // You can extend this else-if block for other providers
  
  // Default fallback (Standard DB fields)
  return {
    id: variants.id,
    price: variants.price,
    inventory: variants.inventory,
    source: "default",
  };
}

/**
 * Helper to process a list of variants
 */
export function adaptVariantsForRegion(
  variants: DatabaseVariant[], 
  region: Region
): AdaptedVariant[] {
  return variants.map((v) => adaptVariantForRegion(v, region));
}