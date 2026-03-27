import { Link } from "react-router";
import { Facebook, Instagram, Youtube, Mail, MapPin, Phone, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 pt-16 pb-8 text-slate-400">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

        {/* 1. BRAND & SOCIAL */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent inline-block">
            TRYAM
          </h2>
          <p className="text-sm leading-relaxed">
            The easiest way to design and print custom apparel.
            Premium quality, AI-powered tools, Ship all over INDIA.
          </p>
          <div className="flex gap-4 pt-2">
            <SocialIcon icon={Instagram} link={'https://www.instagram.com/tryam193/'} />
            <SocialIcon icon={Youtube} link={'https://youtube.com/@tryam193?si=3cV_P5AZHwSXIXs2'} />
            <SocialIcon icon={Facebook} link={'https://www.facebook.com/share/1HShoCdBuo/'} />
            <SocialIcon icon={Linkedin} link={'https://www.linkedin.com/in/tryam-tryam-b837b33ba'} />
          </div>
        </div>

        {/* 2. COMPANY LINKS */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Company</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-orange-500 transition">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-orange-500 transition">Contact</Link></li>
            <li><Link to="/help" className="hover:text-orange-500 transition">Help Center</Link></li>
          </ul>
        </div>

        {/* 3. SHOP LINKS */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Shop</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/store" className="hover:text-orange-500 transition">Browse Products</Link></li>
            <li><Link to="/design/new" className="hover:text-orange-500 transition">Start Designing</Link></li>
            <li><Link to="/dashboard/orders" className="hover:text-orange-500 transition">Track Order</Link></li>
          </ul>
        </div>

        {/* 3. LEGAL (Mandatory for Payments) */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Support & Legal</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/legal/privacy" className="hover:text-orange-500 transition">Privacy Policy</Link></li>
            <li><Link to="/legal/terms" className="hover:text-orange-500 transition">Terms of Service</Link></li>
            <li><Link to="/legal/refunds" className="hover:text-orange-500 transition">Refund Policy</Link></li>
            <li><Link to="/legal/shipping" className="hover:text-orange-500 transition">Shipping Info</Link></li>
          </ul>
        </div>

        {/* 4. CONTACT */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Contact Us</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-orange-500" />
              <a href="mailto:support@tryam.com" className="hover:text-white">support@tryam193.com</a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-orange-500 mt-1" />
              <span>150/4 14th Main Srinagar,<br />Bengaluru, Karnataka 560050</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-orange-500" />
              <span>+91 8217037173</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-orange-500" />
              <span>+91 6363703334</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="text-center text-slate-600 text-xs border-t border-slate-900 pt-8">
        &copy; {new Date().getFullYear()} TRYAM Inc. All rights reserved.
      </div>
    </footer>
  );
}

function SocialIcon({ icon: Icon, link }: any) {
  return (
    <a href={link} target="_blank" className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-orange-600 hover:border-orange-600 hover:text-white transition">
      <Icon className="h-4 w-4" />
    </a>
  );
}