// src/data/initialProducts.ts
export const INITIAL_PRODUCTS = [
  // =========================================
  // 👕 MEN'S COLLECTION
  // =========================================
  {
    id: "men-classic-tee",
    title: "Men's Classic Premium Tee",
    category: "Men",
    image: 'https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/catalog%2Fmen-classic-tee?alt=media&token=eaffe62d-ccfa-4ea0-a9a9-4fb20312d00e',
    model3d: "/assets/t-shirt.glb",
    description: "The T-shirt you'll reach for every single day. Crafted from soft premium cotton that feels light on your skin and strong enough for everyday life. Whether you're heading out with friends, chasing your goals, or just relaxing, this tee becomes a part of your story. Simple, timeless, and made for the person you are becoming.",

    print_areas: {
      front: { width: 4200, height: 4800 },
      back: { width: 4200, height: 4800 }
    },

    canvas_size: {
      width: 420,
      height: 480
    },

    print_area_2d: {
      front: { top: 29, left: 34.5, width: 31.5, height: 36 },
      back: { top: 29, left: 34.5, width: 31.5, height: 36 }
    },

    variants: {
      qikink: {
        colors: [
          'Black',
          'White',
          'Navy Blue',
          'Grey Melange',
          'Royal Blue',
          'Red',
          'Maroon',
          'Bottle Green',
          'Charcoal Melange'
        ],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        sizeChart: {
          XS: [36, 25],
          S: [38, 26],
          M: [40, 27],
          L: [42, 28],
          XL: [44, 29],
          XXL: [46, 30]          // (Chest, Length)
        }
      },
      printify: {
        colors: [
          'Black',
          'White',
          'Navy',
          'Athletic Heather',  // The standard Light Grey
          'Dark Grey Heather', // The standard Dark Grey
          'True Royal',
          'Red',
          'Maroon',
          'Military Green',    // Best "Army" color
          'Kelly',             // Standard Green
          'Team Purple',
          'Orange',
          'Gold',              // Standard Yellow/Gold
          'Pink',
          'Baby Blue',         // Standard Light Blue
          'Turquoise',
          'Aqua',
          'Natural',           // Very popular "Beige" alternative
          'Soft Pink',
          'Mustard',           // Often listed as "Yellow" or "Gold" - check your mapping
          'Cardinal',
          'Black Heather',     // Very popular
          'Heather Mauve',     // #1 Selling Heather in US
          'Heather Navy',
          'Deep Heather',      // A nice mid-grey
          'Heather True Royal',
          'Heather Red',
          'Heather Columbia Blue'
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        sizeChart: {
          S: [32, 27],
          M: [40, 29],
          L: [44, 30],
          XL: [48, 30]
        }
      },
      gelato: {
        colors: ['White', 'Black', 'Natural', 'Light Blue', 'Military Green', 'Irish Green', 'Royal', 'Red', 'Maroon', 'Navy'],
        sizes: ['S', 'M', 'L', 'XL'],
        sizeChart: {
          S: [36, 28],
          M: [40, 29],
          L: [44, 30],
          XL: [48, 31]
        }
      }
    },

    price: {
      IN: 549,
      US: 24.99,
      GB: 19.99,
      EU: 20.99,
      CA: 34.99
    },

    mockups: {
      front: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Ftshirt%2Fmen-classic-tee-front.png?alt=media&token=f9c2b0eb-2936-4e8d-9e40-21d459c58226",
      back: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Ftshirt%2Fmen-classic-tee-back.png?alt=media&token=1aff134c-b429-4b20-8223-f5e9c4b655d5"
    },


    vendor_maps: {
      printify: {
        blueprint_id: "12",
        print_provider_id: "29",
        color_map: { "White": 101, "Black": 102, "Navy": 103, "Red": 104, "Royal": 105, "Sport Grey": 110 }
      },
      qikink: {
        // Base SKU for "Male Round Neck Half Sleeve"
        product_id: "MRnHs",
        // Qikink Color Codes (Bk=Black, Wh=White, Nb=Navy Blue, Rd=Red, Rb=Royal Blue, Gm=Grey Melange)
        color_map: {
          "Black": "Bk", "White": "Wh", "Navy Blue": "Nb", "Grey Melange": "Gm", "Royal Blue": "Rb",
          "Red": "Rd", "Maroon": "Mn", "Bottle Green": "Bt", "Charcoal Melange": "Ch"
        }
      },
      gelato: {
        product_uid: "apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_classic_gsi_{size}_gco_{color}_gpr_{print_code}_gildan_64000",
        color_map: {
          "Black": "black", "White": "white", "Navy Blue": "navy", "Grey Melange": "sport-grey",
          "Royal Blue": "royal", "Red": "red", "Maroon": "maroon", "Bottle Green": "irish-green", "Charcoal Melange": "dark-heather"
        }
      }
    }
  },

  {
    "id": "mens-polo-tee",
    "title": "Men's Classic Polo T-Shirt",
    "category": "Men",
    "image": "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/catalog%2Fmens-polo-tee?alt=media&token=05f4d8cd-36b8-479b-b5cc-297d3776509f",
    "model3d": null,
    "description": "A refined classic that blends comfort with style. This polo tee is crafted from breathable premium cotton and finished with a structured collar for a clean, polished look. Perfect for workdays, casual outings, or everyday wear.",

    "print_areas": {
      "left_chest": { "width": 1200, "height": 1200 },
      "right_chest": { "width": 1200, "height": 1200 },
      "back": { "width": 4200, "height": 5400 }
    },

    "canvas_size": {
      "left_chest": { "width": 240, "height": 240 },
      "right_chest": { "width": 240, "height": 240 },
      "back": { "width": 420, "height": 540 }
    },

    "price": {
      "IN": 699,
      "US": 29.99,
      "GB": 24.99,
      "EU": 26.99,
      "CA": 39.99
    },

    "mockups": {
      "front": "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Fmens-polo%2Fmens-polo-front.png?alt=media&token=161c63c1-2ce3-494e-b5f8-a5a88ca5dea0",
      "back": "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Fmens-polo%2Fmens-polo-back.png?alt=media&token=5905e36b-5fe6-4b59-ae84-871c6d6c1c6b"
    },

    "print_area_2d": {
      "left_chest": { "top": 28, "left": 27, "width": 20, "height": 20 },
      "right_chest": { "top": 28, "left": 56, "width": 20, "height": 20 },
      back: { top: 31, left: 32.5, width: 37.8, height: 48.6 }
    },

    "variants": {
      "qikink": {
        "colors": [
          "Black",
          "White",
          "Navy Blue",
          "Grey Melange",
          "Maroon",
          "Royal Blue",
          "Mustard Yellow"
        ],
        "sizes": ["S", "M", "L", "XL", "XXL", "3XL"],
        "sizeChart": {
          "S": [38, 26],
          "M": [40, 27],
          "L": [42, 28],
          "XL": [44, 29],
          "XXL": [46, 30],
          "3XL": [48, 31]
        }
      },
    },

    vendor_maps: {
      qikink: {
        // Base SKU for "Male Round Neck Half Sleeve"
        product_id: "MPHs",
        // Qikink Color Codes (Bk=Black, Wh=White, Nb=Navy Blue, Rd=Red, Rb=Royal Blue, Gm=Grey Melange)
        color_map: {
          "Black": "Bk", "White": "Wh", "Navy Blue": "Nb", "Grey Melange": "Gm", "Royal Blue": "Rb",
          "Maroon": "Mn", "Mustard Yellow": "MYl"
        }
      },
      printify: {
        blueprint_id_pockets: 1984,
        print_provider_id_pockets: 217,

        blueprint_id_back: 1402,
        print_provider_id_back: 39
      },
    }
  },

  {
    id: "unisex-oversized-tee",
    title: "Unisex Streetwear Oversized Tee",
    category: "Unisex",
    image: 'https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/catalog%2Fmen-oversized-tee?alt=media&token=3dcae3b1-042e-417b-8557-90fd177123ae',
    image1: 'https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/catalog%2Fwomen-oversized-tee?alt=media&token=05ed8b7a-fbab-4394-a704-9f59ed435801',
    model3d: null,
    description: "Built for those who move differently. The oversized streetwear tee gives you freedom, comfort, and confidence in every step. With its relaxed drop-shoulder fit and premium heavyweight fabric, it feels as bold as your personality. Whether you're creating art, exploring the city, or just expressing yourself — this tee becomes your statement.",

    print_areas: {
      front: { width: 4800, height: 6000 },
      back: { width: 4800, height: 6000 }
    },

    mockups: {
      front: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Foversized-tshirt%2Fmen-oversized-front.png?alt=media&token=5dc44a83-c25e-45f0-b600-d0d6e3f63862",
      back: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Foversized-tshirt%2Fmen-oversized-back.png?alt=media&token=50554471-8000-480f-b9d1-fd7f959f3de1"
    },

    canvas_size: {
      width: 480,
      height: 600
    },

    price: {
      IN: 699,
      US: 33.99,
      GB: 30.99,
      EU: 24.99,
      CA: 51.99
    },

    variants: {
      qikink: {
        colors: ['Black', 'White'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        sizeChart: {
          XS: [40, 27, 18],
          S: [42, 28, 19],
          M: [44, 29, 20],
          L: [46, 30, 21],
          XL: [48, 31, 22],
          XXL: [50, 32, 23]          // (Chest, Length, Shoulder)
        }
      },
      printify: {
        colors: [
          "Black",
          "White",
          "Navy",
          "Dark Grey",
          "Athletic Heather",
          "Natural"
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        sizeChart: {
          S: [40, 27.25],
          M: [42, 27.25],
          L: [46, 28.75],
          XL: [50, 29.75]
        }
      },
      gelato: {
        colors: ['White', 'Black'],
        sizes: ['S', 'M', 'L', 'XL'],
        sizeChart: {
          S: [42.5, 28.7],
          M: [44.9, 29.5],
          L: [47.2, 30.3],
          XL: [49.6, 31.1]
        }
      }
    },

    print_area_2d: {
      front: { top: 26, left: 32.5, width: 36, height: 45 },
      back: { top: 29, left: 32.5, width: 36, height: 45 }
    },

    vendor_maps: {
      printify: {
        blueprint_id: "1382",
        print_provider_id: "29",
        color_map: { "White": 101, "Black": 102, "Beige": 15 }
      },
      qikink: {
        // Base SKU for "Unisex Classic Oversized Tee"
        product_id: "UOsMRnHs",
        color_map: { "White": "Wh", "Black": "Bk" }
      },
      gelato: {
        product_uid: "apparel_product_gca_t-shirt_gsc_oversized_gcu_unisex_gqa_organic_gsi_{size}_gco_{color}_gpr_{print_code}_sols_03996",
        color_map: { "White": "white", "Black": "black" }
      }
    }
  },

  {
    id: "unisex-hoodie",
    title: "Unisex Essential Hoodie",
    category: "Unisex",
    image: 'https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/catalog%2Fmen-hoodie?alt=media&token=eb24627e-f16e-4c09-b2a4-417c86fb2139',
    image1: 'https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/catalog%2Fwomen-hoodie?alt=media&token=788e59c3-a0d8-489c-8603-c731023a2f10',
    model3d: null,
    description: "More than just a hoodie — it's comfort you can carry everywhere. Warm, soft, and built for everyday adventures, this hoodie wraps you in a feeling of calm and confidence. Perfect for chilly mornings, late night drives, or quiet moments with music. Once you wear it, it becomes the hoodie you never want to take off.",

    print_areas: {
      front: { width: 3000, height: 3600 },
      back: { width: 4200, height: 5100 },
    },

    mockups: {
      front: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Fhoodie%2Fmen-hoodie-front.png?alt=media&token=e30603ad-d2bd-4c7c-bc7f-8693b056eec6",
      back: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Fhoodie%2Fmen-hoodie-back.png?alt=media&token=5ab85d3c-863e-4870-9909-7d3941955529"
    },

    canvas_size: {
      front: {
        width: 300,
        height: 360
      },
      back: {
        width: 420,
        height: 510
      }
    },

    price: {
      IN: 949,
      US: 39.9,
      GB: 29.9,
      EU: 55.9,
      CA: 59.9
    },

    variants: {
      qikink: {
        colors: ['Black', 'White', 'Navy Blue', 'Grey Melange', 'Red'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
        sizeChart: {
          XS: [38, 25],
          S: [40, 26],
          M: [42, 27],
          L: [44, 28],
          XL: [46, 29],
          XXL: [48, 30],
          '3XL': [50, 31]          // (Chest, Length, Shoulder)
        }
      },
      printify: {
        colors: [
          "Black",
          "White",
          "Navy",
          "Sport Grey",
          "Dark Heather",
          "Charcoal",
          "Royal",
          "Red",
          "Maroon",
          "Forest Green",
          "Military Green"
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        sizeChart: {
          S: [40, 27.17],
          M: [44, 27.95],
          L: [48, 29.13],
          XL: [52, 29.92]
        }
      },
      gelato: {
        colors: ['White', 'Black', 'Light Blue', 'Gold', 'Military Green', 'Irish Green', 'Royal', 'Red', 'Maroon', 'Forest Green', 'Navy'],
        sizes: ['S', 'M', 'L', 'XL'],
        sizeChart: {
          S: [36, 28],
          M: [40, 29],
          L: [44, 30],
          XL: [48, 31]
        }
      }
    },

    print_area_2d: {
      front: { top: 28, left: 36.5, width: 27, height: 32.4 },
      back: { top: 29, left: 32, width: 37.8, height: 45.9 }
    },

    options: {
      colors: ["Black", "White", "Navy"],
      sizes: ["S", "M", "L", "XL", "2XL"]
    },

    vendor_maps: {
      printify: {
        blueprint_id: "77",
        print_provider_id: "29",
        color_map: { "Black": 102, "White": 101, "Navy": 103 }
      },
      qikink: {
        // Base SKU for "Unisex Hoodie"
        product_id: "UHd",
        color_map: { "Black": "Bk", "White": "Wh", "Navy Blue": "Nb", "Grey Melange": "Gm", "Red": "Rd" }
      },
      gelato: {
        product_uid: "apparel_product_gca_hoodie_gsc_pullover_gcu_unisex_gqa_classic_gsi_{size}_gco_{color}_gpr_{print_code}_gildan_18500",
        color_map: { "Black": "black", "White": "white", "Navy Blue": "navy", "Grey Melange": "sport-grey", "Red": "red" }
      }
    }
  },

  // =========================================
  // 👚 WOMEN'S COLLECTION
  // =========================================
  {
    id: "women-classic-tee",
    title: "Women's Fitted Premium Tee",
    category: "Women",
    image: 'https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/catalog%2Fwomen-classic-tee?alt=media&token=ec5f29b8-03fc-4879-80f9-608b99adf197',
    model3d: "assets/t-shirt.glb",
    description: "Designed to celebrate confidence and comfort. This fitted tee gently follows your natural shape while staying soft and breathable all day long. Whether you're dressing up your day or keeping it simple, it adds a touch of effortless style to every moment.",

    print_areas: {
      front: { width: 4200, height: 4350 },
      back: { width: 3900, height: 4950 }
    },

    mockups: {
      front: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Ftshirt%2Fwomen-classic-tee-front.png?alt=media&token=b89b1e95-6b9b-4a68-89c1-1fbc63eb4169",
      back: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Ftshirt%2Fwomen-classic-tee-back.png?alt=media&token=30a433cd-053f-4c6e-bba7-64394cfd03d2"
    },

    canvas_size: {
      front: {
        width: 420,
        height: 435
      },
      back: {
        width: 390,
        height: 495
      }
    },

    price: {
      IN: 549,
      US: 24.99,
      GB: 19.99,
      EU: 20.99,
      CA: 34.99
    },

    variants: {
      qikink: {
        colors: ['Black', 'Bottle Green', 'Charcoal Melange', 'Grey Melange',
          'Maroon',
          'Navy Blue',
          'Red', 'Royal Blue', 'White',
        ],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        sizeChart: {
          XS: [32, 23],
          S: [34, 24],
          M: [36, 25],
          L: [38, 26],
          XL: [40, 27],
          XXL: [42, 28]          // (Chest, Length)
        }
      },
      printify: {
        colors: [
          "Black",
          "White",
          "Navy",
          "Sport Grey",
          "Dark Heather",
          "Charcoal",
          "Royal",
          "Red",
          "Forest Green"
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        sizeChart: {
          S: [18, 27],
          M: [20, 29],
          L: [22, 30],
          XL: [24, 30]
        }
      },
      gelato: {
        colors: ['White', 'Black', 'Natural', 'Light Blue', 'Military Green', 'Irish Green', 'Royal', 'Red', 'Maroon', 'Navy'],
        sizes: ['S', 'M', 'L', 'XL'],
        sizeChart: {
          S: [36, 28],
          M: [40, 29],
          L: [44, 30],
          XL: [48, 31]
        }
      }
    },

    print_area_2d: {
      front: { top: 28, left: 27.5, width: 35.7, height: 36.975 },
      back: { top: 21, left: 28.5, width: 35.1, height: 44.55 }
    },

    vendor_maps: {
      printify: {
        blueprint_id: "36",
        print_provider_id: "29",
        variant_map: "ladies",
        color_map: { "White": 101, "Black": 102, "Pink": 106, "Heather Mauve": 107 }
      },
      qikink: {
        // Base SKU for "Female Round Neck Half Sleeve"
        product_id: "FRnHs",
        color_map: { "White": "Wh", "Black": "Bk", "Pink": "Pk", "Heather Mauve": "Mv" }
      },
      gelato: {
        product_uid: "apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_classic_gsi_{size}_gco_{color}_gpr_{print_code}_gildan_64000",
        color_map: { "White": "white", "Black": "black", "Pink": "pink", "Heather Mauve": "heather_mauve" }
      }
    }
  },

  // =========================================
  // 🎒 ACCESSORIES
  // =========================================
  {
    id: "mug-ceramic-11oz",
    title: "Classic Ceramic Mug (11oz)",
    category: "Accessories",
    image: 'https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/catalog%2Fmug-ceramic-11oz?alt=media&token=7a07c2c7-78d6-4610-8e09-aee10ceb5bd1',
    model3d: "assets/mug.glb",
    description: "Every great day begins with a warm cup and a moment to yourself. This classic ceramic mug turns your coffee or tea into a daily ritual worth enjoying. Strong, elegant, and perfect for your favorite design — it's not just a mug, it's a small piece of comfort in your everyday life.",

    print_areas: {
      front: { width: 2550, height: 1080 }
    },

    canvas_size: {
      width: 765,
      height: 324
    },

    price: {
      IN: 449,
      US: 19.99,
      GB: 14.99,
      EU: 16.99,
      CA: 24.99
    },

    mockups: {
      front: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Fmug%2Fmug-front.png?alt=media&token=b97278ce-579e-40de-8a7f-f5bef7424a7a",
      left: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Fmug%2Fmug-left.png?alt=media&token=36975115-7689-4c9b-ada3-5ec61ea94aae",
      right: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Fmug%2Fmug-right.png?alt=media&token=24896456-f472-49cb-ae91-0b9a8f9a0c03"
    },

    print_area_2d: {
      front: { top: 13, left: 25, width: 50, height: 79 },
      left: { top: 13, left: 25, width: 50, height: 79 },
      right: { top: 13, left: 25, width: 50, height: 79 }
    },

    variants: {
      qikink: {
        colors: ["White"],
        sizes: ["11oz"]
      },
      printify: {
        colors: ['White'],
        sizes: ['11oz']
      },
      gelato: {
        colors: ['White'],
        sizes: ['11oz']
      }
    },

    vendor_maps: {
      printify: {
        blueprint_id: "503",
        print_provider_id: "48",
        color_map: { "White": 101, "Black Handle": 115 },
        variant_id: 67624,
      },
      qikink: {
        // Mugs typically don't use the SKU pattern, using 'Mug' as base for ID construction
        product_id: "UWCM-Wh-11 OZ",
        color_map: { "White": "Wh" }
      },
      gelato: {
        product_uid: "mug_product_msz_11-oz_mmat_ceramic-white_cl_4-0",
        color_map: { "White": "white", "Black Handle": "black_handle" }
      }
    }
  },

  {
    id: "tote-bag-canvas",
    title: "Eco Canvas Tote Bag",
    category: "Accessories",
    image: 'https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/catalog%2Ftote-bag-canvas?alt=media&token=bd508609-096a-443c-a6a1-196390ceefdc',
    model3d: "assets/tote.glb",
    description: "Carry your world with style and purpose. This eco-friendly canvas tote is strong enough for your daily essentials and simple enough to match every outfit. From grocery runs to college days or weekend outings, it becomes the bag that travels everywhere with you.",

    print_areas: {
      front: { width: 3000, height: 3600 },
    },

    canvas_size: {
      front: {
        width: 300,
        height: 360
      }
    },

    price: {
      IN: 549,
      US: 26.99,
      GB: 20.99,
      EU: 14.99,
      CA: 20.99
    },

    mockups: {
      front: "https://firebasestorage.googleapis.com/v0/b/tryam-5bff4.firebasestorage.app/o/mockups%2Ftote-bag%2Ftote-bag.png?alt=media&token=1362dba6-debb-40a9-a893-c20aee247e0b",
    },

    print_area_2d: {
      front: { top: 43, left: 36, width: 30, height: 36 },
    },

    variants: {
      qikink: {
        colors: ["White"]
      },
      printify: {
        colors: ['Natural', 'Black']
      },
      gelato: {
        colors: ['White']
      }
    },

    vendor_maps: {
      printify: {
        blueprint_id: "1313",
        print_provider_id: "29",
        variant_id: { "Natural": 101409, "Black": 103598 }
      },
      qikink: {
        product_id: "UTbNz-Wh-NA",
        color_map: { "White": "Wh" }
      },
      gelato: {
        product_uid: "bag_product_bsc_tote-bag_bqa_clc_bsi_std-t_bco_white_bpr_{print_code}",
        color_map: { "Natural": "natural", "Black": "black" }
      }
    }
  }
];