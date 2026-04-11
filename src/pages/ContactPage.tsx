import { useState } from "react";
import { Link } from "react-router";
import {
  Mail, MapPin, Phone, Send, Loader2, MessageSquare,
  Menu, ArrowUpRight, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Footer from "@/components/Footer";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    toast.success("Message sent successfully!", {
      description: "We'll get back to you within 24 hours."
    });
  };

  return (
    <div className="min-h-screen relative flex flex-col font-sans selection:bg-orange-500 selection:text-white bg-[#0f172a]">

      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10 w-full h-full bg-[#0f172a]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[50%] rounded-full bg-orange-600/20 blur-[100px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* HEADER */}
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
                to={item === "Catalog" ? "/store" : item === "Designs" ? "/designs" : `/${item.toLowerCase()}`}
                className={`text-sm font-medium transition-colors relative group ${item === "Contact" ? "text-orange-400" : "text-slate-300 hover:text-orange-400"}`}
              >
                {item}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-orange-500 transition-all ${item === "Contact" ? "w-full" : "w-0 group-hover:w-full"}`}></span>
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
                    <Link to="/help" className="text-lg text-slate-300">Help Center</Link>
                    <Link to="/contact" className="text-lg text-orange-400">Contact</Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-20">

        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            <MessageSquare className="w-4 h-4" /> We'd love to hear from you
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            Get in touch
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Have a question about the design tool, enterprise pricing, or custom orders? Our team is ready to answer your questions.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">

          {/* LEFT: INFO CARDS */}
          <div className="space-y-6 lg:col-span-1">
            {[
              { icon: Mail, title: "Email Us", desc: "Our friendly team is here to help.", link: "support@tryam193.in", color: "text-blue-400", bg: "bg-blue-500/10" },
              { icon: MapPin, title: "Office", desc: "Come say hello at our office HQ.", link: "#150/4 14th Main Road Kalidasa Layout Srinagar", color: "text-purple-400", bg: "bg-purple-500/10" },
              { icon: Phone, title: "Phone", desc: "Mon-Fri from 8am to 5pm.", link: "+91 82170 37173", color: "text-orange-400", bg: "bg-orange-500/10" }
            ].map((item, i) => (
              <Card key={i} className="bg-white/5 border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <CardContent className="p-6">
                  <div className={`h-12 w-12 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-1">{item.title}</h3>
                  <p className="text-slate-400 text-sm mb-3">{item.desc}</p>
                  <span className={`font-semibold ${item.color}`}>{item.link}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* RIGHT: CONTACT FORM */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 md:p-10 backdrop-blur-xl relative overflow-hidden group">

              {/* Glow effect inside form */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -z-10"></div>

              <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="first-name" className="text-slate-300">First name</Label>
                    <Input id="first-name" placeholder="John" className="bg-slate-950/50 border-white/10 text-white h-12" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name" className="text-slate-300">Last name</Label>
                    <Input id="last-name" placeholder="Doe" className="bg-slate-950/50 border-white/10 text-white h-12" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" className="bg-slate-950/50 border-white/10 text-white h-12" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-slate-300">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us how we can help..."
                    className="min-h-[160px] bg-slate-950/50 border-white/10 text-white resize-none p-4"
                    required
                  />
                </div>

                <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="mr-2 h-5 w-5" /> Send Message</>
                  )}
                </Button>
              </form>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}