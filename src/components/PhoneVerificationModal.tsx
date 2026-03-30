import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  signInWithCredential
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (phone: string) => void;
  phoneNumber: string;
}

export function PhoneVerificationModal({ isOpen, onClose, onVerified, phoneNumber }: Props) {
  const displayPhone = `${phoneNumber?.slice(0, 3)} ${phoneNumber?.slice(3, 8)} ${phoneNumber?.slice(8)}`;
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [phone, setPhone] = useState(displayPhone || phoneNumber || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // 1. INVISIBLE RECAPTCHA INIT & CLEANUP
  useEffect(() => {
    const clearRecaptcha = () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) { }
        window.recaptchaVerifier = undefined;
      }
    };

    if (isOpen) {
      const timer = setTimeout(async () => {
        const container = document.getElementById("recaptcha-container");
        if (container) {
          clearRecaptcha();
          try {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              'size': 'invisible', // 🟢 Set to invisible
              'callback': () => { console.log("Recaptcha verified behind the scenes"); }
            });
            await window.recaptchaVerifier.render();
          } catch (e) {
            console.error("Recaptcha init failed", e);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      clearRecaptcha();
    }
    return () => clearRecaptcha();
  }, [isOpen]);

  // 2. TIMER LOGIC
  useEffect(() => {
    const checkTimer = () => {
      const savedTarget = localStorage.getItem('otp_cooldown_target');
      if (savedTarget) {
        const diff = Math.ceil((parseInt(savedTarget, 10) - Date.now()) / 1000);
        setTimeLeft(diff > 0 ? diff : 0);
        if (diff <= 0) localStorage.removeItem('otp_cooldown_target');
      }
    };
    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const startCooldown = () => {
    const COOLDOWN = 30;
    localStorage.setItem('otp_cooldown_target', (Date.now() + COOLDOWN * 1000).toString());
    setTimeLeft(COOLDOWN);
  };

  // 3. SEND OTP 
  const handleSendOtp = async (isResend = false) => {
    if (timeLeft > 0) return toast.warning(`Wait ${timeLeft}s.`);

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) return toast.error("Enter valid phone number");

    const formattedPhone = cleanPhone.startsWith("+") ? cleanPhone : `+91${cleanPhone}`;
    setLoading(true);

    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible'
        });
        await window.recaptchaVerifier.render();
      }

      const appVerifier = window.recaptchaVerifier;

      // 🟢 ALWAYS use signInWithPhoneNumber here. It safely sends the SMS without changing the session yet.
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);

      setConfirmationResult(confirmation);
      setStep('otp');
      startCooldown();
      toast.success(isResend ? "OTP Resent!" : "OTP Sent!");

    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/invalid-app-credential') {
        toast.error("Security check failed. Please check Firebase domain settings.");
      } else {
        toast.error(error.message || "Failed to send OTP.");
      }
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } finally {
      setLoading(false);
    }
  };

  // 4. VERIFY OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return toast.error("Enter 6-digit code");
    setLoading(true);

    try {
      if (!confirmationResult) throw new Error("Session expired.");

      // 🟢 THE FIX: Extract the credential instead of confirming directly
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);

      if (auth.currentUser) {
        // 🔒 STRICT LINKING: This guarantees the user session DOES NOT CHANGE.
        // The cart stays 100% safe because the UID remains exactly the same!
        await linkWithCredential(auth.currentUser, credential);
      } else {
        // Only sign in if they were completely logged out
        await signInWithCredential(auth, credential);
      }

      // If successful, save to Firestore
      if (auth.currentUser) {
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        const formattedPhone = cleanPhone.startsWith("+") ? cleanPhone : `+91${cleanPhone}`;

        await setDoc(doc(db, "users", auth.currentUser.uid), {
          phoneNumber: formattedPhone,
          phoneVerified: true,
          updatedAt: new Date()
        }, { merge: true });

        toast.success("Verified!");
        onVerified(formattedPhone);
        localStorage.removeItem('otp_cooldown_target');
        setTimeLeft(0);
        onClose();
      }
    } catch (error: any) {
      console.error("Verification Error:", error);

      // Handle the edge case where the phone number is already owned by another user
      if (error.code === 'auth/credential-already-in-use') {
        toast.error("This phone number is already linked to another account!");
      } else if (error.code === 'auth/invalid-verification-code') {
        toast.error("Invalid Code. Please try again.");
      } else {
        toast.error(error.message || "Failed to verify code.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen && phone !== displayPhone) setPhone(displayPhone);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-400" /> Verify Phone
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            We will send a standard SMS to verify your number.
          </DialogDescription>
        </DialogHeader>

        {/* 🟢 Invisible reCAPTCHA still needs a container attached to the DOM */}
        <div id="recaptcha-container"></div>

        <div className="space-y-4 py-4">
          {step === 'input' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  placeholder="Enter phone number" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white" type="tel"
                />
              </div>
              <Button onClick={() => handleSendOtp(false)} disabled={loading || timeLeft > 0} className="w-full bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="animate-spin" /> : (timeLeft > 0 ? `Wait ${timeLeft}s` : "Send SMS OTP")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Enter OTP</Label>
                <Input
                  placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>

              <Button onClick={handleVerifyOtp} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-lg h-12">
                {loading ? <Loader2 className="animate-spin" /> : "Verify Code"}
              </Button>

              <div className="flex justify-center pt-2">
                <Button variant="ghost" size="sm" onClick={() => handleSendOtp(true)} disabled={timeLeft > 0 || loading} className="text-slate-400 hover:text-white">
                  {timeLeft > 0 ? (
                    <span className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" /> {timeLeft}s
                    </span>
                  ) : (
                    <span className="flex items-center gap-2"><RefreshCw className="h-3 w-3" /> Resend OTP</span>
                  )}
                </Button>
              </div>
              <Button variant="link" onClick={() => setStep('input')} className="text-slate-500 w-full text-xs">Change Number</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

declare global { interface Window { recaptchaVerifier: any; } }