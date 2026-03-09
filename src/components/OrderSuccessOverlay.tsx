import { motion } from "framer-motion";
import { Check, Crown, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";

export function OrderSuccessOverlay() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar over 3 seconds then redirect
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          navigate("/dashboard/orders");
          return 100;
        }
        return prev + 2; // Updates every 50ms approx -> 2.5s total
      });
    }, 50);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-green-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 text-center space-y-8 p-8 max-w-md w-full">
        
        {/* Animated Icon Circle */}
        <div className="relative flex items-center justify-center mx-auto">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-32 h-32 bg-gradient-to-tr from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)]"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              <Check className="w-16 h-16 text-white stroke-[4px]" />
            </motion.div>
          </motion.div>
          
          {/* Pulsing Ring */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 border-2 border-green-500/30 rounded-full"
          />
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          {userProfile?.isFoundingCreator ? (
            // 👑 FOUNDING CREATOR CELEBRATION
            <>
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 tracking-tight flex items-center justify-center gap-2"
              >
                <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400/20" /> 
                Order Placed!
              </motion.h2>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-yellow-100/80 font-medium max-w-sm mx-auto"
              >
                Congratulations! You are officially one of the first 100 <strong className="text-white">TRYAM Founding Creators</strong>!
              </motion.p>
            </>
          ) : (
            // 📦 STANDARD SUCCESS MESSAGE
            <>
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-bold text-white tracking-tight"
              >
                Order Placed!
              </motion.h2>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-slate-400"
              >
                Thank you for shopping with TRYAM. <br/> Your order has been queued for production.
              </motion.p>
            </>
          )}
        </div>

        {/* Redirect Bar */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.8 }}
          className="space-y-3"
        >
          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
            Redirecting to Dashboard <ArrowRight className="w-3 h-3 animate-pulse" />
          </p>
        </motion.div>

      </div>
    </div>
  );
}