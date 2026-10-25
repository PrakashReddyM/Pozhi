import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

const statItems = [
  { value: 5, suffix: "+", label: "Years of craft" },
  { value: 2400, suffix: "+", label: "Portraits taken" },
  { value: 98, suffix: "%", label: "Client satisfaction" },
  { value: 12, suffix: "K+", label: "Prints delivered" },
];

function useCountUp(target: number, active: boolean): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const duration = 1800;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
      else setCount(target);
    };
    requestAnimationFrame(tick);
  }, [target, active]);
  return count;
}

const StatCard = ({
  value,
  suffix,
  label,
  delay,
}: {
  value: number;
  suffix: string;
  label: string;
  delay: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const count = useCountUp(value, active);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col"
    >
      <span className="text-4xl md:text-6xl font-heading font-black text-heading tracking-tight tabular-nums">
        {count}
        {suffix}
      </span>
      <span className="text-[10px] text-muted-foreground/40 tracking-[0.4em] uppercase mt-2 font-body font-bold">
        {label}
      </span>
    </motion.div>
  );
};

const textLines = [
  "We are Pozhi.",
  "Capturing moments,",
  "framing memories.",
  "Every image a manifest —",
  "archived beautifully.",
];

const About = () => {
  return (
    <>
      <Navbar visible={true} />

      {/* Ambient warm lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-background">
        <div className="absolute top-[10%] left-[-10%] w-[800px] h-[800px] bg-orange-50/20 rounded-full blur-[160px]" />
        <div className="absolute bottom-[20%] right-[-5%] w-[600px] h-[600px] bg-blue-50/10 rounded-full blur-[140px]" />
      </div>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 pt-32 pb-40 px-6 md:px-12"
      >
        <div className="max-w-5xl mx-auto">
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-[10px] font-body font-black text-muted-foreground/60 tracking-[0.5em] uppercase mb-12"
          >
            OUR CRAFT
          </motion.p>

          {/* Editorial headline lines — clip reveal */}
          <div className="space-y-4 mb-24">
            {textLines.map((line, i) => (
              <div key={i} className="overflow-hidden">
                <motion.h1
                  initial={{ y: 120, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    duration: 1.2,
                    delay: i * 0.15 + 0.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`font-heading font-black leading-[0.85] tracking-tighter ${
                    i < 3
                      ? "text-4xl md:text-5xl lg:text-6xl text-heading"
                      : "text-3xl md:text-4xl lg:text-5xl text-foreground/20 italic"
                  }`}
                >
                  {line}
                </motion.h1>
              </div>
            ))}
          </div>

          {/* Stats row — High Contrast Archival */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-24 py-16 border-y border-foreground/[0.05]"
          >
            {statItems.map((stat, i) => (
              <StatCard key={stat.label} {...stat} delay={i * 0.1} />
            ))}
          </motion.div>

          {/* Two-column mission/promise */}
          <div className="grid md:grid-cols-2 gap-16 lg:gap-32 mb-24">
            {[
              {
                title: "Artisan Mission",
                text: "At Pozhi, we believe every photo represents a legacy that deserves preservation. From passport photos to heirloom wall frames, we bring studio-grade craftsmanship to every memory we touch.",
                delay: 0.1,
              },
              {
                title: "Studio Integrity",
                text: "We combine professional equipment with archival processing. Whether you walk into our studio or book our mobile studio service, you receive nothing less than perfect quality — delivered without delay.",
                delay: 0.22,
              },
            ].map((col) => (
              <motion.div
                key={col.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1, delay: col.delay, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Accent rule */}
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "3rem" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: col.delay + 0.3 }}
                  className="h-px bg-foreground/20 mb-8 shadow-sm"
                />
                <h2 className="text-2xl font-heading font-black text-heading mb-6 tracking-tight uppercase">
                  {col.title}
                </h2>
                <p className="text-muted-foreground/60 leading-relaxed text-sm font-body font-bold uppercase tracking-widest opacity-80 decoration-orange-200 decoration-1 underline-offset-4">
                  {col.text}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Full-width quote — Premium Gallery Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative p-12 md:p-24 rounded-[40px] bg-card border border-foreground/[0.03] overflow-hidden group shadow-2xl shadow-black/[0.02]"
          >
             {/* Subtle paper texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply" 
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

            <div className="absolute inset-0 bg-gradient-to-tr from-foreground/[0.015] to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent shadow-sm" />
            <blockquote className="relative">
              <span className="text-7xl font-heading leading-none text-foreground/[0.03] absolute -top-8 -left-6 select-none italic font-black">
                "
              </span>
              <p className="text-2xl md:text-4xl font-heading font-black text-heading leading-[0.95] tracking-tighter max-w-2xl">
                Light is the <span className="text-foreground/20 italic">Ultimate Artist</span>. We are merely its secure instruments of capture.
              </p>
              <footer className="mt-12 text-[10px] text-muted-foreground/40 tracking-[0.6em] uppercase font-body font-black">
                — OUR STUDIO PROMISE
              </footer>
            </blockquote>
          </motion.div>
        </div>
      </motion.main>
    </>
  );
};

export default About;
