// src/main.tsx
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import AuthPage from "@/pages/Auth.tsx";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Routes, useLocation, Outlet } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import LaunchPage from "./pages/LaunchPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import "./types/global.d.ts";
import { DashboardLayout } from "./components/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import DashboardTemplates from "./pages/DashboardTemplates";
import DashboardProjects from "./pages/DashboardProjects";
import DashboardPricing from "./pages/DashboardPricing";
import DashboardOrders from "./pages/DashboardOrders";
import DashboardSettings from "./pages/DashboardSettings";
import { AuthProvider } from "./hooks/use-auth";
import DesignEditorPage from "./pages/DesignEditorPage";
import Storefront from './pages/StoreFront.tsx';
import AdminProductManager from "./pages/AdminProductManager.tsx";
import OrderCheckoutPage from './pages/OrderCheckoutPage';
import TermsConditions from "./pages/TermsConditions";
import OrderDetailsPage from "./pages/OrderDetailsPage.tsx";
import { CartProvider } from "./context/CartContext";
import CartPage from "./pages/CartPage.tsx"; // ✅ Import Provider
import AdminOrders from "./pages/AdminOrders.tsx";
import ProductDetails from "./pages/ProductDetails";
import HeadlessRender from "./pages/HeadlessRender.tsx";
import AdminDashboard from "./pages/AdminDashboard";
import LegalPage from "./pages/LegalPage";
import HelpPage from "./pages/HelpPage";
import ContactPage from "./pages/ContactPage";
import DashboardContact from "./pages/DashboardContact";
import DashboardHelp from "./pages/DashboardHelp";
import AdminRoute from "./components/AdminRoute";
import BannedPage from "./pages/BannedPage.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import TemplatesPage from "./pages/TemplatesPage.tsx";
import AboutPage from "./pages/AboutPage.tsx";

function RootLayout() {
  return (
    <>
      <RouteSyncer />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route path="/banned" element={<BannedPage />} />
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
      <Route path="/store" element={<Storefront />} />
      <Route path="/product/:productId" element={<ProductDetails />} />
      <Route path="/terms" element={<TermsConditions />} />
      <Route path="/templates" element={<TemplatesPage />} />
      <Route path="/design/*" element={<DesignEditorPage />} />

      <Route element={<ProtectedRoute />}>
        {/* Store Routes */}
        <Route path="orders/:orderId" element={<OrderDetailsPage />} />

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="designs" element={<DashboardTemplates />} />
          <Route path="projects" element={<DashboardProjects />} />
          <Route path="orders" element={<DashboardOrders />} />
          <Route path="pricing" element={<DashboardPricing />} />
          <Route path="settings" element={<DashboardSettings />} />
          <Route path="help" element={<DashboardHelp />} />
          <Route path="contact" element={<DashboardContact />} />
        </Route>

        <Route path="/checkout" element={<OrderCheckoutPage />} />

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminProductManager />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>
      </Route>

      <Route path="/render/*" element={<HeadlessRender />} />
      <Route path="/legal/:type" element={<LegalPage />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  )
);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    // 📊 Google Analytics Page View Tracking
    if (window.gtag) {
      window.gtag('config', 'G-VR1FW6LD6Y', {
        page_path: location.pathname + location.search,
      });
    }

    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <AuthProvider>
      <CartProvider>
        <RouterProvider router={router} />
        <Toaster />
      </CartProvider>
    </AuthProvider>
  </StrictMode>,
);