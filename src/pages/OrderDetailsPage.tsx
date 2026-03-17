import { useEffect, useState, useRef } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router";
import {
  Truck, Calendar, MapPin, ExternalLink,
  ArrowLeft, RefreshCw, Loader2, Check, Circle, Zap, Tag,
  Printer, Shirt, CreditCard, ShieldCheck, HelpCircle, AlertCircle,
  Sparkles, Archive, FileImage, Download, Phone, Send, MessageSquare, XCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { db, functions } from "@/firebase";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, arrayUnion, query, onSnapshot, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useAuth } from "@/hooks/use-auth";

// ------------------------------------------------------------------
// 📦 HELPER: Download Zip Logic
// ------------------------------------------------------------------
const downloadMockupsZip = async (itemTitle: string, urls: string[]) => {
  if (!urls.length) return;
  const zip = new JSZip();
  const folder = zip.folder("mockups");

  try {
    toast.info("Preparing ZIP file...");
    const promises = urls.map(async (url, i) => {
      const response = await fetch(url);
      const blob = await response.blob();
      const ext = url.split('.').pop()?.split('?')[0] || "png";
      folder?.file(`mockup_${i + 1}.${ext}`, blob);
    });

    await Promise.all(promises);
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${itemTitle.replace(/\s+/g, '_')}_mockups.zip`);
    toast.success("Download started!");
  } catch (err) {
    console.error("Failed to zip files:", err);
    toast.error("Could not generate ZIP. Try downloading images individually.");
  }
};

// ------------------------------------------------------------------
// 🖼️ COMPONENT: Print File Card
// ------------------------------------------------------------------
const PrintFileCard = ({ label, url }: { label: string, url?: string }) => {
  if (!url) return null;

  return (
    <div className="group relative bg-slate-950 border border-white/10 rounded-lg p-3 flex items-center gap-3 transition-all hover:border-blue-500/50">
      <div className="h-12 w-12 rounded bg-slate-900 flex items-center justify-center border border-white/5 overflow-hidden">
        <img src={url} alt={label} className="h-full w-full object-contain opacity-80 group-hover:opacity-100" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-slate-500 truncate">High-Res PNG • 300 DPI</p>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-blue-500/20"
              onClick={() => saveAs(url, `${label.toLowerCase().replace(" ", "_")}.png`)}
            >
              <Download className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Download Source File</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// ------------------------------------------------------------------
// 🎨 COMPONENT: Mockup Gallery
// ------------------------------------------------------------------
const MockupGallerySection = ({ item }: { item: any }) => {
  const gallery = item.mockupFiles?.gallery || [];

  // Fallback to legacy structure or standard previews if gallery empty
  if (gallery.length === 0) {
    if (item.mockupFiles?.front) gallery.push(item.mockupFiles.front);
    if (item.mockupFiles?.back) gallery.push(item.mockupFiles.back);
    // Use root level preview/image/designData if present
    if (gallery.length === 0 && (item.preview || item.image || item.designData?.previewImage)) {
      gallery.push(item.preview || item.image || item.designData?.previewImage);
    }
  }

  const [selectedImage, setSelectedImage] = useState(gallery[0]);
  const isReady = gallery.length > 0;

  useEffect(() => {
    if (gallery.length > 0 && !gallery.includes(selectedImage)) {
      setSelectedImage(gallery[0]);
    }
  }, [gallery]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-orange-400" />
          3D Mockups
        </h4>
        {isReady && gallery.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1 px-2"
            onClick={() => downloadMockupsZip(item.title, gallery)}
          >
            <Archive className="w-3 h-3" /> Download ZIP
          </Button>
        )}
      </div>

      <div className="flex gap-4">
        {/* Main Preview */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="relative w-32 h-32 bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden flex-shrink-0 cursor-zoom-in group">
              <img
                src={selectedImage || "/placeholder.png"}
                alt="Mockup"
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
              {!isReady && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center p-2">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-1" />
                  <span className="text-[9px] text-slate-300">Generating...</span>
                </div>
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="bg-slate-950 border-white/10 max-w-4xl w-full p-1 overflow-hidden">
            <div className="relative w-full aspect-video bg-black/50 rounded-lg flex items-center justify-center">
              <img src={selectedImage} className="max-h-full max-w-full object-contain" alt="Full Preview" />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-2 p-4 overflow-x-auto justify-center bg-slate-900/50">
                {gallery.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 rounded border-2 overflow-hidden flex-shrink-0 ${selectedImage === img ? 'border-blue-500' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt={`Thumb ${i}`} />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Thumbnails Grid */}
        {isReady && (
          <ScrollArea className="flex-1 h-32">
            <div className="grid grid-cols-3 gap-2 pr-3">
              {gallery.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(img)}
                  className={`aspect-square rounded-lg border overflow-hidden bg-slate-800/30 transition-all ${selectedImage === img
                    ? "border-blue-500 ring-1 ring-blue-500/20"
                    : "border-white/5 hover:border-white/20"
                    }`}
                >
                  <img src={img} className="w-full h-full object-cover" alt={`Thumb ${i}`} />
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// 🛠️ SUPPORT MODAL COMPONENT (Unified Logic)
// ------------------------------------------------------------------
const SupportModal = ({ isOpen, onClose, mode, order, ticket, onSuccess }: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [replyText, setReplyText] = useState("");

  // Address State
  const [address, setAddress] = useState(order?.shippingAddress || {});

  // Ticket State
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket?.messages, isOpen]);

  // Reset when opening
  useEffect(() => {
    if (isOpen && order) {
      setAddress(order.shippingAddress || {});
      setIssueType("");
      setDescription("");
    }
  }, [isOpen, order]);

  const handleUserReply = async () => {
    if (!replyText.trim()) return;
    setIsLoading(true);
    try {
      const ticketRef = doc(db, "support_tickets", ticket.id);
      await updateDoc(ticketRef, {
        messages: arrayUnion({
          sender: "user",
          text: replyText,
          timestamp: new Date().toISOString()
        }),
        status: "open", // Re-open if closed
        lastUpdated: serverTimestamp()
      });
      setReplyText("");
      toast.success("Reply sent!");
    } catch (error) {
      toast.error("Failed to send reply");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressUpdate = async () => {
    // 1. SAFETY CHECK: Is the order already with the provider?
    const isLocked = ['synced', 'production', 'printing', 'shipped', 'delivered'].includes(order.providerStatus);

    if (isLocked) {
      // 🛑 DANGER ZONE: Do not update DB. Open a ticket instead.
      toast.error("Order is already in production! Redirecting to Support...");

      // Switch Modal Mode to Ticket
      // We pre-fill the description for them
      setIssueType("Address Change Request");
      setDescription(
        `URGENT: Please change my address to:\n\n` +
        `${address.fullName}\n${address.line1}, ${address.city}\n${address.zip}\nPhone: ${address.phone}`
      );

      // This relies on your parent component handling the mode switch
      // Or we can just submit the ticket directly here:
      await addDoc(collection(db, "support_tickets"), {
        userId: order.userId || "guest",
        orderId: order.id,
        orderNumber: order.orderId,
        type: "Urgent Address Change",
        description: `URGENT: Please change my address to:\n\n${address.fullName}\n${address.line1}, ${address.city}\n${address.zip}\nPhone: ${address.phone}`,
        status: "open",
        priority: "high", // 🚨 Flag for Admin
        createdAt: serverTimestamp()
      });

      toast.success("Request sent to Admin! We will try to catch the order.");
      onClose();
      return;
    }

    // ✅ SAFE ZONE: Update directly (Bot hasn't run yet)
    setIsLoading(true);
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, {
        shippingAddress: address,
        // No need to alert admin if it's not sent to provider yet.
        // But we update the timestamp just in case.
        updatedAt: serverTimestamp()
      });
      toast.success("Address updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to update address.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTicketSubmit = async () => {
    if (!issueType || !description) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    try {
      // Create a Support Ticket linked to this order
      await addDoc(collection(db, "support_tickets"), {
        userId: order.userId || "guest",
        orderId: order.id,
        orderNumber: order.orderId,
        type: mode === "TICKET_REFUND" ? "Refund Request" : issueType,
        description: description,
        status: "open",
        createdAt: serverTimestamp()
      });
      toast.success("Support ticket created. We will contact you shortly.");
      onClose();
    } catch (error) {
      toast.error("Failed to submit ticket.");
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "ADDRESS_UPDATE") {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Update Shipping Address</DialogTitle>
            <DialogDescription className="text-slate-400">
              Updates are only possible before the item is printed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} className="bg-slate-800 border-slate-600" />
            </div>
            <div className="space-y-1">
              <Label>Address Line 1</Label>
              <Input value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} className="bg-slate-800 border-slate-600" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>City</Label>
                <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className="bg-slate-800 border-slate-600" />
              </div>
              <div className="space-y-1">
                <Label>Pincode</Label>
                <Input value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} className="bg-slate-800 border-slate-600" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} className="bg-slate-800 border-slate-600" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleAddressUpdate} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
              {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <MapPin className="mr-2 h-4 w-4" />}
              Update Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (ticket) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {ticket.type}
              <Badge variant="outline" className="text-xs text-white capitalize">{ticket.status}</Badge>
            </DialogTitle>
          </DialogHeader>

          {/* CHAT HISTORY */}
          <div className="h-[300px] overflow-y-auto no-scrollbar space-y-3 p-3 bg-slate-950 rounded-lg border border-slate-800" ref={scrollRef}>
            {/* Original Issue */}
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">You wrote:</span>
              <div className="bg-slate-800 p-3 rounded-lg w-fit rounded-tl-none text-sm text-slate-300">
                {ticket.description}
              </div>
            </div>

            {/* Messages Loop */}
            {ticket.messages?.map((msg: any, i: number) => (
              <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}>
                <div className={`p-3 rounded-xl text-sm max-w-[85%] ${msg.sender === 'user'
                  ? 'bg-slate-800 text-slate-300 rounded-tl-none'
                  : 'bg-purple-600 text-white rounded-tr-none'
                  }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-600 mt-1">
                  {msg.sender === 'admin' ? 'Support Team' : 'You'}
                </span>
              </div>
            ))}
          </div>

          {/* REPLY INPUT */}
          <div className="flex gap-2 mt-2">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a reply..."
              className="bg-slate-800 border-slate-700"
            />
            <Button onClick={handleUserReply} disabled={isLoading} size="icon" className="bg-purple-600 hover:bg-purple-700">
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // TICKET MODAL (Problem or Refund)
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>
            {mode === "TICKET_REFUND" ? "Request a Refund" : "Report a Problem"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            We're sorry you're facing issues. Please describe the problem below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {mode !== "TICKET_REFUND" && (
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select onValueChange={setIssueType}>
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select an issue..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="Print Quality">Print Quality Issue</SelectItem>
                  <SelectItem value="Wrong Item">Received Wrong Item</SelectItem>
                  <SelectItem value="Damaged">Item Damaged on Arrival</SelectItem>
                  <SelectItem value="Missing">Package Never Arrived</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Please provide details (e.g., 'The print is peeling off' or 'I received size M instead of L')."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-800 border-slate-600 min-h-[100px]"
            />
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-xs text-blue-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Our support team usually responds within 24 hours via email. We might ask for photos if the item is damaged.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleTicketSubmit} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
            {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <MessageSquare className="mr-2 h-4 w-4" />}
            Submit Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// ------------------------------------------------------------------
// 📊 VERTICAL TIMELINE TRACKER
// ------------------------------------------------------------------
const OrderTrackerVertical = ({ status, providerStatus }: { status: string, providerStatus?: string }) => {
  const steps = [
    { label: "Order Placed", dateLabel: "Order Received", key: "placed" },
    { label: "Processing", dateLabel: "Sent to Production", key: "processing" },
    { label: "Printing", dateLabel: "In Production", key: "printing" },
    { label: "Shipped", dateLabel: "On the way", key: "shipped" },
    { label: "Delivered", dateLabel: "Arrived", key: "delivered" }
  ];

  const getCurrentStepIndex = () => {
    if (status === 'delivered') return 4;
    if (status === 'shipped') return 3;
    if (providerStatus === 'printing' || providerStatus === 'production') return 2;
    if (status === 'processing' || providerStatus === 'synced') return 1;
    return 0;
  };

  const currentStep = getCurrentStepIndex();

  return (
    <div className="relative pl-4 py-2">
      <div className="absolute left-[35px] top-5 bottom-5 w-[2px] bg-slate-800" />
      <div
        className="absolute left-[35px] top-5 w-[2px] bg-green-500 transition-all duration-700 ease-out"
        style={{ height: `${(currentStep / (steps.length - 1)) * 100}%` }}
      />
      <div className="space-y-8">
        {steps.map((step, index) => {
          const isCompleted = index <= currentStep;
          const isCurrent = index === currentStep;
          return (
            <div key={step.key} className="relative flex items-center gap-4 group">
              <div
                className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 shrink-0",
                  isCompleted ? "bg-[#0f172a] border-green-500 text-green-500" : "bg-[#0f172a] border-slate-700 text-slate-700",
                  isCurrent && "shadow-[0_0_15px_rgba(34,197,94,0.4)] scale-110 border-green-400"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Circle className="w-4 h-4 fill-current" />}
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "font-bold text-sm uppercase tracking-wide transition-colors",
                  isCompleted ? "text-white" : "text-slate-500"
                )}>
                  {step.label}
                </span>
                <span className="text-xs text-slate-500 font-medium">{step.dateLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// ⚙️ CONSTANTS
// ------------------------------------------------------------------
const TRUST_LINES = [
  "Custom prints need 2-3 days to craft perfectly.",
  "Good things take time. Your unique item is being made.",
  "Quality checks ensure your custom order arrives flawless."
];

const QUALITY_LINES = [
  "We use premium materials for a lasting fit.",
  "Every item is hand-checked before shipping."
];

// ------------------------------------------------------------------
// 🛍️ MAIN PAGE
// ------------------------------------------------------------------
export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const navigate = useNavigate()
  const location = useLocation();
  const { user } = useAuth()

  const initialOrder = location.state?.orderData;
  const [order, setOrder] = useState<any>(initialOrder || null);
  const [loading, setLoading] = useState(!initialOrder);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState<any>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    if (!order) return;
    const q = query(collection(db, "support_tickets"), where("orderId", "==", order.id));
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [order]);

  // 🛠️ SUPPORT MODAL STATE
  const [modalMode, setModalMode] = useState<"NONE" | "ADDRESS_UPDATE" | "TICKET_PROBLEM" | "TICKET_REFUND" | "VIEW_TICKET">("NONE");

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      if (!initialOrder) setLoading(true);
      const docRef = doc(db, "orders", orderId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        if (docSnap.data().userId !== user?.uid) return navigate('/*')
        setOrder({ id: docSnap.id, ...docSnap.data() });
      } else {
        toast.error("Order not found");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [orderId]);

  const handleRefreshStatus = async () => {
    if (!order) return;
    setRefreshing(true);
    try {
      const refreshFn = httpsCallable(functions, 'refreshOrderStatus');
      const result: any = await refreshFn({ orderId: order.id });
      if (result.data.updated) {
        toast.success(`Status updated: ${result.data.newStatus}`);
        fetchOrder();
      } else {
        toast.info("No updates found from courier yet.");
      }
    } catch (error) {
      toast.error("Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  };

  // 🔘 BUTTON CLICK HANDLER
  const handleSupportClick = (action: string) => {
    if (!order) return;

    switch (action) {
      case "Track my package":
        if (order.providerData?.trackingUrl) {
          window.open(order.providerData.trackingUrl, "_blank");
        } else {
          toast.info("Tracking not available yet. Please wait for the 'Shipped' status.");
        }
        break;

      case "Change shipping address":
        if (order.status === "shipped" || order.status === "delivered") {
          toast.error("Cannot change address. Order has already been shipped.");
        } else {
          setModalMode("ADDRESS_UPDATE");
        }
        break;

      case "Report a problem":
        setModalMode("TICKET_PROBLEM");
        break;

      case "Request a refund":
        setModalMode("TICKET_REFUND");
        break;

      case "Contact Support":
        const subject = encodeURIComponent(`Question about Order #${order.orderId || order.id}`);
        window.open(`mailto:support@yourbrand.com?subject=${subject}`, "_blank");
        break;
    }
  };

  const getDeliveryConfidence = () => {
    if (order?.status === 'delivered') return "Delivered";
    if (order?.status === 'shipped') return "On track";
    return "Estimated";
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Pending...";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const specificOrderTotal = order?.payment?.total ?? (order ? (Number(order.price) * Number(order.quantity)) : 0);

  const currencySymbol = order?.payment?.currency || order?.currency || '$';
  const ledger = order?.payment?.ledger || {};
  
  // Fallback to legacy structure if ledger doesn't exist for old orders
  const basePrice = ledger.basePrice ?? (order ? (Number(order.price) * Number(order.quantity)) : 0);
  const bulkDiscount = ledger.allocatedBulkDiscount ?? 0;
  const refDiscount = ledger.allocatedReferralDiscount ?? (order?.referralDiscountApplied ? 100 : 0);

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 h-8 w-8" /></div>;
  if (!order) return <div className="text-white text-center pt-20">Order not found</div>;

  const HELP_OPTIONS = [
    "Track my package",
    "Report a problem",
    "Change shipping address",
    "Request a refund",
    "Contact Support"
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] pb-20 relative font-sans">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

      {/* 🟢 MOUNT THE MODAL */}
      <SupportModal
        isOpen={modalMode !== "NONE"}
        onClose={() => setModalMode("NONE")}
        mode={modalMode}
        order={order}
        ticket={selectedTicket}
        onSuccess={fetchOrder} // Refresh data after update
      />

      <div className="container max-w-6xl mx-auto px-4 py-8 relative z-10">

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 mb-6 lg:mb-8 border-b border-white/10 pb-4 lg:pb-6">
          <div className="space-y-2">
            <Link to="/dashboard/orders" className="text-slate-400 hover:text-white flex items-center gap-2 text-sm transition-colors mb-1">
              <ArrowLeft className="h-4 w-4" /> Back to Orders
            </Link>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              Order #{order.id}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {formatDate(order.createdAt)}</span>
              <span className="hidden sm:inline h-1 w-1 rounded-full bg-slate-600"></span>
              <span className="flex text-bold items-center gap-2 text-white">
                <CreditCard className="h-4 w-4 text-orange-400" />
                Total : {currencySymbol}{specificOrderTotal.toFixed(2)}
              </span>
              <span className="hidden sm:inline h-1 w-1 rounded-full bg-slate-600"></span>
              {order.groupId && (
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                  Group: {order.groupId}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              variant="ghost"
              className="w-full sm:w-auto text-slate-500 hover:text-white hover:bg-white/5 transition-all"
              onClick={handleRefreshStatus}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Checking..." : "Refresh Status"}
            </Button>

            {order.providerData?.trackingUrl && (
              <Button className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/20" asChild>
                <a href={order.providerData.trackingUrl} target="_blank" rel="noreferrer">
                  Track Package <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* 🛍️ LEFT COLUMN - PRODUCT DETAILS */}
          <div className="lg:col-span-8 space-y-6">

            <Card className="bg-slate-800/40 border-white/10 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-slate-800/60 border-b border-white/5 pb-4">
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <Shirt className="h-5 w-5 text-orange-400" />
                  Product Details
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-8">
                <div className="flex flex-col sm:flex-row gap-6">

                  {/* THUMBNAIL */}
                  <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 bg-white rounded-xl overflow-hidden shrink-0 border-2 border-white/10 shadow-lg relative group">
                    <img
                      src={order.thumbnail || order.image || order.designData?.previewImage || "/placeholder.png"}
                      alt="Product Thumbnail"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* INFO GRID */}
                  <div className="flex-1 flex flex-col gap-5">
                    
                    {/* Title & Trust Badge */}
                    <div>
                      <h2 className="text-2xl font-black text-white leading-tight mb-1.5">
                        {order.title || order.productTitle || "Custom Product"}
                      </h2>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                          <ShieldCheck className="h-3 w-3" /> Quality Verified
                        </span>
                        <span className="text-xs text-slate-500">Premium Fit & Finish</span>
                      </div>
                    </div>

                    {/* Bento Box Specs */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Variant Card */}
                      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 flex flex-col justify-center">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1.5">Variant</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="bg-slate-800 border-slate-700 text-white shadow-sm">
                            {order.variant?.size || "L"}
                          </Badge>
                          <Badge variant="outline" className="bg-slate-800 border-slate-700 text-white capitalize shadow-sm">
                            {order.variant?.color || "Black"}
                          </Badge>
                        </div>
                      </div>

                      {/* Quantity Card */}
                      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 flex flex-col justify-center">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">Quantity</span>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-black text-white leading-none">{order.quantity}</span>
                          <span className="text-xs text-slate-500 mb-0.5">Units</span>
                        </div>
                      </div>
                    </div>

                    {/* 🧾 DIGITAL RECEIPT CARD */}
                    <div className="relative mt-2 bg-gradient-to-b from-slate-900/80 to-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-2xl overflow-hidden">
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl" />
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-50" />
                      
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5" /> Item Receipt
                      </h4>

                      <div className="space-y-2.5 relative z-10">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Base Price (x{order.quantity})</span>
                          <span className="text-slate-200 font-medium">{currencySymbol} {basePrice.toFixed(2)}</span>
                        </div>

                        {bulkDiscount > 0 && (
                          <div className="flex justify-between items-center text-sm group">
                            <span className="flex items-center gap-1.5 text-green-400">
                              <Tag className="w-3.5 h-3.5" /> Bulk Savings
                            </span>
                            <span className="text-green-400 font-bold">- {currencySymbol} {bulkDiscount.toFixed(2)}</span>
                          </div>
                        )}

                        {refDiscount > 0 && (
                          <div className="flex justify-between items-center text-sm group">
                            <span className="flex items-center gap-1.5 text-orange-400">
                              <Zap className="w-3.5 h-3.5" /> Referral Reward
                            </span>
                            <span className="text-orange-400 font-bold">- {currencySymbol} {refDiscount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Dashed Receipt Line */}
                      <div className="w-full border-t border-dashed border-slate-700 my-4 relative z-10" />

                      <div className="flex justify-between items-end relative z-10">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 mb-0.5">Total Paid</span>
                          <span className="text-2xl font-black text-white leading-none">
                            {currencySymbol} {specificOrderTotal.toFixed(2)}
                          </span>
                        </div>
                        
                        <Button size="sm" className="bg-white/10 hover:bg-white/20 text-white border border-white/5 shadow-sm rounded-lg h-9 px-4 transition-all hover:scale-105">
                          Buy Again
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/5" />

                {/* MOCKUPS & FILES SECTION */}
                <div className="grid md:grid-cols-2 gap-8">
                  <MockupGallerySection item={order} />
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <FileImage className="w-3 h-3 text-purple-400" />
                      Production Files
                    </h4>
                    <div className="space-y-2">
                      {order.printFiles?.front && (
                        <PrintFileCard label="Front Print" url={order.printFiles.front} />
                      )}
                      {order.printFiles?.back && (
                        <PrintFileCard label="Back Print" url={order.printFiles.back} />
                      )}
                      {!order.printFiles?.front && !order.printFiles?.back && (
                        <div className="p-4 border border-dashed border-white/10 rounded-lg text-center text-xs text-slate-500">
                          <Printer className="w-4 h-4 mx-auto mb-1 opacity-50" />
                          Processing print files...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* 🟢 FUNCTIONAL HELP BUTTONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {HELP_OPTIONS.map((option, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="border-white/5 bg-slate-800/30 hover:bg-slate-800 text-slate-400 hover:text-white text-xs h-12 sm:h-10 justify-start"
                  onClick={() => handleSupportClick(option)}
                >
                  <HelpCircle className="h-3 w-3 mr-2 opacity-50" /> {option}
                </Button>
              ))}
            </div>
            {/* 🎫 MY TICKETS SECTION */}
            {tickets.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" /> Your Support Tickets
                </h4>
                <div className="space-y-2">
                  {tickets.map((ticket: any) => (
                    <div
                      key={ticket.id}
                      onClick={() => { setSelectedTicket(ticket); setModalMode("VIEW_TICKET"); }}
                      className="group flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-purple-500/30 rounded-lg cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${ticket.status === 'closed' ? 'bg-slate-700/50' : 'bg-purple-500/10'}`}>
                          {ticket.status === 'closed' ? <XCircle className="h-4 w-4 text-slate-500" /> : <MessageSquare className="h-4 w-4 text-purple-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-purple-200 transition-colors">
                            {ticket.type}
                          </p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">
                            {ticket.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {ticket.status === 'responded' && (
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 animate-pulse">
                            New Reply
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-slate-700 text-slate-400 capitalize">
                          {ticket.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 🚚 RIGHT COLUMN - TRACKING */}
          <div className="lg:col-span-4 space-y-6 sm:space-y-8 lg:space-y-8">
            <Card className="bg-slate-800/40 border-white/10 backdrop-blur-sm h-fit">
              <CardHeader className="bg-slate-800/60 border-b border-white/5 py-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white flex items-center gap-2 text-base">
                    <Truck className="h-4 w-4 text-green-400" /> Delivery Status
                  </CardTitle>
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                    {getDeliveryConfidence()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-6 bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                  <p className="text-xs text-blue-200 flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {TRUST_LINES[0]}
                  </p>
                </div>
                <div className="mb-6">
                  <OrderTrackerVertical status={order.status} providerStatus={order.providerStatus} />
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Method</span>
                    <span className="text-white font-medium">Standard Shipping</span>
                  </div>
                  
                  {/* 🟢 FRIENDLY DELIVERY TIMELINE EXPECTATION */}
                  <div className="flex flex-col gap-1.5 pt-4 mt-2 border-t border-white/10">
                    <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      Delivery Timeline
                    </span>
                    <span className="text-indigo-300 text-sm leading-relaxed">
                      {order.status === 'shipped' || order.status === 'delivered'
                        ? "Your order is on the move! Please check your tracking link for the exact delivery date. 🚚"
                        : "Since your item is custom-made just for you, our courier partner will calculate the exact delivery date once it ships. We'll notify you with a tracking link as soon as it's ready! 📦"}
                    </span>
                  </div>
                  {order.providerData?.trackingCode && (
                    <div className="pt-2 mt-2 border-t border-white/10">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">Tracking Number</p>
                      <p className="text-white font-mono bg-black/30 p-2 rounded text-center select-all text-xs break-all">
                        {order.providerData.trackingCode}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/40 border-white/10 backdrop-blur-sm">
              <CardHeader className="bg-slate-800/60 border-b border-white/5 py-4">
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-red-400" /> Shipping To
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-sm text-slate-300 leading-relaxed">
                <p className="font-bold text-white text-base mb-1">{order.shippingAddress?.fullName || "Guest"}</p>
                <p>{order.shippingAddress?.line1}</p>
                {order.shippingAddress?.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>{order.shippingAddress?.city}, {order.shippingAddress?.stateCode}</p>
                <p>{order.shippingAddress?.zip}, {order.shippingAddress?.countryCode}</p>
                {order.shippingAddress?.phone && <p className="mt-2 text-slate-400 text-xs"> <Phone className="h-3 w-3 inline mr-1" /> {order.shippingAddress.phone}</p>}

                <div className="mt-4 pt-4 border-t border-white/5">
                  {/* Updated Alert Logic */}
                  <button onClick={() => handleSupportClick("Change shipping address")} className="text-xs text-orange-400 flex items-center gap-1 hover:underline">
                    <AlertCircle className="h-3 w-3" /> Wrong address? Click here to fix.
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
