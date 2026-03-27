// src/pages/LaunchPage.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import Landing from "./Landing";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "idle" | "countdown" | "launched";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  alpha: number;
  trail: { x: number; y: number }[];
}

interface Star {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COUNTDOWN_FROM = 5;
const LOGO_URL =
  "https://harmless-tapir-303.convex.cloud/api/storage/1a8853ff-ebac-480a-b68b-ffe2343bbf07";

// ─── Particle Engine ──────────────────────────────────────────────────────────
function useParticleCanvas(phase: Phase, countdownNum: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const animFrameRef = useRef<number>(0);
  const phaseRef = useRef(phase);
  const countdownRef = useRef(countdownNum);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { countdownRef.current = countdownNum; }, [countdownNum]);

  const spawnBurst = useCallback((cx: number, cy: number, count = 80) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 3 + Math.random() * 14;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 60 + Math.random() * 80,
        size: 2 + Math.random() * 5,
        hue: Math.random() < 0.5 ? 28 + Math.random() * 20 : 220 + Math.random() * 40,
        alpha: 1,
        trail: [],
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Init stars
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;

    for (let i = 0; i < 600; i++) {
      starsRef.current.push({ x: Math.random() * W - W / 2, y: Math.random() * H - H / 2, z: Math.random() * W, px: 0, py: 0 });
    }

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    let tick = 0;

    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);
      const w = canvas.width, h = canvas.height;
      const isCountdown = phaseRef.current === "countdown";
      const isIdle = phaseRef.current === "idle";

      ctx.fillStyle = "rgba(15, 23, 42, 0.18)";
      ctx.fillRect(0, 0, w, h);

      // Star-warp during countdown
      if (isCountdown) {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        const speed = 8 + (COUNTDOWN_FROM - countdownRef.current) * 6;
        for (const star of starsRef.current) {
          star.z -= speed;
          if (star.z <= 0) {
            star.x = Math.random() * w - w / 2;
            star.y = Math.random() * h - h / 2;
            star.z = w;
          }
          const sx = (star.x / star.z) * w;
          const sy = (star.y / star.z) * h;
          const r = Math.max(0, (1 - star.z / w) * 3.5);
          const bright = Math.floor((1 - star.z / w) * 255);
          ctx.beginPath();
          ctx.moveTo(star.px || sx, star.py || sy);
          ctx.lineTo(sx, sy);
          ctx.strokeStyle = `rgba(${bright},${bright - 20},${Math.min(bright + 50, 255)},${1 - star.z / w})`;
          ctx.lineWidth = r;
          ctx.stroke();
          star.px = sx;
          star.py = sy;
        }
        ctx.restore();
      } else {
        // Gentle twinkling stars when idle
        ctx.save();
        ctx.translate(w / 2, h / 2);
        for (const star of starsRef.current) {
          star.z -= 0.4;
          if (star.z <= 0) { star.x = Math.random() * w - w / 2; star.y = Math.random() * h - h / 2; star.z = w; }
          const sx = (star.x / star.z) * w;
          const sy = (star.y / star.z) * h;
          const r = Math.max(0, (1 - star.z / w) * 2);
          const alpha = (1 - star.z / w) * 0.8;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,210,255,${alpha})`;
          ctx.fill();
          star.px = sx; star.py = sy;
        }
        ctx.restore();
      }

      // Idle ambient pulse particles
      if (isIdle && tick % 3 === 0) {
        const cx = w / 2 + (Math.random() - 0.5) * 40;
        const cy = h / 2 + (Math.random() - 0.5) * 40;
        particlesRef.current.push({
          x: cx, y: cy,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -0.5 - Math.random() * 1.5,
          life: 1, maxLife: 80 + Math.random() * 40,
          size: 1.5 + Math.random() * 2,
          hue: Math.random() < 0.5 ? 35 : 220,
          alpha: 0.5 + Math.random() * 0.4,
          trail: [],
        });
      }

      // Update & draw particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      for (const p of particlesRef.current) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 8) p.trail.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.98;
        p.life -= 1 / p.maxLife;
        p.alpha = p.life;

        // Trail
        for (let i = 0; i < p.trail.length - 1; i++) {
          const t = p.trail[i], tn = p.trail[i + 1];
          const prog = i / p.trail.length;
          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          ctx.lineTo(tn.x, tn.y);
          ctx.strokeStyle = `hsla(${p.hue}, 100%, 75%, ${prog * p.alpha * 0.5})`;
          ctx.lineWidth = p.size * prog;
          ctx.stroke();
        }

        const r = Math.max(0, p.size * p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(0, p.size * 2));
        grd.addColorStop(0, `hsla(${p.hue}, 100%, 95%, ${p.alpha})`);
        grd.addColorStop(1, `hsla(${p.hue}, 100%, 60%, 0)`);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      tick++;
    };

    loop();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return { canvasRef, spawnBurst };
}

// ─── Ring Pulse Animation ─────────────────────────────────────────────────────
const RingPulse = ({ active }: { active: boolean }) => (
  <AnimatePresence>
    {active && [0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute rounded-full border border-orange-500/40 pointer-events-none"
        style={{ inset: `-${(i + 1) * 40}px` }}
        initial={{ opacity: 0.7, scale: 0.9 }}
        animate={{ opacity: 0, scale: 1.5 }}
        transition={{ duration: 1.6, delay: i * 0.4, repeat: Infinity, ease: "easeOut" }}
      />
    ))}
  </AnimatePresence>
);

// ─── Countdown Number ─────────────────────────────────────────────────────────
const CountdownNumber = ({ num }: { num: number | null }) => {
  const display = num === 0 ? "🚀" : num;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={num}
        initial={{ opacity: 0, scale: 3, rotate: -20 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.2, rotate: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, duration: 0.35 }}
        className="text-[10rem] md:text-[14rem] font-black leading-none select-none"
        style={{
          background: num === 0
            ? "linear-gradient(135deg, #f97316, #ef4444, #ec4899)"
            : "linear-gradient(135deg, #60a5fa, #a78bfa, #f97316)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 0 40px rgba(249,115,22,0.7))",
          textShadow: "none",
        }}
      >
        {display}
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main LaunchPage ──────────────────────────────────────────────────────────
export default function LaunchPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [shockwave, setShockwave] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { canvasRef, spawnBurst } = useParticleCanvas(phase, countdownNum ?? COUNTDOWN_FROM);

  // Magnetic button effect
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 150, damping: 15 });
  const springY = useSpring(my, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = buttonRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    mx.set((e.clientX - cx) * 0.35);
    my.set((e.clientY - cy) * 0.35);
  };

  const handleMouseLeave = () => { mx.set(0); my.set(0); };

  const startLaunch = useCallback(() => {
    if (phase !== "idle") return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 120);
    setPhase("countdown");
    setCountdownNum(COUNTDOWN_FROM);
  }, [phase, spawnBurst]);

  useEffect(() => {
    if (phase !== "countdown" || countdownNum === null) return;

    // Burst on each number change
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    spawnBurst(cx, cy, countdownNum === 0 ? 250 : 60 + (COUNTDOWN_FROM - countdownNum) * 20);

    if (countdownNum === 0) {
      // At zero: show 🚀 for a moment, then shockwave → launch (never set -1)
      const timer = setTimeout(() => {
        setShockwave(true);
        setTimeout(() => setPhase("launched"), 900);
      }, 950);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setCountdownNum(n => (n ?? 1) - 1), 950);
    return () => clearTimeout(timer);
  }, [phase, countdownNum, spawnBurst]);

  // Flash effect on countdown tick
  const flashClass = phase === "countdown" ? "brightness-[1.08]" : "";

  return (
    <div className={`relative w-screen h-screen overflow-hidden bg-[#0b1120] ${flashClass}`}>
      {/* ── Particle Canvas ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* ── Gradient overlays ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(59,130,246,0.12) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(249,115,22,0.10) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />

      {/* ── Shockwave ── */}
      <AnimatePresence>
        {shockwave && (
          <motion.div
            className="absolute pointer-events-none rounded-full border-4 border-orange-400"
            style={{ left: "50%", top: "50%", x: "-50%", y: "-50%", zIndex: 50 }}
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: "300vmax", height: "300vmax", opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* ── LAUNCH SCREEN ── */}
      <AnimatePresence>
        {phase !== "launched" && (
          <motion.div
            key="launch-screen"
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ zIndex: 10 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          >
            {/* Top logo — top-left so it never overlaps centered headline */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
              className="absolute top-6 left-6 flex items-center gap-3"
            >
              <div className="relative">
                <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 blur-md opacity-60 animate-pulse" />
                <img src={LOGO_URL} alt="TRYAM" className="relative h-10 w-10 rounded-full object-cover ring-1 ring-white/30" />
              </div>
              <span className="text-white font-bold text-2xl tracking-widest">TRYAM</span>
            </motion.div>

            {/* ── IDLE state ── */}
            <AnimatePresence>
              {phase === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -20 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="flex flex-col items-center gap-12 px-4 text-center"
                >
                  {/* Headline */}
                  <div className="space-y-5">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-sm font-semibold tracking-[0.4em] text-orange-400 uppercase"
                    >
                      India's Custom Merch Platform
                    </motion.p>
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white leading-[1.05]"
                      style={{ textShadow: "0 0 80px rgba(99,102,241,0.4)" }}
                    >
                      We Are
                      <br />
                      <span
                        style={{
                          background: "linear-gradient(90deg, #60a5fa 0%, #c084fc 40%, #f97316 80%, #ef4444 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          filter: "drop-shadow(0 0 30px rgba(249,115,22,0.5))",
                        }}
                      >
                        Launching
                      </span>
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="text-lg md:text-xl text-slate-400 max-w-md mx-auto font-light leading-relaxed"
                    >
                      Design. Print. Deliver. — The future of personalized merch in India starts now.
                    </motion.p>
                  </div>

                  {/* THE LAUNCH BUTTON */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.0, type: "spring", stiffness: 200, damping: 15 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="relative inline-flex items-center justify-center">
                      {/* Outer animated rings */}
                      <div className="absolute -inset-8 rounded-full border border-blue-500/20 animate-ping" style={{ animationDuration: "2s" }} />
                      <div className="absolute -inset-5 rounded-full border border-orange-500/30 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
                      <RingPulse active />

                      {/* Glow halo */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 blur-2xl opacity-50 animate-pulse" />

                      {/* Button itself */}
                      <motion.button
                        ref={buttonRef}
                        id="launch-btn"
                        style={{
                          x: springX,
                          y: springY,
                          background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 35%, #7c3aed 65%, #ea580c 100%)",
                          boxShadow: "0 0 60px rgba(124,58,237,0.5), 0 0 120px rgba(234,88,12,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                        }}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        onClick={startLaunch}
                        whileTap={{ scale: 0.93 }}
                        className="relative z-10 w-44 h-44 rounded-full font-black text-xl tracking-wide text-white cursor-pointer select-none overflow-hidden"
                      >
                        {/* Inner shimmer sweep */}
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)" }}
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                        {/* Button circle border */}
                        <div className="absolute inset-1 rounded-full border border-white/10" />
                        <span className="relative z-10 flex flex-col items-center gap-1">
                          <span className="text-3xl">🚀</span>
                          <span className="text-base font-black tracking-widest">LAUNCH</span>
                        </span>
                      </motion.button>
                    </div>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      transition={{ delay: 1.4 }}
                      className="text-xs text-slate-500 tracking-widest uppercase mt-2"
                    >
                      Click to ignite
                    </motion.p>
                  </motion.div>

                  {/* Bottom tagline badges */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="flex flex-wrap items-center justify-center gap-3 mt-4"
                  >
                    {["AI Design Tool", "Custom Merch", "Fast Delivery", "Made in India ✦"].map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-slate-400 backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── COUNTDOWN state ── */}
            <AnimatePresence>
              {phase === "countdown" && (
                <motion.div
                  key="countdown"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center gap-6"
                >
                  {/* Shaking label */}
                  <motion.p
                    animate={{ x: [0, -4, 4, -3, 3, 0] }}
                    transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 0.8 }}
                    className="text-sm font-bold tracking-[0.5em] text-orange-400 uppercase"
                  >
                    T-Minus
                  </motion.p>

                  {/* Number */}
                  <CountdownNumber num={countdownNum} />

                  {/* Progress bar */}
                  <div className="w-64 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: "linear-gradient(90deg, #3b82f6, #7c3aed, #f97316)",
                        boxShadow: "0 0 12px rgba(249,115,22,0.8)",
                      }}
                      initial={{ width: "100%" }}
                      animate={{ width: `${((COUNTDOWN_FROM - (countdownNum ?? 0)) / COUNTDOWN_FROM) * 100}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>

                  <motion.p
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-slate-400 text-sm tracking-widest uppercase"
                  >
                    {countdownNum === 0 ? "Ignition! 🔥" : "Preparing launch sequence..."}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LANDING PAGE REVEAL ── */}
      <AnimatePresence>
        {phase === "launched" && (
          <motion.div
            key="landing"
            className="absolute inset-0 overflow-auto no-scrollbar"
            style={{ zIndex: 20 }}
            initial={{ opacity: 0, scale: 1.06, filter: "blur(24px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Dramatic flash overlay that fades */}
            <motion.div
              className="absolute inset-0 pointer-events-none z-50 bg-white"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            <Landing />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
