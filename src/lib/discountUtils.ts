// src/lib/discountUtils.ts

export function getVolumeDiscount(totalQuantity: number) {
  // Tier 2: 10+ items = 10% discount
  if (totalQuantity >= 10) {
    return {
      discountPct: 0.10,
      discountLabel: "10%",
      nextTierQty: null,
      itemsNeeded: 0,
      progress: 100,
      message: "🔥 Max 10% Bulk Discount Unlocked!",
      color: "text-green-500",
      bgProgress: "bg-green-500"
    };
  }
  
  // Tier 1: 5-9 items = 5% discount
  if (totalQuantity >= 5) {
    return {
      discountPct: 0.05,
      discountLabel: "5%",
      nextTierQty: 10,
      itemsNeeded: 10 - totalQuantity,
      progress: (totalQuantity / 10) * 100,
      message: `🎉 5% Unlocked! Add ${10 - totalQuantity} more for 10% off.`,
      color: "text-orange-500",
      bgProgress: "bg-orange-500"
    };
  }

  // Base Tier: 1-4 items = 0% discount
  return {
    discountPct: 0,
    discountLabel: "0%",
    nextTierQty: 5,
    itemsNeeded: 5 - totalQuantity,
    progress: (totalQuantity / 5) * 100,
    message: `Add ${5 - totalQuantity} more items to unlock a 5% discount!`,
    color: "text-slate-400",
    bgProgress: "bg-blue-500"
  };
}

export function calculateCartTotalsAndAllocations(cartItems: any[], hasActiveReward: boolean = false) {
    let totalQuantity = 0;
    let mrpSubtotal = 0;

    // 1. Calculate Base Totals
    cartItems.forEach(item => {
        const qty = item.quantity || 1;
        // Handle both simple number prices and region-based price objects
        const price = typeof item.price === 'object' ? (item.price.IN || 0) : (item.price || 0); 
        totalQuantity += qty;
        mrpSubtotal += (price * qty);
    });

    // 2. Determine Macro Discounts
    const { discountPct } = getVolumeDiscount(totalQuantity);
    const totalBulkDiscount = mrpSubtotal * discountPct;

    // Safety check: Don't apply a ₹100 reward if the cart total is somehow less than ₹100
    const subtotalAfterBulk = mrpSubtotal - totalBulkDiscount;
    const totalReferralDiscount = hasActiveReward ? Math.min(100, subtotalAfterBulk) : 0;

    const finalGrandTotal = subtotalAfterBulk - totalReferralDiscount;

    // 3. The Allocator (Proportional Distribution)
    const allocatedItems = cartItems.map(item => {
        const qty = item.quantity || 1;
        const price = typeof item.price === 'object' ? (item.price.IN || 0) : (item.price || 0);
        const lineTotal = price * qty;

        // Determine this item's "weight" (percentage of the total cart cost)
        const weight = mrpSubtotal > 0 ? (lineTotal / mrpSubtotal) : 0;

        // Allocate discounts proportionally based on weight
        const allocatedBulk = totalBulkDiscount * weight;
        const allocatedReferral = totalReferralDiscount * weight;
        const finalLinePrice = lineTotal - allocatedBulk - allocatedReferral;

        // Return the item with its immutable financial ledger attached
        return {
            ...item,
            ledger: {
                basePrice: price,
                lineTotal: lineTotal,
                allocatedBulkDiscount: allocatedBulk,
                allocatedReferralDiscount: allocatedReferral,
                finalPaidPrice: finalLinePrice
            }
        };
    });

    return {
        // Use 'summary' for displaying Cart and Checkout Totals
        summary: {
            totalItems: totalQuantity,
            mrpSubtotal: mrpSubtotal,
            totalBulkDiscount: totalBulkDiscount,
            totalReferralDiscount: totalReferralDiscount,
            finalGrandTotal: finalGrandTotal,
            referralDiscountApplied: hasActiveReward && totalReferralDiscount > 0
        },
        // Use 'allocatedItems' to send to the Backend so it can split the order safely
        allocatedItems: allocatedItems 
    };
}