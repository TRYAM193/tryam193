import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router';

const titleMap: Record<string, string> = {
  '/': "TRYAM | Wear Your Imagination",
  '/store': "Catalog | Browse Custom Apparel",
  '/design': "Design Studio | Create Your Own Merch",
  '/templates': "Templates | Trending Designs",
  '/about': "About Us | Our Story",
  '/help': "Help & Support | FAQ",
  '/contact': "Contact Us | Get in Touch",
  '/dashboard': "My Dashboard | TRYAM",
  '/dashboard/cart': "My Cart | TRYAM",
  '/dashboard/designs': "My Designs | TRYAM",
  '/dashboard/projects': "My Projects | TRYAM",
  '/dashboard/orders': "My Orders | TRYAM",
  '/dashboard/pricing': "Pricing | TRYAM",
  '/dashboard/settings': "Account Settings | TRYAM",
  '/dashboard/help': "Help & FAQ | TRYAM",
  '/dashboard/contact': "Support | TRYAM",
  '/checkout': "Checkout | Secure Payment",
  '/auth': "Login / Sign Up | TRYAM",
  '/terms': "Terms & Conditions | TRYAM",
  '/banned': "Access Denied | TRYAM",
};

export default function PageTitleManager() {
  const { pathname } = useLocation();
  const params = useParams();

  useEffect(() => {
    let title = titleMap[pathname];

    // Handle dynamic product pages
    if (pathname.startsWith('/product/') && params.productId) {
      title = `Product Details | TRYAM`;
    }
    // Handle admin routes
    else if (pathname.startsWith('/admin')) {
      title = `Admin Panel | Management`;
    }
    // Handle specific legal pages
    else if (pathname.startsWith('/legal/')) {
      const type = pathname.split('/').pop() || '';
      title = `${type.charAt(0).toUpperCase() + type.slice(1)} | Legal`;
    }
    // Handle design-specific subroutes
    else if (pathname.startsWith('/design')) {
      title = "Design Studio | Create Your Own Merch";
    }

    // Default title if no match
    if (!title) {
      // Try to match partial dashboard routes
      const matchedKey = Object.keys(titleMap).find(key => pathname.startsWith(key) && key !== '/');
      title = matchedKey ? titleMap[matchedKey] : "TRYAM | Custom Merch";
    }

    document.title = title;
  }, [pathname, params]);

  return null;
}
