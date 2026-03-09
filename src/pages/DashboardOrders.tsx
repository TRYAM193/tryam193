import { motion } from "framer-motion";
import { Package, Truck, CheckCircle, Clock, Search, Filter, Zap, ExternalLink, ShoppingBag, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";

// 🔥 FIREBASE IMPORTS
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { formatDate } from "@/lib/formatOrderDate";

// ------------------------------------------------------------------
// 💀 SKELETON LOADER
// ------------------------------------------------------------------
const OrderSkeleton = () => (
  <Card className="overflow-hidden bg-slate-800/40 backdrop-blur-md border border-white/10 shadow-lg">
    <CardContent className="p-0">
      <div className="flex flex-col sm:flex-row gap-5 p-5 animate-pulse">
        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-slate-700/50 shrink-0" />
        <div className="flex-1 space-y-3 py-1">
          <div className="flex justify-between">
            <div className="h-5 w-32 bg-slate-700/50 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 bg-slate-700/30 rounded" />
            <div className="h-3 w-1/2 bg-slate-700/30 rounded" />
          </div>
        </div>
        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 mt-2 sm:mt-0">
          <div className="h-6 w-20 bg-slate-700/50 rounded-full" />
          <div className="h-6 w-16 bg-slate-700/50 rounded" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function DashboardOrders() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // 🛠️ HELPER: Map Backend Status to UI
  const mapBackendStatusToUI = (status: string, providerStatus: string) => {
    if (providerStatus === 'shipped') return 'Shipped';
    switch (status) {
      case 'placed': return 'Processing';
      case 'processing': return 'Processing';
      case 'shipped': return 'Shipped';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Processing';
    }
  };

  // 2. FETCH REAL ORDERS
  useEffect(() => {
    async function fetchOrders() {
      if (!user) return;
      try {
        setLoading(true);
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const fetchedOrders = snapshot.docs.map(doc => {
          const data = doc.data();
          let displayTitle = "Custom Item";
          let displayImage = "";
          let specificTotal = 0;
          let itemDescription = "";

          // NEW SPLIT ORDER LOGIC
          if (data.title || data.productId) {
            const qty = Number(data.quantity) || 1;
            const price = Number(data.price) || 0;
            displayTitle = data.title;
            displayImage = data.thumbnail || data.image || data.designData?.previewImage;
            
            // 🧮 USE THE TRUE PAYMENT TOTAL (which includes the anchored discount)
            specificTotal = data.payment?.total ?? (price * qty); 
            
            const variantStr = data.variant ? `${data.variant.color || ''} ${data.variant.size || ''}` : 'Custom';
            itemDescription = `${displayTitle} (${variantStr}) x${qty}`;
          }
          // LEGACY ORDER LOGIC
          else if (data.items && data.items.length > 0) {
            const firstItem = data.items[0];
            displayTitle = firstItem.title;
            displayImage = firstItem.thumbnail;
            specificTotal = data.items.reduce((acc: number, item: any) => acc + (Number(item.price) * Number(item.quantity)), 0);
            itemDescription = data.items.map((item: any) => `${item.title} x${item.quantity}`).join(", ");
          }

          if (specificTotal === 0 && data.payment?.total) specificTotal = data.payment.total;

          return {
            id: data.orderId || doc.id,
            rawData: { id: doc.id, ...data },
            referralDiscountApplied: data.referralDiscountApplied,
            date: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
            description: itemDescription,
            total: `${data.payment?.currency || data.currency || '$'} ${specificTotal.toFixed(2)}`,
            status: mapBackendStatusToUI(data.status, data.providerStatus),
            image: displayImage || "https://placehold.co/100?text=No+Img"
          };
        });

        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated) fetchOrders();
  }, [user, isAuthenticated]);

  // 3. FILTERING
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) || order.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Delivered": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Shipped": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Processing": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "Cancelled": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-slate-700/50 text-slate-300 border-slate-600/50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Delivered": return <CheckCircle className="h-3 w-3 mr-1.5" />;
      case "Shipped": return <Truck className="h-3 w-3 mr-1.5" />;
      case "Processing": return <Clock className="h-3 w-3 mr-1.5" />;
      default: return null;
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-8 relative pb-20">
      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10 w-full h-full bg-[#0f172a]">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* HEADER & FILTERS */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            {t("orders.title")}
          </motion.h1>

          {/* Hide Filters if User has NO orders at all (Empty State) */}
          {(!loading && orders.length > 0) && (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t("orders.search")}
                  className="pl-10 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 h-11 sm:h-10 rounded-xl w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px] bg-slate-800/50 border-white/10 text-slate-200 h-11 sm:h-10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder={t("orders.status")} />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-300">
                  <SelectItem value="All">{t("orders.allStatuses")}</SelectItem>
                  <SelectItem value="Processing">{t("orders.processing")}</SelectItem>
                  <SelectItem value="Shipped">{t("orders.shipped")}</SelectItem>
                  <SelectItem value="Delivered">{t("orders.delivered")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
          </div>
        ) : orders.length === 0 ? (
          // 🚀 TRUE EMPTY STATE (No Orders placed ever)
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl bg-slate-800/20 text-center px-6">
            <div className="h-24 w-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/5">
              <ShoppingBag className="h-10 w-10 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">You haven't placed any orders yet</h3>
            <p className="text-slate-400 max-w-sm mb-8">
              Looks like you haven't started your custom journey. Browse our catalog and create something unique!
            </p>
            <Link to="/store">
              <Button size="lg" className="rounded-full px-8 h-12 text-base font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-lg shadow-orange-900/40 transition-transform hover:scale-105">
                Browse Catalog <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          // 🔍 FILTER EMPTY STATE (Orders exist, but filter matched nothing)
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/5 text-center px-6">
            <Package className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t("orders.noResults")}</h3>
            <p className="text-slate-400">Try adjusting your search or filters.</p>
            <Button variant="link" onClick={() => { setSearchQuery(""); setStatusFilter("All"); }} className="text-orange-400 mt-2">
              Clear Filters
            </Button>
          </div>
        ) : (
          // ✅ ORDERS LIST
          filteredOrders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={`/orders/${order.id}`} state={{ orderData: order.rawData }}>
                <Card className="overflow-hidden hover:bg-white/5 transition-colors cursor-pointer group bg-slate-800/40 backdrop-blur-md border border-white/10 shadow-lg">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row gap-5 p-5">
                      {/* Image & Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-slate-700 overflow-hidden flex-shrink-0 border border-white/5 shadow-inner">
                          <img src={order.image} alt="Order Item" className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-white truncate flex items-center gap-2">
                            {t("orders.orderNumber")}{order.id}
                          </h3>
                          <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">{order.description}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                            <Clock className="w-3 h-3" />
                            {t("orders.placedOn")} <span className="text-slate-400">{formatDate(order.rawData.createdAt)}</span>
                          </p>
                        </div>
                      </div>
                      {/* Status & Price */}
                      <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center sm:gap-2 mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/5 sm:border-0">
                        <Badge className={`px-3 py-1 text-xs font-medium border ${getStatusStyles(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </Badge>
                        <div className="flex flex-col gap-2 items-center">
                          <span className="font-bold text-white text-lg">
                            {order.total}
                          </span>

                          {/* 🎁 INJECT THE BADGE HERE */}
                          {order.referralDiscountApplied && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                              <Zap className="h-3 w-3" /> Reward Applied
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}