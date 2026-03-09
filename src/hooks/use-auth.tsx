import { useContext, createContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, collection, where, query, getDocs, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"; // 👈 Added Firestore imports
import { auth, db } from "@/firebase"; // 👈 Ensure db is imported


interface UserProfile {
  name?: string;
  email?: string;
  role?: string;
  isBanned?: boolean;
  banReason?: string;
  photoURL?: string;
  phoneVerified?: boolean;
  isFoundingCreator?: boolean;
  referralCode: string;
  referralCount: number,                     
  hasActiveReward: boolean,               
  referredBy: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  user: User | null;
  userProfile: UserProfile | null; // 👈 Added Profile to Context
  signIn: (type: string, formData?: any) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // 👈 Profile State
  const [isLoading, setIsLoading] = useState(true);

  // 1. LISTEN TO AUTH STATE & FETCH PROFILE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Fetch Profile from Firestore
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Should handle missing profile, but for now just set null
            setUserProfile(null);
          }
        } catch (e) {
          console.log("Error fetching user profile:", e);
        }
      } else {
        setUserProfile(null);
      }

      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Utility to generate a unique 6-character code (e.g., TRYAM-8X9A2B)
  const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'TRYAM-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // 🛠️ HELPER: Save/Update User in Firestore
  const saveUserToDb = async (user: User, additionalData: any = {}) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    let referredByUid = null;
    const pendingRefCode = localStorage.getItem('tryam_pending_referral');

    // 1. Check if the user clicked a referral link before signing up
    if (pendingRefCode) {
      try {
        // Find the existing user who owns this referral code
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('referralCode', '==', pendingRefCode));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // We found the referrer! Get their UID.
          const referrerDoc = querySnapshot.docs[0];
          referredByUid = referrerDoc.id;
        }
      } catch (error) {
        console.error('Error verifying referral code:', error);
      }
    }

    if (!userSnap.exists()) {
      // 🟢 NEW USER: Initialize Default Values (isBanned: false)
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || additionalData.name || "User",
        photoURL: user.photoURL || null,
        role: "user",
        isBanned: false, // 👈 IMPORTANT: Set default to false
        banReason: null,
        phoneVerified: false,
        isFoundingCreator: false,
        referralCode: generateReferralCode(), // Their own code to share
        referralCount: 0,                     // Starts at 0
        hasActiveReward: false,               // ₹100 reward lock
        referredBy: referredByUid,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        ...additionalData
      });
    } else {
      // 🟡 EXISTING USER: Only update Last Login (Do NOT overwrite isBanned)
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        // We might update name/photo if they changed in Google, but be careful not to reset flags
        email: user.email
      });
    }
  };

  const signIn = async (type: string, formData?: FormData) => {
    let currentUser: User | null = null;

    if (type === "anonymous") {
      const result = await signInAnonymously(auth);
      currentUser = result.user;
      await saveUserToDb(currentUser, { name: "Guest", role: "guest" });
    }
    else if (type === "google") {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      currentUser = result.user;
      await saveUserToDb(currentUser);
    }
    else if (type === "email-password") {
      const email = formData?.get("email") as string;
      const password = formData?.get("password") as string;
      const isSignUp = formData?.get("isSignUp") === "true";

      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = result.user;
        // For email signup, we might want to capture a name if you add a name field later
        await saveUserToDb(currentUser, { name: email.split('@')[0] });
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        currentUser = result.user;
        await saveUserToDb(currentUser);
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      isLoading,
      loading: isLoading,
      user,
      userProfile, // 👈 Exported for ProtectedRoute
      signIn,
      signOut,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}