import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Home,
  LayoutTemplate,
  FolderClosed,
  FolderOpen,
  Package,
  Plus,
  ShoppingCart,
  Settings,
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  HelpCircle,
  Pencil,
  UserCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { useCart } from "@/context/CartContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";

// UI Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export function DashboardSidebar() {
  const location = useLocation();
  const { user, signOut, isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name?: string; photoUrl?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingClaim, setLoadingClaim] = useState(true);


  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data() as { name?: string; photoUrl?: string });
      }
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
      const checkAdmin = async () => {
        if (!user) {
          setIsAdmin(false);
          setLoadingClaim(false);
          return;
        }
        try {
          // Force refresh to get latest claims
          const tokenResult = await user.getIdTokenResult();
          setIsAdmin(!!tokenResult.claims.admin);
        } catch (e) {
          console.error("Admin check failed", e);
          setIsAdmin(false);
        } finally {
          setLoadingClaim(false);
        }
      };
  
      checkAdmin();
    }, [user]);
  

  const displayName = userProfile?.name || user?.displayName || user?.email?.split("@")[0] || "User";
  const initials = displayName?.charAt(0).toUpperCase();

  const navItems = [
    ...(isAdmin ? [{icon: UserCircle, label: 'Admin', path: "/admin/dashboard", isSpecial: false}] : []),
    { icon: Home, label: t("nav.home"), path: "/dashboard", isSpecial: false },
    { icon: FolderClosed, label: t("nav.projects"), path: "/dashboard/projects", isSpecial: false },
    { icon: LayoutTemplate, label: t("nav.designs"), path: "/dashboard/designs", isSpecial: false },
    { icon: Package, label: t("nav.orders"), path: "/dashboard/orders", isSpecial: false },
  ];

  // Mobile Menu Layout: Home, Designs | NEW (Special) | Projects, Orders
  const mobileNavItems = [
    ...navItems.slice(0, 3),
    { icon: Plus, label: "New", path: "/design", isSpecial: true },
    ...navItems.slice(3, 5),
  ];

  // ✅ Profile Dropdown Menu Content
  const ProfileMenuContent = () => (
    <div className="bg-[#0f172a] text-slate-200 border border-white/10 rounded-md w-56">
      <div className="flex items-center gap-2 p-3 border-b border-white/10">
        <Avatar className="h-8 w-8 border border-orange-500/30">
          <AvatarImage src={userProfile?.photoUrl} />
          <AvatarFallback className="bg-slate-800 text-orange-400 text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs font-semibold truncate text-white">{displayName}</span>
          <span className="text-[10px] text-slate-400 truncate">{user?.email}</span>
        </div>
      </div>

      <div className="p-1">
        <Link to="/dashboard/settings">
          <div className="flex p-2 items-center gap-2 hover:bg-indigo-500/10 hover:text-indigo-400">
            <Pencil className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </div>
        </Link>
        <Link to="/dashboard/help">
          {/* <DropdownMenuItem className="cursor-pointer hover:bg-indigo-500/10 hover:text-indigo-400"> */}
          <div className="flex p-2 items-center gap-2 hover:bg-indigo-500/10 hover:text-indigo-400">
            <HelpCircle className="mr-2 h-4 w-4 " />
            <span>Help</span>
          </div>
        </Link>
        <Link to="/dashboard/contact">
          <div className="flex p-2 items-center gap-2 hover:bg-indigo-500/10 hover:text-indigo-400">
            <MessageCircle className="mr-2 h-4 w-4" />
            <span>Contact</span>
          </div>
        </Link>
      </div>

      <DropdownMenuSeparator className="bg-white/10" />

      <div onClick={() => {
        signOut();
        navigate('/');
      }} className="flex items-center p-2 gap-2 text-red-400 hover:bg-red-900/20 cursor-pointer">
        <LogOut className="mr-2 h-4 w-4" />
        <span>{t("nav.logout")}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* 🖥️ DESKTOP SIDEBAR (Hidden on Mobile) */}
      <aside
        className={`hidden sm:flex fixed z-30 top-0 left-0 h-screen bg-[#0f172a]/95 backdrop-blur-xl border-r border-white/5 flex-col py-6 transition-all duration-300 ease-in-out ${isCollapsed ? "w-20 px-2 items-center" : "w-64 px-4"
          }`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-9 bg-slate-800 border border-white/10 text-slate-400 hover:text-white rounded-full p-1 shadow-lg hover:scale-110 transition-all z-50"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <Link to="/" className={`mb-8 flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-2"}`}>
          <div className="h-10 w-10 shrink-0 rounded-full bg-black ring-1 ring-white/10 flex items-center justify-center overflow-hidden">
            <img src="/assets/LOGO.png" alt="Logo" className="h-full w-full object-cover rounded-full" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-xl text-white tracking-tight whitespace-nowrap transition-opacity duration-300">
              TRYAM
            </span>
          )}
        </Link>

        {/* ✅ Start Designing Button (OPENS IN NEW TAB) */}
        <div className={`mb-6 w-50 ${isCollapsed ? "flex justify-center rounded-full" : ""}`}>
          <Button
            onClick={() => window.open('/design', '_blank')}
            className={`bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-900/20 transition-all duration-300 ${isCollapsed ? "h-10 w-10 rounded-full p-0" : "w-full rounded-xl h-10 font-medium"
              }`}
          >
            <Plus className={`h-5 w-5 ${!isCollapsed && "mr-2"}`} />
            {!isCollapsed && "Start Designing"}
          </Button>
        </div>

        <nav className="flex flex-col space-y-1 w-full flex-1">
          {!isCollapsed && (
            <p className="px-2 text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider animate-in fade-in duration-300">
              Menu
            </p>
          )}

          {navItems.map((item) => (
            <TooltipProvider key={item.path} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={item.path} className={`w-full ${isCollapsed ? "flex justify-center" : ""}`}>
                    <Button
                      variant="ghost"
                      className={`h-10 mb-1 transition-all duration-200 ${isCollapsed
                        ? "w-10 px-0 justify-center rounded-2xl"
                        : "w-full justify-start rounded-lg"
                        } ${isActive(item.path)
                          ? "text-orange-600 bg-white rounded-2xl"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        }`}
                    >
                      {item.label === 'Projects' ?
                        <>
                          <item.icon className={`h-4 w-4 transition-opacity opacity-0 duration-300 ${isActive(item.path) ? "opacity-0 hidden" : "opacity-100"} ${!isCollapsed && "mr-3"}`} />
                          <FolderOpen className={`h-4 w-4 transition-opacity opacity-0 duration-300 ${isActive(item.path) ? "opacity-100" : "opacity-0 hidden"} ${!isCollapsed && "mr-3"}`} />

                        </> :
                        <item.icon className={`h-4 w-4 ${!isCollapsed && "mr-3"}`} />}
                      {!isCollapsed && <span>{item.label}</span>}
                    </Button>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right" className="bg-slate-800 text-slate-200 border-white/10">{item.label}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          ))}

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/dashboard/cart" className={`w-full ${isCollapsed ? "flex justify-center" : ""}`}>
                  <Button
                    variant="ghost"
                    className={`h-10 transition-all duration-200 relative ${isCollapsed
                      ? "w-10 px-0 justify-center rounded-2xl"
                      : "w-full justify-start rounded-lg"
                      } ${isActive('/dashboard/cart')
                        ? "text-orange-600 bg-white rounded-2xl"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                  >
                    <ShoppingCart className={`h-4 w-4 ${!isCollapsed && "mr-3"}`} />
                    {!isCollapsed && <span>Cart</span>}
                    {cartCount > 0 && (
                      <Badge className={`bg-red-500 text-white text-[10px] h-5 px-1.5 ${isCollapsed ? "absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center rounded-full" : "ml-auto rounded-xl"}`}>
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right" className="bg-slate-800 text-slate-200 border-white/10">Cart</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </nav>

        <div className={`mt-auto pt-4 border-t border-white/5 w-full ${isCollapsed ? "flex flex-col items-center" : ""}`}>
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center rounded-2xl hover:bg-white/5 transition-colors group ${isCollapsed ? "justify-center p-0 h-10 w-10" : "gap-3 w-full p-2 text-left"
                  }`}>
                  <Avatar className="h-9 w-9 border border-white/10 group-hover:border-orange-500/50 transition-colors">
                    <AvatarImage src={userProfile?.photoUrl} />
                    <AvatarFallback className="bg-slate-800 text-slate-200 text-xs">{initials}</AvatarFallback>
                  </Avatar>

                  {!isCollapsed && (
                    <>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-slate-200 truncate">{displayName}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                      <Settings className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align={isCollapsed ? "start" : "end"} className="w-56 ml-2 bg-[#0f172a] border-white/10 text-slate-200 p-0">
                <ProfileMenuContent />
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth" className="w-full">
              <Button variant="ghost" className={`justify-start text-slate-400 hover:text-white ${isCollapsed ? "w-10 px-0 justify-center" : "w-full"}`}>
                <LogIn className={`h-4 w-4 ${!isCollapsed && "mr-2"}`} />
                {!isCollapsed && "Sign In"}
              </Button>
            </Link>
          )}
        </div>
      </aside>

      {/* 📱 MOBILE BOTTOM BAR (Visible < 640px) */}
      <div className="sm:hidden fixed z-50 bottom-0 left-0 w-full h-16 bg-[#0f172a]/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        {mobileNavItems.map((item) => {
          // ✅ SPECIAL: If it's the "New" (+) button, use onClick -> window.open
          if (item.isSpecial) {
            return (
              <button
                key={item.path}
                onClick={() => window.open(item.path, '_blank')}
                aria-label={item.label}
                className="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-full h-12 w-12 -translate-y-4 shadow-lg shadow-orange-900/50 border-4 border-[#0f172a] hover:scale-105 transition-transform flex items-center justify-center"
              >
                <item.icon className="h-6 w-6" />
              </button>
            )
          }

          // Normal Navigation
          return (
            <Link key={item.path} to={item.path} aria-label={item.label}>
              <Button
                variant="ghost"
                size="icon"
                className={`p-2.5 text-slate-500 bg-transparent ${isActive(item.path) ? "text-orange-600 bg-white rounded-2xl" : ""}`}
              >
                {item.label === 'Projects' ?
                  <>
                    <item.icon className={`h-5 w-5 transition-opacity opacity-0 duration-300 ${isActive(item.path) ? "opacity-0 hidden" : "opacity-100"} `} />
                    <FolderOpen className={`h-5 w-5 transition-opacity opacity-0 duration-300 ${isActive(item.path) ? "opacity-100" : "opacity-0 hidden"} `} />

                  </> :
                  <item.icon className={`h-5 w-5 `} />}
              </Button>
            </Link>
          )
        })}

        <Link to="/dashboard/cart" aria-label="Cart">
          <Button
            variant="ghost"
            size="icon"
            className={`p-2.5 text-slate-500 bg-transparent ${isActive('/dashboard/cart') ? "text-orange-600 bg-white rounded-2xl" : ""}`}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute top-3 right-17 h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
            )}
          </Button>
        </Link>

        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 ml-1 border border-white/10">
                <Avatar className="h-full w-full">
                  <AvatarImage src={userProfile?.photoUrl} />
                  <AvatarFallback className="bg-slate-800 text-slate-200 text-[10px]">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56 bg-[#0f172a] border-white/10 text-slate-200 p-0 mb-4 mr-2">
              <ProfileMenuContent />
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/auth">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-200">
              <LogIn className="h-5 w-5" />
            </Button>
          </Link>
        )}
      </div>
    </>
  );
}