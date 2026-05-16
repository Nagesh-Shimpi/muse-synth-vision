import { motion } from "framer-motion";

export function AnalyzingOverlay({ src }: { src: string }) {
  return (
    <div className="relative mx-auto max-w-md aspect-square rounded-3xl overflow-hidden glass-strong neon-border">
      <img src={src} alt="Analyzing" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-background/40" />
      <motion.div
        className="absolute inset-x-0 h-24 scan-line"
        initial={{ y: "-100%" }}
        animate={{ y: "100%" }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 flex items-end justify-center p-5">
        <div className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[image:var(--gradient-neon)] animate-pulse" />
          AI analysing instrument…
        </div>
      </div>
    </div>
  );
}
