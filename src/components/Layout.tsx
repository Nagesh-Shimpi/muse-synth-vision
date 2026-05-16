import { Link, useLocation } from "@tanstack/react-router";
import { Music2, Sparkles, Clock, ScanLine } from "lucide-react";
import { motion } from "framer-motion";

export function NavBar() {
  const location = useLocation();
  const path = location.pathname;
  const Item = ({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Music2 }) => {
    const active = to === "/" ? path === "/" : path.startsWith(to);
    return (
      <Link
        to={to}
        className={`group relative flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors ${
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        {active && (
          <motion.span
            layoutId="nav-active"
            className="absolute inset-0 rounded-full glass-strong neon-border-cyan -z-10"
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          />
        )}
      </Link>
    );
  };
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="glass rounded-full px-3 py-2 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-full bg-[image:var(--gradient-neon)] grid place-items-center neon-border">
              <Music2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">
              Virtual Instrument <span className="neon-text">Vision AI</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Item to="/" label="Home" icon={Sparkles} />
            <Item to="/scan" label="Scan" icon={ScanLine} />
            <Item to="/history" label="History" icon={Clock} />
          </nav>
        </div>
      </div>
    </header>
  );
}

export function Particles() {
  // Lightweight: 18 floating orbs via CSS
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="absolute block rounded-full blur-2xl opacity-40 animate-float-y"
          style={{
            width: `${40 + (i % 5) * 30}px`,
            height: `${40 + (i % 5) * 30}px`,
            left: `${(i * 53) % 100}%`,
            top: `${(i * 37) % 100}%`,
            background: i % 3 === 0
              ? "var(--aurora-1)"
              : i % 3 === 1
              ? "var(--aurora-2)"
              : "var(--aurora-3)",
            animationDelay: `${(i * 0.3).toFixed(2)}s`,
            animationDuration: `${4 + (i % 5)}s`,
          }}
        />
      ))}
    </div>
  );
}
