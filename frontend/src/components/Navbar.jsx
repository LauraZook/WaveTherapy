import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Waves } from "lucide-react";

export const Navbar = () => {
  const { pathname } = useLocation();
  const isActive = (p) => pathname === p;
  return (
    <header className="bg-[#FDFBF7] border-b border-[#EAE5D9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group" data-testid="nav-logo">
          <span className="w-9 h-9 rounded-full bg-ocean text-white flex items-center justify-center group-hover:bg-ocean-dark transition-colors">
            <Waves className="w-5 h-5" />
          </span>
          <div>
            <div className="font-serif text-2xl text-ink leading-none">CuraWaves</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-ink-muted mt-0.5">Wave Therapy Onboarding</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-muted">
          <Link to="/" data-testid="nav-home" className={isActive("/") ? "text-ocean" : "hover:text-ocean transition-colors"}>Home</Link>
          <Link to="/onboarding" data-testid="nav-onboarding" className={isActive("/onboarding") ? "text-ocean" : "hover:text-ocean transition-colors"}>Build my plan</Link>
          <Link to="/reassess" data-testid="nav-reassess" className={isActive("/reassess") ? "text-ocean" : "hover:text-ocean transition-colors"}>Re-assess</Link>
        </nav>
        <Link
          to="/onboarding"
          data-testid="nav-cta-button"
          className="bg-ocean hover:bg-ocean-dark text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
        >
          Start questionnaire
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
