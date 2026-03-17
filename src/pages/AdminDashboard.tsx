import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
    collection, query, orderBy, onSnapshot, doc, updateDoc,
    deleteField, deleteDoc, arrayUnion, serverTimestamp
} from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Loader2, RefreshCw, Truck, AlertCircle, CheckCircle,
    Search, Copy, Terminal, IndianRupee, Trash2, MessageSquare,
    Eye, FileText, ExternalLink, Send, XCircle, Download
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatOrderDate";

// 🔒 SECURITY: Replace with your actual admin emails
const ADMIN_EMAILS = ["tryam193@gmail.com", 'shreyaskumaraswamy2007@gmail.com'];

export default function AdminDashboard() {
    const { user } = useAuth();

    // --- STATE ---
    const [orders, setOrders] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // --- SELECTION STATE ---
    const [selectedOrder, setSelectedOrder] = useState<any>(null); // For Manual Fulfillment
    const [viewOrder, setViewOrder] = useState<any>(null); // 👁️ For View Details Modal
    const [selectedTicket, setSelectedTicket] = useState<any>(null); // For Helpdesk
    const [ticketOrderContext, setTicketOrderContext] = useState<any>(null);

    // --- INPUT STATE ---
    const [trackingInput, setTrackingInput] = useState("");
    const [replyInput, setReplyInput] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    // 1. FETCH ORDERS & TICKETS
    useEffect(() => {
        if (!user) return;

        const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(data);
        });

        const qTickets = query(collection(db, "support_tickets"), orderBy("createdAt", "desc"));
        const unsubTickets = onSnapshot(qTickets, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTickets(data);
            setLoading(false);
        });

        return () => { unsubOrders(); unsubTickets(); };
    }, [user]);

    // --- ACTIONS ---

    const handleApproveCOD = async (orderId: string) => {
        try {
            toast.loading("Approving COD Order...");
            await updateDoc(doc(db, "orders", orderId), {
                status: "placed",
                paymentStatus: "cod_approved",
                providerStatus: "pending",
                approvedAt: new Date().toISOString()
            });
            toast.dismiss();
            toast.success("COD Order Approved!");
        } catch (error) { toast.error("Failed to approve order."); }
    };

    const handleApproveBulkOrder = async (orderId: string) => {
        try {
            toast.loading("Approving Bulk Order...");
            await updateDoc(doc(db, "orders", orderId), {
                providerStatus: "admin_approved",
                approvedAt: new Date().toISOString()
            });
            toast.dismiss();
            toast.success("Bulk Order Approved! Bot is waking up.");
            setViewOrder(null); // Close the modal
        } catch (error) {
            toast.dismiss();
            toast.error("Failed to approve order.");
        }
    };

    const handleRetryBot = async (orderId: string) => {
        try {
            await updateDoc(doc(db, "orders", orderId), {
                providerStatus: "retry",
                botError: deleteField(),
                retryTrigger: Date.now()
            });
            toast.success("Bot restart command sent!");
        } catch (error) { toast.error("Failed to retry."); }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!confirm("Are you sure? This is permanent.")) return;
        try {
            await deleteDoc(doc(db, "orders", orderId));
            toast.success("Order deleted");
        } catch (e) { toast.error("Delete failed"); }
    }

    const handleManualFulfill = async () => {
        if (!selectedOrder || !trackingInput) return;
        setActionLoading(true);
        try {
            await updateDoc(doc(db, "orders", selectedOrder.id), {
                status: "shipped",
                providerStatus: "manual",
                providerData: {
                    provider: "manual",
                    trackingUrl: trackingInput,
                    trackingCode: "MANUAL-ENTRY",
                    estimatedDelivery: new Date(Date.now() + 7 * 86400000).toISOString()
                }
            });
            toast.success("Marked as Shipped!");
            setSelectedOrder(null);
            setTrackingInput("");
        } catch (error) { toast.error("Update failed."); }
        finally { setActionLoading(false); }
    };

    // --- HELPDESK ACTIONS ---
    const handleSelectTicket = async (ticket: any) => {
        setSelectedTicket(ticket);
        setTicketOrderContext(null);
        const foundOrder = orders.find(o => o.id === ticket.orderId);
        if (foundOrder) setTicketOrderContext(foundOrder);
    };

    const handleSendReply = async () => {
        if (!selectedTicket || !replyInput.trim()) return;
        setActionLoading(true);
        try {
            const ticketRef = doc(db, "support_tickets", selectedTicket.id);
            await updateDoc(ticketRef, {
                messages: arrayUnion({ sender: "admin", text: replyInput, timestamp: new Date().toISOString() }),
                status: "responded",
                lastUpdated: serverTimestamp()
            });
            setReplyInput("");
            toast.success("Reply sent!");
        } catch (error) { toast.error("Failed to send reply"); }
        finally { setActionLoading(false); }
    };

    const handleUpdateTicketStatus = async (status: string) => {
        if (!selectedTicket) return;
        try {
            await updateDoc(doc(db, "support_tickets", selectedTicket.id), { status });
            toast.success(`Ticket marked as ${status}`);
            setSelectedTicket((prev: any) => ({ ...prev, status }));
        } catch (error) { toast.error("Status update failed"); }
    };

    // --- FILTERS ---
    const filteredOrders = orders.filter(o =>
    (o.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.shippingAddress?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const codPendingOrders = filteredOrders.filter(o =>
        (o.payment?.method === 'cod' || o.isCod === true) &&
        !['placed', 'shipped', 'delivered', 'cancelled'].includes(o.status)
    );

    const reviewPendingOrders = filteredOrders.filter(o => o.providerStatus === 'pending_admin_approval');

    // 🟢 UPDATED: Hide review orders from the standard live view
    const activeOrders = filteredOrders.filter(o =>
        !codPendingOrders.includes(o) && o.providerStatus !== 'pending_admin_approval'
    );
    const openTickets = tickets.filter(t => t.status !== 'closed');

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20 bg-[#0f172a] text-slate-100 overflow-x-hidden">

            {/* 🟢 VIEW ORDER MODAL */}
            <OrderDetailsModal
                order={viewOrder}
                isOpen={!!viewOrder}
                onClose={() => setViewOrder(null)}
                onApproveBulk={handleApproveBulkOrder}
            />

            {/* 🟠 MANUAL FULFILL MODAL */}
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white w-[95vw] max-w-md mx-auto rounded-xl">
                    <DialogHeader><DialogTitle>Manual Override: {selectedOrder?.orderId}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tracking URL / Number</Label>
                            <Input
                                placeholder="e.g., https://bluedart.com/track/12345"
                                value={trackingInput}
                                onChange={(e) => setTrackingInput(e.target.value)}
                                className="bg-slate-800 border-slate-600 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                        <Button variant="ghost" onClick={() => setSelectedOrder(null)}>Cancel</Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleManualFulfill}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="animate-spin mr-2" /> : <Truck className="mr-2 h-4 w-4" />} Mark Shipped
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <Terminal className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
                        <span className="truncate">Admin Command</span>
                    </h1>
                    <p className="text-sm text-slate-400">Orders, Bots & Support</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search Orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-900 border-slate-700 text-white focus:ring-orange-500 w-full"
                    />
                </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Live Orders" value={activeOrders.length} icon={Copy} color="text-blue-400" />
                <StatCard label="COD Pending" value={codPendingOrders.length} icon={IndianRupee} color="text-orange-400" />
                <StatCard label="Bot Errors" value={orders.filter(o => o.providerStatus === 'error').length} icon={AlertCircle} color="text-red-400" />
                <StatCard label="Open Tickets" value={openTickets.length} icon={MessageSquare} color="text-purple-400" />
            </div>

            {/* TABS */}
            <Tabs defaultValue="live" className="w-full">
                <TabsList className="bg-slate-900 border border-slate-800 w-full md:w-auto overflow-x-auto justify-start">
                    <TabsTrigger value="live" className="flex-1 text-white">Live Operations</TabsTrigger>
                    <TabsTrigger value="cod" className="flex-1 text-white relative">
                        COD Queue
                        {codPendingOrders.length > 0 && <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-pulse">{codPendingOrders.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="reviews" className="flex-1 text-white relative">
                        Action Needed
                        {reviewPendingOrders.length > 0 && <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white animate-pulse">{reviewPendingOrders.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="support" className="flex-1 text-white relative">
                        Helpdesk
                        {openTickets.length > 0 && <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] text-white">{openTickets.length}</span>}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="live" className="mt-4">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="px-4 py-4"><CardTitle className="text-white">Active Orders</CardTitle></CardHeader>
                        <CardContent className="p-0 md:p-6 pt-0">
                            <OrderTable
                                data={activeOrders}
                                loading={loading}
                                onRetry={handleRetryBot}
                                onEdit={(o: any) => setSelectedOrder(o)}
                                onView={(o: any) => setViewOrder(o)}
                                onDelete={handleDeleteOrder}
                                type="live"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cod" className="mt-4">
                    <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-orange-500">
                        <CardHeader className="px-4 py-4"><CardTitle className="text-white">COD Queue</CardTitle></CardHeader>
                        <CardContent className="p-0 md:p-6 pt-0">
                            <OrderTable
                                data={codPendingOrders}
                                loading={loading}
                                onApprove={handleApproveCOD}
                                onView={(o: any) => setViewOrder(o)}
                                onDelete={handleDeleteOrder}
                                type="cod"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reviews" className="mt-4">
                    <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-orange-500">
                        <CardHeader className="px-4 py-4"><CardTitle className="text-white">Bulk Orders Pending Review</CardTitle></CardHeader>
                        <CardContent className="p-0 md:p-6 pt-0">
                            <OrderTable
                                data={reviewPendingOrders}
                                loading={loading}
                                onView={(o: any) => setViewOrder(o)}
                                onDelete={handleDeleteOrder}
                                type="reviews"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HELPDESK (Keep existing code, simplified for brevity here, but ensure it's fully present) */}
                <TabsContent value="support" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
                        <Card className="lg:col-span-4 bg-slate-900 border-slate-800 flex flex-col h-full">
                            <CardHeader className="pb-3 border-b border-slate-800"><CardTitle className="text-white text-lg">Inbox</CardTitle></CardHeader>
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-2">
                                    {openTickets.map(ticket => (
                                        <div key={ticket.id} onClick={() => handleSelectTicket(ticket)} className={`p-3 rounded-lg cursor-pointer border ${selectedTicket?.id === ticket.id ? "bg-slate-800 border-purple-500" : "bg-slate-950 border-slate-800"}`}>
                                            <div className="flex justify-between mb-1">
                                                <Badge variant="outline" className="text-white">{ticket.type}</Badge>
                                                <span className="text-[10px] text-slate-500">{ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'Now'}</span>
                                            </div>
                                            <h4 className="text-sm font-semibold text-white">{ticket.orderNumber}</h4>
                                            <p className="text-xs text-slate-400 line-clamp-2">{ticket.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </Card>
                        <Card className="lg:col-span-8 bg-slate-900 border-slate-800 flex flex-col h-full">
                            {!selectedTicket ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <MessageSquare className="h-12 w-12 mb-4 opacity-20" /><p>Select a ticket</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 border-b border-slate-800 flex justify-between bg-slate-950">
                                        <h3 className="text-white font-bold">{selectedTicket.type} #{selectedTicket.orderNumber}</h3>
                                        <Button size="sm" variant="outline" className="text-white hover:text-black" onClick={() => handleUpdateTicketStatus('closed')}><XCircle className="h-3 w-3 hover:text-black text-white mr-1" /> Close</Button>
                                    </div>
                                    <div className="flex-1 flex overflow-hidden">
                                        <div className="flex-1 flex flex-col border-r border-slate-800">
                                            <ScrollArea className="flex-1 p-4 space-y-4">
                                                <div className="flex gap-3"><Avatar className="h-8 w-8"><AvatarFallback>U</AvatarFallback></Avatar><div className="bg-slate-800 p-3 rounded-r-xl rounded-bl-xl text-sm text-slate-300">{selectedTicket.description}</div></div>
                                                {selectedTicket.messages?.map((msg: any, i: number) => (
                                                    <div key={i} className={`flex gap-3 ${msg.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                                                        <Avatar className="h-8 w-8"><AvatarFallback className={msg.sender === 'admin' ? 'bg-purple-900' : 'bg-slate-700'}>{msg.sender === 'admin' ? 'A' : 'U'}</AvatarFallback></Avatar>
                                                        <div className={`p-3 rounded-xl text-sm max-w-[85%] ${msg.sender === 'admin' ? 'bg-purple-600/20 text-purple-100' : 'bg-slate-800 text-slate-200'}`}>{msg.text}</div>
                                                    </div>
                                                ))}
                                            </ScrollArea>
                                            <div className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
                                                <Textarea placeholder="Reply..." value={replyInput} onChange={(e) => setReplyInput(e.target.value)} className="min-h-[50px] bg-slate-900 border-slate-700" />
                                                <Button onClick={handleSendReply} disabled={actionLoading} className="bg-purple-600 hover:bg-purple-700">{actionLoading ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                                            </div>
                                        </div>
                                        <div className="w-64 bg-slate-950 p-4 space-y-4 hidden xl:block">
                                            {ticketOrderContext ? (
                                                <div className="space-y-4">
                                                    <div className="rounded border border-slate-800 bg-slate-900 p-2">
                                                        <img src={ticketOrderContext.thumbnail || ticketOrderContext.image} className="w-full h-24 object-contain bg-white rounded mb-2" />
                                                        <p className="font-bold text-white text-xs">{ticketOrderContext.title}</p>
                                                        <Button size="sm" className="w-full mt-2 h-7 text-xs" variant="secondary" onClick={() => setViewOrder(ticketOrderContext)}>View Full Order</Button>
                                                    </div>
                                                </div>
                                            ) : <p className="text-xs text-slate-500">No order context.</p>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ------------------------------------------------------------------
// 📄 SUB-COMPONENT: ORDER DETAILS MODAL (The New Feature)
// ------------------------------------------------------------------
function OrderDetailsModal({ order, isOpen, onClose, onApproveBulk }: any) {
    if (!order) return null;

    // Helper to get Invoice URL (Standardized path or saved URL)
    const getInvoiceUrl = () => {
        if (order.invoiceUrl) return order.invoiceUrl;
        // Construct standard path if we know it exists
        // Note: Direct construction requires the bucket domain. 
        // Best to rely on the backend saving 'invoiceUrl' to the doc.
        // For now, we return null if not explicitly saved, OR assume standard bucket if you configured it.
        // Let's assume standard bucket link pattern if 'invoiceSent' is true.
        if (order.invoiceSent || order.status === 'delivered') {
            const bucket = "tryam-5bff4.firebasestorage.app"; // Replace if different
            const fileName = `invoices%2FINV-${order.groupId || order.orderId}.pdf`;
            return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${fileName}?alt=media`;
        }
        return null;
    };

    const invoiceUrl = getInvoiceUrl();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                Order #{order.orderId || order.id.slice(0, 6)}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Placed on {order.createdAt ? formatDate(order.createdAt) : 'N/A'}
                            </DialogDescription>
                        </div>
                        <StatusBadge status={order.providerStatus} globalStatus={order.status} />
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* CUSTOMER INFO */}
                    <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Terminal className="h-3 w-3" /> Customer</h4>
                        <div className="text-sm space-y-1">
                            <p className="font-semibold text-white">{order.shippingAddress?.fullName}</p>
                            <p className="text-slate-400">{order.shippingAddress?.email}</p>
                            <p className="text-slate-400">{order.shippingAddress?.phone}</p>
                            <div className="pt-2 border-t border-slate-800 mt-2">
                                <p className="text-slate-300">{order.shippingAddress?.line1}</p>
                                <p className="text-slate-300">{order.shippingAddress?.city}, {order.shippingAddress?.zip}</p>
                                <p className="text-slate-300">{order.shippingAddress?.countryCode}</p>
                            </div>
                        </div>
                    </div>

                    {/* PAYMENT & LOGISTICS */}
                    <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><IndianRupee className="h-3 w-3" /> Payment & Shipping</h4>
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Method</span>
                                <Badge variant="outline" className="text-white capitalize">{order.payment?.method}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Total</span>
                                <span className="font-bold text-green-400">₹{order.quantity * order.price}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-800 mt-2 space-y-1">
                                <span className="text-xs text-slate-500 uppercase font-bold">Provider</span>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-blue-900 text-blue-200 hover:bg-blue-900">{order.provider || 'Pending'}</Badge>
                                    {order.providerOrderId && <span className="text-xs text-slate-500">#{order.providerOrderId}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Items</h4>
                    <div className="rounded-lg border border-slate-800 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-900">
                                <TableRow>
                                    <TableHead className="text-xs">Product</TableHead>
                                    <TableHead className="text-xs">Variant</TableHead>
                                    <TableHead className="text-xs text-right">Qty</TableHead>
                                    <TableHead className="text-xs text-right">Files</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="flex items-center gap-3">
                                        <img src={order.thumbnail || order.image} className="h-8 w-8 rounded bg-white object-contain" />
                                        <span className="text-sm font-medium text-white">{order.title}</span>
                                    </TableCell>
                                    <TableCell className="text-slate-400 text-xs">
                                        {order.variant?.color} / {order.variant?.size}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{order.quantity}</TableCell>
                                    <TableCell className="text-right">
                                        {order.printFiles?.front && (
                                            <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
                                                <a href={order.printFiles.front} target="_blank" download><Download className="h-3 w-3" /></a>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-slate-800 pt-4">
                    <div className="flex-1 flex justify-start">
                        {invoiceUrl && (
                            <Button variant="outline" className="border-green-800/50 text-green-400 bg-green-900/10 hover:bg-green-900/20" asChild>
                                <a href={invoiceUrl} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-4 w-4 mr-2" /> Download Invoice
                                </a>
                            </Button>
                        )}
                        {!invoiceUrl && (order.status === 'placed' || order.status === 'processing') && (
                            <span className="text-xs text-slate-500 flex items-center ml-2">Invoice generates after delivery</span>
                        )}
                    </div>
                    
                    {/* 🟢 NEW: The Bulk Approval Button */}
                    {order.providerStatus === 'pending_admin_approval' && (
                        <Button 
                            onClick={() => onApproveBulk(order.id)}
                            className="bg-orange-600 hover:bg-orange-700 text-white mr-2"
                        >
                            <CheckCircle className="h-4 w-4 mr-2" /> Approve & Fulfill
                        </Button>
                    )}

                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- SUB-COMPONENT: ORDER TABLE (Updated with Buttons) ---
function OrderTable({ data, loading, type, onRetry, onEdit, onApprove, onDelete, onView }: any) {
    if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" /></div>;
    if (data.length === 0) return <div className="p-8 text-center text-slate-500">No orders found.</div>;
    const handleCopy = async (phone: string) => {
        // Modern Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(phone);
                toast.success("Phone Number copied to clipboard!");
                return;
            } catch (err) {
                console.error("Clipboard API failed, falling back...", err);
            }
        }

        // Fallback for older browsers / mobile
        const textarea = document.createElement("textarea");
        textarea.value = phone;
        textarea.style.position = "fixed"; // prevents scrolling
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            document.execCommand("copy");
            toast.success("Phone Number copied to clipboard!");
        } catch (err) {
            console.error("Fallback copy failed", err);
            toast.error("Failed to copy!");
        } finally {
            document.body.removeChild(textarea);
        }
    };

    return (
        <div className="overflow-x-auto w-full">
            <Table className="min-w-[900px] text-sm">
                <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-slate-900">
                        <TableHead className="text-slate-400 w-[100px]">Order ID</TableHead>
                        <TableHead className="text-slate-400 w-[180px]">Customer</TableHead>
                        <TableHead className="text-slate-400 w-[100px]">Amount</TableHead>
                        <TableHead className="text-slate-400 w-[120px]">Status</TableHead>
                        {type === 'live' && <TableHead className="text-slate-400 w-[100px]">Provider</TableHead>}
                        <TableHead className="text-right text-slate-400 w-[200px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((order: any) => (
                        <TableRow key={order.id} className="border-slate-800 hover:bg-slate-800/50">
                            <TableCell className="font-mono text-slate-300">
                                <div>{order.orderId || order.id.slice(0, 6)}</div>
                            </TableCell>
                            <TableCell>
                                <div className="text-white font-medium truncate max-w-[160px]">{order.shippingAddress?.fullName || "Guest"}</div>
                                <div className="text-xs text-slate-500 truncate max-w-[160px]">{order.shippingAddress?.phone}</div>
                            </TableCell>
                            <TableCell className="text-white font-bold">₹{order.quantity * order.price || 0}</TableCell>
                            <TableCell>
                                {type === 'cod' ? <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">Pending Verify</Badge>
                                    : <StatusBadge status={order.providerStatus} error={order.botError} globalStatus={order.status} />}
                            </TableCell>
                            {type === 'live' && (
                                <TableCell className="text-slate-300 text-sm">
                                    {order.provider ? <div className="flex items-center gap-1 uppercase font-bold text-xs"><CheckCircle className="h-3 w-3 text-green-500" /> {order.provider}</div> : <span className="text-slate-600">-</span>}
                                </TableCell>
                            )}
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    {/* 👁️ VIEW DETAILS BUTTON (ALL TABS) */}
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => onView(order)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>

                                    {/* ACTIONS PER TAB */}
                                    {type === 'cod' && (
                                        <>
                                            <Button size="sm" title="Copy" className="h-8 bg-transparent hover:bg-transparent text-white" onClick={() => handleCopy(order.shippingAddress?.phone)}>
                                                <Copy className="h-3 w-3 mr-1" />
                                            </Button>
                                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => onApprove(order.id)}>
                                                <CheckCircle className="h-3 w-3 mr-1" /> Approve
                                            </Button>
                                        </>
                                    )}

                                    {type === 'live' && (order.providerStatus === 'error' || order.providerStatus === 'processing') && (
                                        <Button size="sm" variant="outline" className="h-8 border-yellow-600/50 text-yellow-500" onClick={() => onRetry(order.id)}>
                                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                                        </Button>
                                    )}

                                    {type === 'live' && (
                                        <Button size="sm" variant="secondary" className="h-8 bg-slate-800 text-slate-300 hover:text-white" onClick={() => onEdit(order)}>Edit</Button>
                                    )}

                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-900 hover:bg-red-900/20 hover:text-red-500" onClick={() => onDelete(order.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// Keep Helper Components (StatCard, StatusBadge) exactly as they were...
function StatCard({ label, value, icon: Icon, color }: any) {
    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 md:p-6 flex items-center justify-between">
                <div><p className="text-slate-500 text-xs md:text-sm font-medium">{label}</p><h3 className="text-2xl md:text-3xl font-bold text-white mt-1">{value}</h3></div>
                <div className={`p-3 rounded-full bg-slate-800 ${color}`}><Icon className="h-5 w-5 md:h-6 md:w-6" /></div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status, error, globalStatus }: { status: string, error?: string, globalStatus?: string }) {
    if (globalStatus === 'shipped') return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Shipped</Badge>;
    if (globalStatus === 'delivered') return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Delivered</Badge>;
    if (status === 'synced') return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Synced</Badge>;
    if (status === 'manual') return <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Manual</Badge>;
    if (status === 'error') return <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/20">Bot Error</Badge>;
    
    // 🟢 NEW: The pulsating Needs Review badge
    if (status === 'pending_admin_approval') return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse">Needs Review</Badge>;
    
    if (status === 'processing') return <Badge variant="outline" className="text-yellow-400 border-yellow-500/20 animate-pulse">Processing...</Badge>;
    return <Badge variant="secondary" className="bg-slate-800 text-slate-400">Pending</Badge>;
}