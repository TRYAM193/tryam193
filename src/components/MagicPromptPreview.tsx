// src/components/MagicPromptPreview.tsx
// Landing-page "Magic Prompt" — no auth required, up to 3 previews/day as guest.
// Guest uses count toward the signed-in daily quota (5 total, so 2 remain after login).

import { useState, useRef, useCallback } from "react";
import * as fabric from "fabric";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, ArrowRight, RefreshCw, Lock, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateDesignJsonFromPrompt } from "@/design-tool/utils/aiService";
import { useNavigate } from "react-router";
import { auth } from "@/firebase";
import { signInAnonymously } from "firebase/auth";

// ─── Constants ─────────────────────────────────────────────────────────────
const GUEST_LIMIT = 3;
const LS_KEY = "tryam_magic_count";
const LS_DATE_KEY = "tryam_magic_date";
const CANVAS_SIZE = 500; // headless canvas logical px
const SHIRT_URL =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop";

const STYLES = [
  { id: "none", label: "Auto", icon: "✨" },
  { id: "typography poster", label: "Typography", icon: "📝" },
  { id: "abstract geometric layout", label: "Geometric", icon: "🔺" },
  { id: "retro synthwave text", label: "Retro", icon: "📼" },
  { id: "minimalist branding layout", label: "Minimal", icon: "🤍" },
  { id: "streetwear bold text", label: "Streetwear", icon: "🔥" },
];

const EXAMPLE_PROMPTS = [
  "Cosmic dragon breathing fire made of stars",
  "Retro 80s sunset with bold typography",
  "Minimalist mountain range in blue tones",
  "Streetwear logo with geometric shapes",
];

// ─── Local-storage guest counter ───────────────────────────────────────────
function getGuestUsage(): number {
  const today = new Date().toISOString().split("T")[0];
  const storedDate = localStorage.getItem(LS_DATE_KEY);
  if (storedDate !== today) {
    localStorage.setItem(LS_DATE_KEY, today);
    localStorage.setItem(LS_KEY, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(LS_KEY) || "0", 10);
}

function incrementGuestUsage(): void {
  const current = getGuestUsage();
  localStorage.setItem(LS_KEY, String(current + 1));
}

const ANON_UID_KEY = "tryam_anon_uid";

async function ensureAnonymousAuth(): Promise<void> {
  if (auth.currentUser) {
    // Already signed in. If this is the anonymous session, keep tracking the UID.
    if (auth.currentUser.isAnonymous) {
      localStorage.setItem(ANON_UID_KEY, auth.currentUser.uid);
    }
    return;
  }
  try {
    const result = await signInAnonymously(auth);
    // Store the anonymous UID so use-auth can transfer quota on real sign-in
    localStorage.setItem(ANON_UID_KEY, result.user.uid);
  } catch (e) {
    console.warn("Anonymous sign-in failed:", e);
  }
}

// ─── Headless Fabric render → PNG dataURL ──────────────────────────────────
async function renderDesignToPng(
  objects: any[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvasEl = document.createElement("canvas");
    canvasEl.width = CANVAS_SIZE;
    canvasEl.height = CANVAS_SIZE;
    // Mount off-screen so Fabric can initialise properly
    canvasEl.style.position = "fixed";
    canvasEl.style.left = "-9999px";
    canvasEl.style.top = "-9999px";
    document.body.appendChild(canvasEl);

    const fc = new fabric.Canvas(canvasEl, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: "transparent",
    });

    const addAll = async () => {
      for (const obj of objects) {
        try {
          if (["text", "textbox", "i-text"].includes(obj.type)) {
            const t = new fabric.Textbox(obj.props?.text || obj.text || "", {
              ...(obj.props || obj),
              left: obj.props?.left ?? obj.left ?? 50,
              top: obj.props?.top ?? obj.top ?? 50,
              fontSize: obj.props?.fontSize ?? obj.fontSize ?? 36,
              fill: obj.props?.fill ?? obj.fill ?? "#ffffff",
              fontFamily: obj.props?.fontFamily ?? obj.fontFamily ?? "Arial",
              fontWeight: obj.props?.fontWeight ?? obj.fontWeight ?? "bold",
              textAlign: obj.props?.textAlign ?? obj.textAlign ?? "center",
            });
            fc.add(t);
          } else if (obj.type === "rect") {
            const r = new fabric.Rect({
              ...(obj.props || obj),
              left: obj.props?.left ?? obj.left ?? 100,
              top: obj.props?.top ?? obj.top ?? 100,
              width: obj.props?.width ?? obj.width ?? 100,
              height: obj.props?.height ?? obj.height ?? 100,
              fill: obj.props?.fill ?? obj.fill ?? "#ff6600",
            });
            fc.add(r);
          } else if (obj.type === "circle") {
            const c = new fabric.Circle({
              ...(obj.props || obj),
              left: obj.props?.left ?? obj.left ?? 150,
              top: obj.props?.top ?? obj.top ?? 150,
              radius: obj.props?.radius ?? obj.radius ?? 50,
              fill: obj.props?.fill ?? obj.fill ?? "#ff6600",
            });
            fc.add(c);
          } else if (obj.type === "triangle") {
            const tri = new fabric.Triangle({
              ...(obj.props || obj),
              left: obj.props?.left ?? obj.left ?? 150,
              top: obj.props?.top ?? obj.top ?? 150,
              width: obj.props?.width ?? obj.width ?? 100,
              height: obj.props?.height ?? obj.height ?? 100,
              fill: obj.props?.fill ?? obj.fill ?? "#ff6600",
            });
            fc.add(tri);
          } else if (obj.type === "image") {
            try {
              const src = obj.props?.src ?? obj.src;
              if (src) {
                const img = await fabric.FabricImage.fromURL(src, {
                  crossOrigin: "anonymous",
                });
                img.set({ ...(obj.props || obj) });
                fc.add(img);
              }
            } catch {
              /* skip broken images */
            }
          }
        } catch (e) {
          console.warn("Skipped object during headless render:", e);
        }
      }
      fc.renderAll();
      const dataUrl = fc.toDataURL({ format: "png", multiplier: 1 });
      fc.dispose();
      document.body.removeChild(canvasEl);
      resolve(dataUrl);
    };

    addAll().catch((e) => {
      try {
        fc.dispose();
        document.body.removeChild(canvasEl);
      } catch { }
      reject(e);
    });
  });
}

// ─── Composite design onto shirt ───────────────────────────────────────────
async function compositeOntoShirt(
  shirtUrl: string,
  designPng: string
): Promise<string> {
  return new Promise((resolve) => {
    const outCanvas = document.createElement("canvas");
    const SHIRT_W = 600;
    const SHIRT_H = 600;
    outCanvas.width = SHIRT_W;
    outCanvas.height = SHIRT_H;
    const ctx = outCanvas.getContext("2d")!;

    const shirt = new Image();
    shirt.crossOrigin = "anonymous";
    shirt.onload = () => {
      // Draw the shirt
      ctx.drawImage(shirt, 0, 0, SHIRT_W, SHIRT_H);

      // Overlay the design on the "print area" (roughly center chest)
      const designImg = new Image();
      designImg.onload = () => {
        const printX = SHIRT_W * 0.22;
        const printY = SHIRT_H * 0.2;
        const printW = SHIRT_W * 0.56;
        const printH = SHIRT_H * 0.55;

        ctx.globalAlpha = 0.92;
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(designImg, printX, printY, printW, printH);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";

        resolve(outCanvas.toDataURL("image/png"));
      };
      designImg.src = designPng;
    };
    shirt.onerror = () => {
      // If shirt fails to load, just return the raw design
      const designImg = new Image();
      designImg.onload = () => {
        ctx.drawImage(designImg, 0, 0, SHIRT_W, SHIRT_H);
        resolve(outCanvas.toDataURL("image/png"));
      };
      designImg.src = designPng;
    };
    shirt.src = shirtUrl;
  });
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function MagicPromptPreview() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("none");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedObjects, setGeneratedObjects] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestUsage, setGuestUsage] = useState(() => getGuestUsage());
  const [showLoginNudge, setShowLoginNudge] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const guestRemaining = Math.max(0, GUEST_LIMIT - guestUsage);
  const isLimitReached = guestRemaining === 0;

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      return;
    }
    if (isLimitReached) {
      setShowLoginNudge(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPreviewUrl(null);

    try {
      // Ensure the Cloud Function has an authenticated context.
      // signInAnonymously is a no-op if already signed in.
      await ensureAnonymousAuth();

      const objects = await generateDesignJsonFromPrompt(
        trimmed,
        selectedStyle,
        CANVAS_SIZE,
        CANVAS_SIZE,
        "a t-shirt (preview mode)",
        []
      );

      incrementGuestUsage();
      const newUsage = getGuestUsage();
      setGuestUsage(newUsage);

      // Store for editor handoff
      setGeneratedObjects(objects);
      sessionStorage.setItem(
        "magic_preview_design",
        JSON.stringify({ objects, prompt: trimmed, style: selectedStyle, ts: Date.now() })
      );

      // Render headless
      const designPng = await renderDesignToPng(objects);
      const composite = await compositeOntoShirt(SHIRT_URL, designPng);
      setPreviewUrl(composite);
    } catch (e: any) {
      console.error("Magic Prompt error:", e);
      setError("Generation failed. Please try again in a moment.");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedStyle, isLimitReached]);

  const handleOpenEditor = () => {
    navigate("/design");
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setGeneratedObjects(null);
    setError(null);
    setPrompt("");
    sessionStorage.removeItem("magic_preview_design");
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    textareaRef.current?.focus();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-900/20 backdrop-blur-md text-sm font-medium text-purple-200 mb-4">
          <Sparkles className="h-3.5 w-3.5 text-purple-300 fill-purple-300" />
          <span>Magic Prompt — Try it right now</span>
        </div>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Describe your idea and see it on a shirt instantly. No account needed.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="grid md:grid-cols-2 gap-6 items-start"
      >
        {/* ── LEFT: INPUT PANEL ─────────────────────────── */}
        <div className="space-y-4">
          {/* Prompt textarea */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-300" />
            <div className="relative bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 focus-within:border-purple-500/50 transition-colors">
              <textarea
                ref={textareaRef}
                id="magic-prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="Describe your design idea..."
                rows={3}
                className="w-full bg-transparent text-white text-sm placeholder:text-slate-500 resize-none focus:outline-none leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <span className="text-xs text-slate-600">{prompt.length}/200</span>
                <span className="text-xs text-slate-600">Ctrl+Enter to generate</span>
              </div>
            </div>
          </div>

          {/* Example prompts */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex}
                onClick={() => handleExampleClick(ex)}
                className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/25 hover:bg-white/10 transition-all truncate max-w-[180px]"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Style pills */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Style</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyle(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${selectedStyle === s.id
                      ? "bg-gradient-to-r from-purple-600/30 to-blue-600/30 border-purple-500/50 text-white shadow-[0_0_12px_rgba(147,51,234,0.2)]"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA Button */}
          <div className="space-y-2">
            <AnimatePresence mode="wait">
              {!isLimitReached ? (
                <motion.div key="generate-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button
                    id="magic-prompt-generate"
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 hover:from-purple-500 hover:via-violet-500 hover:to-blue-500 text-white font-bold shadow-[0_0_20px_rgba(147,51,234,0.25)] hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] transition-all border-0 active:scale-[0.98]"
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Consulting the Cosmos...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        Generate Preview
                      </span>
                    )}
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="limit-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  <div className="w-full h-12 rounded-xl bg-slate-800/60 border border-white/10 flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
                    <Lock className="h-4 w-4" />
                    Daily guest limit reached (3/3)
                  </div>
                  <button
                    id="magic-prompt-login-nudge"
                    onClick={() => navigate("/auth")}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2"
                  >
                    <span>Sign up free — 2 more today</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    Your 3 previews count toward your 5/day quota after login — 2 left today.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Guest quota indicator */}
            {!isLimitReached && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-600">Guest previews</span>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: GUEST_LIMIT }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${i < guestUsage ? "bg-purple-500" : "bg-slate-700"
                        }`}
                    />
                  ))}
                  <span className="text-xs text-slate-500 ml-1">{guestRemaining} left</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: PREVIEW PANEL ──────────────────────── */}
        <div className="relative">
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden aspect-square shadow-2xl shadow-purple-900/10">
            <AnimatePresence mode="wait">
              {/* Loading skeleton */}
              {isGenerating && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/60"
                >
                  {/* Shimmer layers */}
                  <div className="w-full h-full absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20" />
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                      style={{ animation: "shimmer 2s infinite" }}
                    />
                  </div>
                  <div className="relative flex flex-col items-center gap-3 z-10">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 flex items-center justify-center">
                        <Sparkles className="h-7 w-7 text-purple-400 animate-pulse" />
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />
                    </div>
                    <p className="text-white font-semibold text-sm">AI is crafting your design...</p>
                    <p className="text-slate-400 text-xs">Usually takes 5–10 seconds</p>
                  </div>
                </motion.div>
              )}

              {/* Preview result */}
              {previewUrl && !isGenerating && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <img
                    src={previewUrl}
                    alt="AI Design Preview"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay gradient at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex items-end justify-between gap-3">
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Try Again
                    </button>
                    <Button
                      id="magic-prompt-open-editor"
                      onClick={handleOpenEditor}
                      className="h-9 px-5 text-sm rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold border-0 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-900/30 flex items-center gap-2"
                    >
                      Open in Editor
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Default placeholder */}
              {!previewUrl && !isGenerating && (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                >
                  <img
                    src={SHIRT_URL}
                    alt="T-shirt mockup"
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                  <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                      <Wand2 className="h-6 w-6 text-purple-400" />
                    </div>
                    <p className="text-white font-semibold">Your design preview</p>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Type a prompt and click Generate Preview to see your design here
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* "Powered by AI" badge */}
          <div className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-900/50">
            <Sparkles className="h-3 w-3" />
            AI Preview
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
