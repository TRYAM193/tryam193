import { motion } from "framer-motion";
import { Link } from "react-router";
import { ArrowUpRight, Flame, Heart, Zap, Globe, Users, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6 },
});

const stats = [
  { value: "100+", label: "Founding Creators", icon: Users },
  { value: "10K+", label: "Designs Created", icon: Sparkles },
  { value: "India", label: "Nationwide Shipping", icon: Globe },
  { value: "AI-First", label: "Design Platform", icon: Zap },
];

const values = [
  {
    icon: Flame,
    color: "from-orange-500 to-red-600",
    glow: "rgba(249,115,22,0.15)",
    title: "Creator-First",
    desc: "We built TRYAM for the creators, the dreamers, the self-starters. Every feature is designed to give YOU full control over your vision — no gatekeeping, no design degree required.",
  },
  {
    icon: Zap,
    color: "from-blue-500 to-indigo-600",
    glow: "rgba(59,130,246,0.15)",
    title: "AI-Powered",
    desc: "From generating artwork to smart layout suggestions, our AI engine accelerates your creativity. Describe your idea in words — TRYAM's AI handles the rest.",
  },
  {
    icon: Heart,
    color: "from-pink-500 to-rose-600",
    glow: "rgba(236,72,153,0.15)",
    title: "Made with Love",
    desc: "We're a small team deeply passionate about what we build. Every update, every feature, every pixel is crafted with care — because your merch deserves the best.",
  },
  {
    icon: Target,
    color: "from-emerald-500 to-teal-600",
    glow: "rgba(16,185,129,0.15)",
    title: "Quality Obsessed",
    desc: "We partner with premium print providers across India to ensure every order that leaves our fulfillment comes out crisp, vibrant, and durable — every single time.",
  },
];

const team = [
  {
    name: "The TRYAM Team",
    role: "Builders & Creators, Bengaluru",
    desc: "A passionate team of designers, engineers, and merch enthusiasts building India's most loved custom apparel platform — one drop at a time.",
    avatar: "https://harmless-tapir-303.convex.cloud/api/storage/1a8853ff-ebac-480a-b68b-ffe2343bbf07",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col font-sans selection:bg-orange-500 selection:text-white">

      {/* Background — same cosmic theme */}
      <div className="fixed inset-0 -z-10 w-full h-full bg-[#0f172a]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[60%] rounded-full bg-blue-600/15 blur-[120px] animate-pulse" />
        <div className="absolute top-[30%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-600/15 blur-[100px] animate-pulse delay-1000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[30%] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse delay-2000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
      </div>

      {/* Header / Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0f172a]/70 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-orange-500 rounded-full blur opacity-25 group-hover:opacity-50 transition" />
              <img
                src="https://harmless-tapir-303.convex.cloud/api/storage/1a8853ff-ebac-480a-b68b-ffe2343bbf07"
                alt="TRYAM Logo"
                className="relative h-10 w-10 object-cover rounded-full shadow-lg ring-1 ring-white/20"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">TRYAM</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: "Catalog", to: "/store" },
              { label: "Designs", to: "/designs" },
              { label: "About", to: "/about" },
              { label: "Help", to: "/help" },
              { label: "Contact", to: "/contact" },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all group-hover:w-full" />
              </Link>
            ))}
          </nav>
          <Link to="/auth">
            <Button className="rounded-full px-6 h-10 bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg hover:scale-105 active:scale-95 transition-all border-0">
              Get Started <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 relative z-10">

        {/* ── HERO ── */}
        <section className="pt-24 pb-20 px-4 text-center">
          <div className="container mx-auto max-w-4xl space-y-6">
            <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-900/20 text-sm font-medium text-orange-200">
              <Flame className="h-3.5 w-3.5 text-orange-400 fill-orange-400 animate-pulse" />
              Our Story
            </motion.div>

            <motion.h1 {...fadeUp(0.1)} className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter text-white leading-[1.1]">
              We're Building{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-orange-400">
                India's Merch Revolution
              </span>
            </motion.h1>

            <motion.p {...fadeUp(0.2)} className="text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
              TRYAM is a custom merch platform based in India that allows users to design and order personalized apparel online.
              Available at tryam193.in, TRYAM combines creativity with an AI-powered design tool to make custom T-shirts,
              hoodies, and merchandise accessible to everyone.
            </motion.p>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="pb-24 px-4">
          <div className="container mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {stats.map(({ value, label, icon: Icon }) => (
                <div
                  key={label}
                  className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 text-center group hover:border-orange-500/30 transition-all hover:-translate-y-1"
                >
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-orange-500 group-hover:text-white transition-all text-orange-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-extrabold text-white mb-1">{value}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── STORY ── */}
        <section className="py-24 px-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          <div className="container mx-auto max-w-5xl">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider">
                  <div className="w-8 h-px bg-blue-400" /> Our Origin
                </div>
                <h2 className="text-4xl font-bold text-white leading-tight">
                  Born in Bengaluru,<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                    Built for Every Creator
                  </span>
                </h2>
                <p className="text-slate-400 leading-relaxed">
                  It started in a dorm room in Bengaluru — a group of students frustrated by how hard it
                  was to get quality custom merch made for their community. Every option was either too expensive,
                  too slow, or too complicated.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  So we built TRYAM. A platform where you open the editor, design in minutes using our AI tools,
                  and let us handle the rest — printing, packaging, and shipping across India. No minimums,
                  no design knowledge required, no compromise on quality.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Today, TRYAM (also known as TRYAM193 at{" "}
                  <a href="https://tryam193.in" className="text-orange-400 hover:underline">tryam193.in</a>)
                  {" "}serves thousands of creators, student clubs, sports teams, and entrepreneurs who believe
                  their brand deserves to be worn.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-orange-500/20 rounded-[2rem] blur-xl" />
                <div className="relative rounded-[2rem] border border-white/10 overflow-hidden bg-slate-900/60 backdrop-blur-md p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-900/30">
                      <Flame className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">TRYAM</p>
                      <p className="text-slate-400 text-sm">tryam193.in</p>
                    </div>
                  </div>
                  <blockquote className="text-slate-300 italic text-lg leading-relaxed border-l-2 border-orange-500 pl-4">
                    "Every creator deserves a platform to wear their imagination. That's why we built TRYAM."
                  </blockquote>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex -space-x-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={`w-8 h-8 rounded-full border-2 border-slate-900 bg-gradient-to-br ${["from-blue-400 to-indigo-600", "from-orange-400 to-red-600", "from-emerald-400 to-teal-600", "from-pink-400 to-rose-600"][i]
                          }`} />
                      ))}
                    </div>
                    <p className="text-slate-400 text-sm">100+ Founding Creators and counting</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── VALUES ── */}
        <section className="py-24 px-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16 space-y-4">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-orange-400 uppercase tracking-wider"
              >
                <div className="w-8 h-px bg-orange-400" /> What We Stand For
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-bold text-white tracking-tight"
              >
                Our Core Values
              </motion.h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {values.map(({ icon: Icon, color, glow, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 group hover:border-white/10 transition-all hover:-translate-y-1"
                  style={{ boxShadow: `0 0 0 0 ${glow}` }}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TEAM ── */}
        <section className="py-24 px-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
          <div className="container mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-8"
            >
              <div className="w-8 h-px bg-indigo-400" /> Behind TRYAM
            </motion.div>
            {team.map(({ name, role, desc, avatar }) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-3xl p-10 flex flex-col items-center gap-5"
              >
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-orange-500 rounded-full blur opacity-40" />
                  <img src={avatar} alt={name} className="relative w-20 h-20 rounded-full object-cover ring-2 ring-white/20" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{name}</h3>
                  <p className="text-orange-400 text-sm mt-1">{role}</p>
                </div>
                <p className="text-slate-400 leading-relaxed max-w-xl">{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-[2rem] md:rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden border border-white/10 shadow-2xl group"
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-500/30 transition-all duration-700" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 group-hover:bg-blue-600/30 transition-all duration-700" />
              <div className="relative z-10 space-y-6">
                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  Ready to Wear Your Vision?
                </h2>
                <p className="text-blue-100/70 max-w-xl mx-auto font-light">
                  Join thousands of creators already using TRYAM to design, produce, and ship custom merch across India.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                  <Link to="/store">
                    <Button size="lg" className="rounded-full px-10 h-14 font-bold bg-white text-slate-900 hover:bg-orange-50 hover:scale-105 transition-all shadow-xl">
                      Browse Collection
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="lg" variant="ghost" className="rounded-full px-10 h-14 font-bold text-white border border-white/20 hover:bg-white/10 hover:scale-105 transition-all">
                      Start Designing <ArrowUpRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
