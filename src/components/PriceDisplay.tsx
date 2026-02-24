// src/components/PriceDisplay.tsx
import { calculatePriceDetails } from "@/lib/priceUtils";
import { cn } from "@/lib/utils";
import { ArrowDown } from "lucide-react";

interface PriceDisplayProps {
    price: number;
    currency: string;
    productId: string;
    size?: "sm" | "md" | "lg" | "xl";
    align?: "left" | "center" | "right";
    showSaveBadge?: boolean;
}

export function PriceDisplay({
    price,
    currency,
    productId,
    size = "md",
    align = "left",
    showSaveBadge = false
}: PriceDisplayProps) {

    // 1. Get the math
    const { originalPrice, discountPercent, savings } = calculatePriceDetails(price, productId);

    // 2. Size Configs
    const sizeClasses = {
        sm: { symbol: "text-xs", whole: "text-sm", fraction: "text-xs", old: "text-xs" },
        md: { symbol: "text-sm", whole: "text-xl", fraction: "text-sm", old: "text-sm" },
        lg: { symbol: "text-base", whole: "text-3xl", fraction: "text-lg", old: "text-base" },
        xl: { symbol: "text-lg", whole: "text-5xl", fraction: "text-xl", old: "text-lg" }
    };

    const s = sizeClasses[size];

    return (
        <div className={cn("flex flex-col", align === "center" && "items-center", align === "right" && "items-end")}>

            {/* Top Line: Discount Badge (Amazon Style) */}
            <div className="flex items-center gap-4 mb-1">
                <span className="text-green-500 font-normal text-lg sm:text-xl">
                    <ArrowDown className="w-4 h-4 inline mr-1" /> -{discountPercent}%
                </span>

                {/* The Big Price */}
                <div className="flex items-baseline font-bold text-white relative top-[2px]">
                    <span className={cn("align-top font-normal", s.symbol)}>{currency}</span>
                    <span className={s.whole}>{Math.floor(price)}</span>
                    <span className={s.fraction}>{(price % 1).toFixed(2).substring(1)}</span>
                </div>
            </div>

            {/* Bottom Line: MRP and Savings */}
            <div className="flex items-center gap-4 text-slate-400 leading-none">
                <span className={cn("line-through decoration-slate-500", s.old)}>
                    MRP: {currency}{originalPrice}
                </span>
                {showSaveBadge && (
                    <span className="text-xs font-medium text-green-400 flex items-center bg-green-400/10 px-1.5 py-0.5 rounded border border-green-400/20">
                        Save {currency}{savings}
                    </span>
                )}
            </div>
        </div>
    );
}