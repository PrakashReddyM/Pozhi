import { motion } from "framer-motion";
import { Sparkles, Cpu, Zap, Camera, ShieldCheck, CornerRightDown } from "lucide-react";
import Navbar from "@/components/Navbar";

const roadmapItems = [
  {
    icon: Cpu,
    title: "AI Retouching",
    description:
      "Intelligent photo enhancement tools. Real-time skin correction, background synthesis, and classic style processing.",
    status: "In Development",
    statusColor: "text-orange-600/80 bg-orange-100/10 border-orange-200/20",
  },
  {
    icon: Camera,
    title: "Drone Photography",
    description:
      "Professional drone services for events, architecture, and landscape coverage. Stunning high-altitude perspectives.",
    status: "Coming 2026",
    statusColor: "text-foreground/40 bg-foreground/[0.03] border-foreground/[0.05]",
  },
  {
    icon: Sparkles,
    title: "AR Frame Preview",
    description:
      "Visualize your premium frames on-site with precise AR placement. See how it looks on your wall before you buy.",
    status: "Research",
    statusColor: "text-foreground/30 bg-foreground/[0.02] border-foreground/[0.04]",
  },
  {
    icon: Zap,
    title: "Express Delivery",
    description:
      "Hyper-speed local printing and delivery service. High-quality prints delivered to your doorstep within the hour.",
    status: "Planned",
    statusColor: "text-foreground/20 bg-foreground/[0.01] border-foreground/[0.03]",
  },
];

const Future = () => {
  return (
    <>
      <Navbar visible={true} />

      {/* Ambient warm lighting — Light Luxe Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-background">
        <div className="absolute top-[30%] left-[-10%] w-[900px] h-[900px] bg-orange-50/20 rounded-full blur-[160px]" />
        <div className="absolute bottom-[0%] right-[-5%] w-[600px] h-[600px] bg-blue-50/10 rounded-full blur-[140px]" />
        
        {/* Tactical Light Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 pt-32 pb-40 px-6 md:px-12"
      >
        <div className="max-w-5xl mx-auto">
          {/* Header Section — Editorial Manifest */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] as const }}
            className="mb-32"
          >
            <p className="text-[10px] font-body font-black text-muted-foreground/60 tracking-[0.5em] uppercase mb-12">
              OUR VISION
            </p>

            <div className="overflow-hidden mb-8">
              <motion.h1
                initial={{ y: 120 }}
                animate={{ y: 0 }}
                transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] as const }}
                className="text-4xl md:text-6xl lg:text-7xl font-heading font-black text-heading leading-[0.85] tracking-tighter"
              >
                The <span className="text-foreground/10 italic">Future.</span>
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="text-sm md:text-md text-muted-foreground/60 max-w-lg leading-relaxed font-body font-bold uppercase tracking-[0.2em] opacity-80"
            >
              We are building the next generation of photography. A roadmap for innovations in imaging, access, and premium archival experiences.
            </motion.p>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
              className="mt-12 h-px bg-foreground/[0.05] origin-left shadow-sm"
            />
          </motion.div>

          {/* Timeline — Tactical Roadmap */}
          <div className="relative">
            {/* Animated vertical timeline line */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 2, delay: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
              className="absolute left-[38px] top-0 bottom-0 w-px origin-top bg-gradient-to-b from-foreground/10 via-foreground/[0.03] to-transparent shadow-sm"
            />

            <div className="space-y-12">
              {roadmapItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{
                      duration: 1,
                      delay: i * 0.15,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="relative pl-24 group"
                  >
                    {/* Timeline dot — Cinematic Pulse */}
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                        delay: i * 0.15 + 0.3,
                      }}
                      className="absolute left-6 top-6 w-8 h-8 rounded-full border border-foreground/[0.05] bg-background flex items-center justify-center shadow-lg"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-foreground/20 group-hover:bg-foreground transition-all duration-500" />
                    </motion.div>

                    {/* Roadmap Card — High-End Ivory */}
                    <motion.div
                      whileHover={{ y: -8, scale: 1.01 }}
                      className="p-10 md:p-12 rounded-[40px] border border-foreground/[0.03] bg-card hover:border-foreground/10 transition-all duration-700 shadow-2xl shadow-black/[0.01] relative overflow-hidden"
                    >
                       {/* Paper texture */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply" 
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

                      {/* Content hierarchy */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-8 relative z-10">
                        <div className="flex items-center gap-6">
                          <motion.div
                            whileHover={{ rotate: 12, scale: 1.1 }}
                            className="w-16 h-16 rounded-[22px] bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:bg-foreground group-hover:text-background"
                          >
                            <Icon className="w-6 h-6 text-foreground/40 group-hover:text-background transition-all duration-500" />
                          </motion.div>
                          <div>
                             <div className="flex items-center gap-3 mb-2 opacity-20">
                                <CornerRightDown className="w-3 h-3" />
                                <span className="text-[9px] font-mono tracking-widest uppercase mb-0.5">Feature Type</span>
                             </div>
                             <h3 className="text-2xl md:text-3xl font-heading font-black text-heading tracking-tighter">
                                {item.title}
                             </h3>
                          </div>
                        </div>

                        {/* Status badge — Archival Label */}
                        <span
                          className={`text-[10px] font-heading font-black tracking-[0.3em] uppercase px-5 py-2.5 rounded-full border shadow-sm ${item.statusColor} flex-shrink-0 transition-all duration-700`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <p className="text-sm md:text-base text-muted-foreground/60 leading-[1.6] font-body font-bold uppercase tracking-widest opacity-80 relative z-10 max-w-2xl">
                        {item.description}
                      </p>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Bottom teaser — Signature Visual */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
            className="mt-32 text-center"
          >
             <div className="h-px w-24 bg-foreground/10 mx-auto mb-10" />
             <div className="flex items-center justify-center gap-4 opacity-20 hover:opacity-100 transition-opacity duration-1000">
                <ShieldCheck className="w-4 h-4" />
                <p className="text-[10px] text-foreground font-heading font-black tracking-[0.5em] uppercase">
                POZHI STUDIO NEXT
                </p>
             </div>
          </motion.div>
        </div>
      </motion.main>
    </>
  );
};

export default Future;
