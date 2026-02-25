// src/data/font.ts

export const FONTS: Record<string, { bold: boolean; italic: boolean }> = {
  "Roboto": { bold: true, italic: true },//
  "Open Sans": { bold: true, italic: true },//
  "Montserrat": { bold: true, italic: true },//
  "Lato": { bold: true, italic: true },//
  "Poppins": { bold: true, italic: true },//
  "Oswald": { bold: true, italic: false }, // Variable weight, usually no italic in standard set
  "Raleway": { bold: true, italic: true },//
  "Playfair Display": { bold: true, italic: true },//
  "Merriweather": { bold: true, italic: true },//
  "Roboto Slab": { bold: true, italic: false },//
  "Lora": { bold: true, italic: true },//
  "Abril Fatface": { bold: false, italic: false },//
  "Arvo": { bold: true, italic: false },//
  "Dancing Script": { bold: true, italic: false }, // Bold works for headers
  "Pacifico": { bold: false, italic: false },//
  "Great Vibes": { bold: false, italic: false },
  "Satisfy": { bold: false, italic: false },
  "Yellowtail": { bold: false, italic: false },
  "Caveat": { bold: true, italic: false },
  "Shadows Into Light": { bold: false, italic: false },
  "Indie Flower": { bold: false, italic: false },
  "Permanent Marker": { bold: false, italic: false },
  "Bangers": { bold: false, italic: false },
  "Anton": { bold: false, italic: false },
  "Lobster": { bold: false, italic: false },
  "Righteous": { bold: false, italic: false },
  "Fredoka": { bold: true, italic: false },
  "Chewy": { bold: false, italic: false },
  "Amatic SC": { bold: true, italic: false },
  "Bebas Neue": { bold: false, italic: false },
  "Reggae One": { bold: false, italic: false }//
};

// Helper List for Dropdowns
export const AVAILABLE_FONTS = Object.keys(FONTS);