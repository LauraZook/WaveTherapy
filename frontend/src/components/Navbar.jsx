import React from "react";
import { Link, useLocation } from "react-router-dom";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_therapy-goal-planner/artifacts/iu32proz_curawaves_logo_bk.png";

export const Navbar = () => {
  const { pathname } = useLocation();
  const isActive = (p) => pathname === p;
  return (
    <header className="bg-[#FDFBF7] border-b border-[#EAE5D9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" data-testid="nav-logo">
          <img
            src={LOGO_URL}
            alt="CuraWaves"
            className="h-9 md:h-10 w-auto object-contain"
          />
          <span className="hidden sm:inline-block text-[10px] tracking-[0.2em] uppercase text-ink-muted border-l border-[#EAE5D9] pl-3">
            Wave Therapy Plans
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-muted">
          <Link to="/" data-testid="nav-home" className={isActive("/") ? "text-ocean" : "hover:text-ocean transition-colors"}>Home</Link>
          <Link to="/onboarding" data-testid="nav-onboarding" className={isActive("/onboarding") ? "text-ocean" : "hover:text-ocean transition-colors"}>Build my plan</Link>
          <Link to="/reassess" data-testid="nav-reassess" className={isActive("/reassess") ? "text-ocean" : "hover:text-ocean transition-colors"}>Optimize my plan</Link>
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
