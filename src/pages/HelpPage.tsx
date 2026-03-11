import { useState } from "react";
import { Link } from "react-router";
import { 
  Search, Package, Truck, PenTool, RefreshCcw, 
  HelpCircle, MessageCircle, Menu, ArrowUpRight 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Footer from "@/components/Footer";

// --- REUSE FAQ DATA ---
const FAQ_CATEGORIES = [
  {
    id: "orders",
    icon: Package,
    title: "Orders & Billing",
    questions: [
      { q: "Can I change my order after placing it?", a: "Orders are sent to production immediately. You have a 1-hour window to cancel or edit via the 'Orders' page." },
      { q: "Where can I find my invoice?", a: "Invoices are emailed to you upon purchase and are also available in the Order Details page." },
      { q: "What payment methods do you accept?", a: "We accept Visa, Mastercard, American Express, UPI (India), and PayPal." }
    ]
  },
  {
    id: "shipping",
    icon: Truck,
    title: "Shipping & Delivery",
    questions: [
      { q: "How long does shipping take?", a: "Standard shipping takes 5-7 business days. Express shipping (2-3 days) is available for select locations." },
      { q: "How do I track my package?", a: "Go to 'Orders', select your order, and click the 'Track Package' button." }
    ]
  },
  {
    id: "design",
    icon: PenTool,
    title: "Design Tool",
    questions: [
      { q: "What file formats do you support?", a: "We support PNG and JPG. For best results, use transparent PNGs at 300 DPI." },
      { q: "Can I use copyrighted images?", a: "No. You must own the rights to any image you upload. We reserve the right to cancel orders violating IP laws." }
    ]
  },
  {
    id: "returns",
    icon: RefreshCcw,
    title: "Returns & Refunds",
    questions: [
      { q: "What is your return policy?", a: "Since items are custom printed, we only offer refunds for defective or damaged goods reported within 14 days." },
      { q: "My item arrived damaged.", a: "Please contact support immediately with photos of the damage. We will send a replacement free of charge." }
    ]
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = FAQ_CATEGORIES.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q => 
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <div className="min-h-screen relative flex flex-col font-sans selection:bg-orange-500 selection:text-white bg-[#0f172a]">
      
      {/* BACKGROUND (Same as Landing) */}
      <div className="fixed inset-0 -z-10 w-full h-full bg-[#0f172a]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[50%] rounded-full bg-orange-600/20 blur-[100px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* HEADER (Same as Landing) */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0f172a]/70 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-orange-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
              <img src="https://harmless-tapir-303.convex.cloud/api/storage/1a8853ff-ebac-480a-b68b-ffe2343bbf07" alt="TRYAM" className="relative h-10 w-10 object-cover rounded-full" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">TRYAM</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {["Catalog", "Designs", "Help", "Contact"].map((item) => (
              <Link 
                key={item} 
                to={item === "Catalog" ? "/store" : item === "Designs" ? "/dashboard/designs" : `/${item.toLowerCase()}`} 
                className={`text-sm font-medium transition-colors relative group ${item === "Help" ? "text-orange-400" : "text-slate-300 hover:text-orange-400"}`}
              >
                {item}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-orange-500 transition-all ${item === "Help" ? "w-full" : "w-0 group-hover:w-full"}`}></span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
             <Link to="/auth" className="hidden sm:block"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full">Sign In</Button></Link>
             <Link to="/dashboard"><Button className="rounded-full bg-gradient-to-r from-orange-600 to-red-600 text-white border-0">Get Started <ArrowUpRight className="ml-2 w-4 h-4" /></Button></Link>
             
             {/* Mobile Menu */}
             <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild><Button variant="ghost" size="icon" className="text-white"><Menu /></Button></SheetTrigger>
                  <SheetContent side="right" className="bg-[#0f172a] border-white/10 p-6">
                    <div className="flex flex-col gap-6 mt-10">
                      <Link to="/store" className="text-lg text-slate-300">Catalog</Link>
                      <Link to="/help" className="text-lg text-orange-400">Help Center</Link>
                      <Link to="/contact" className="text-lg text-slate-300">Contact</Link>
                    </div>
                  </SheetContent>
                </Sheet>
             </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-20">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            How can we help you?
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Search our knowledge base or browse frequently asked questions below.
          </p>

          <div className="max-w-xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                placeholder="Search for answers (e.g. 'shipping', 'refund')..." 
                className="pl-12 h-14 bg-slate-900 border-white/10 text-white placeholder:text-slate-500 rounded-full text-lg focus:ring-orange-500/50 shadow-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
          </div>
        </div>

        {/* Categories Grid (Hidden when searching) */}
        {!searchQuery && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
            {FAQ_CATEGORIES.map((cat) => (
                <Card key={cat.id} className="bg-white/5 border-white/5 hover:border-orange-500/30 hover:bg-white/10 transition-all cursor-pointer group backdrop-blur-sm">
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform shadow-lg">
                        <cat.icon className="h-7 w-7 text-slate-400 group-hover:text-orange-400 transition-colors" />
                    </div>
                    <h3 className="font-bold text-slate-200 text-lg">{cat.title}</h3>
                </CardContent>
                </Card>
            ))}
            </div>
        )}

        {/* FAQs */}
        <div className="max-w-3xl mx-auto space-y-10">
          {filteredCategories.map((cat) => (
            <div key={cat.id} className="space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <cat.icon className="h-6 w-6 text-orange-500" />
                {cat.title}
              </h2>
              <div className="space-y-3">
                  {cat.questions.map((faq, i) => (
                    <Card key={i} className="bg-slate-800/30 border-white/5 overflow-hidden backdrop-blur-sm">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value={`item-${i}`} className="border-0">
                          <AccordionTrigger className="px-6 py-4 text-slate-200 hover:text-white hover:no-underline text-left text-base">
                            {faq.q}
                          </AccordionTrigger>
                          <AccordionContent className="px-6 pb-6 text-slate-400 text-base leading-relaxed">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
          
          {filteredCategories.length === 0 && (
             <div className="text-center py-20">
                 <p className="text-slate-400 text-lg">No results found for "{searchQuery}"</p>
                 <Button variant="link" onClick={() => setSearchQuery("")} className="text-orange-400">Clear Search</Button>
             </div>
          )}
        </div>

        {/* Contact CTA */}
        <div className="mt-24 bg-gradient-to-br from-slate-900 to-blue-950 border border-white/10 rounded-3xl p-10 md:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px]"></div>
            <div className="relative z-10 space-y-6">
                <h3 className="text-3xl font-bold text-white">Still need help?</h3>
                <p className="text-slate-300 max-w-lg mx-auto text-lg">
                    Can't find the answer you're looking for? Our support team is here to help you.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                    <Link to="/contact">
                        <Button size="lg" className="rounded-full bg-white text-slate-900 hover:bg-orange-50 font-bold px-8 h-12">
                            Contact Support
                        </Button>
                    </Link>
                </div>
            </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}