// src/components/ProductCard.tsx
import { BaseProduct } from "@/hooks/use-base-products";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useNavigate } from "react-router";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PriceDisplay } from "./PriceDisplay";

interface ProductCardProps {
  product: BaseProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const [region, setRegion] = useState("IN");

  const handleViewDetails = () => {
    navigate(`/product/${product.id}`, { state: { region } });
  };

  const currencySymbols: Record<string, string> = {
    IN: "₹",
    US: "$",
    GB: "£",
    EU: "€",
    CA: "C$"
  };

  // useEffect(() => {
  //     // Only fetch if we haven't locked it yet
  //     const fetchLocation = async () => {
  //       try {
  //         const res = await fetch('https://ipapi.co/json/');
  //         const data = await res.json();

  //         // Logic: If user is in India, Force India.
  //         // You can add 'OR data.country_code === "US"' if you want to lock US users too.
  //         if (data.country_code === 'US') setRegion('US');
  //         else if (data.country_code === 'CA') setRegion('CA');
  //         else if (data.country_code === 'GB') setRegion('GB');

  //       } catch (error) {
  //         console.warn("Could not fetch IP location, defaulting to open selection.");
  //       }
  //     };
  //       fetchLocation();
  //   }, []);


  const symbol = currencySymbols[region] || "₹";
  const priceValue = product.price?.[region as keyof typeof product.price] || 0;
  let variants
  if (region === 'IN') variants = product.variants.qikink
  else if (region == 'US' || region === 'CA') variants = product.variants.printify
  else variants = product.variants.gelato

  // Use uploaded image or first mockup
  const displayImage = product.image || product.mockups?.front || "https://placehold.co/400x500?text=No+Image";

  return (
    <Card
      className="group cursor-pointer overflow-hidden border border-white/5 bg-slate-800/40 backdrop-blur-md shadow-lg hover:shadow-orange-500/10 hover:border-orange-500/50 transition-all duration-500 h-full flex flex-col"
      onClick={handleViewDetails}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] bg-slate-700/50 overflow-hidden">
        <img
          src={displayImage}
          alt={product.title}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
          loading="lazy"
        />

        {/* Hover Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300" />

        {/* Floating Action Badge (Hidden on very small mobile screens to save space) */}
        <div className="hidden sm:flex absolute inset-x-0 bottom-4 justify-center translate-y-10 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100 px-4">
          <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-xl flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-orange-400" /> Customize
          </span>
        </div>
      </div>

      <CardContent className="pt-3 sm:pt-5 px-3 sm:px-4 pb-2 space-y-1 flex-grow">
        {/* Title: Smaller on mobile to prevent wrapping issues in 2-col layout */}
        <h3 className="font-bold text-sm sm:text-base md:text-lg leading-tight truncate text-slate-100 group-hover:text-orange-400 transition-colors">
          {product.title}
        </h3>

        <p className="text-[10px] sm:text-xs md:text-sm text-slate-400 capitalize truncate flex items-center gap-2">
          {product.category || "Apparel"}
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          {variants?.colors?.length || 0} Colors
        </p>
      </CardContent>

      <CardFooter className="px-3 sm:px-4 pb-3 sm:pb-5 pt-0 flex justify-between items-end mt-auto">
        {/* Pass 'align="left"' and 'size="md"' */}
        <PriceDisplay
          price={priceValue}
          currency={symbol}
          productId={product.id}
          size="md"
        />

        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-medium group-hover:text-slate-300 transition-colors mb-1">
          View &rarr;
        </span>
      </CardFooter>
    </Card>
  );
}