import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  image?: string;
  index: number;
  className?: string;
  onClick?: () => void;
}

const ServiceCard = ({
  title,
  description,
  icon: Icon,
  image,
  index,
  className = "",
  onClick,
}: ServiceCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, scale: 1.02 }}
      onClick={onClick}
      className={`group relative rounded-3xl border border-white/10 overflow-hidden cursor-pointer transition-all duration-700 glass-pro shadow-2xl shadow-black/[0.02] ${className}`}
    >
      {/* Image with light editorial overlay */}
      {image && (
        <div className="relative w-full h-52 overflow-hidden">
          <motion.img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110"
            style={{ filter: "contrast(1.05) brightness(1.02) saturate(1.1)" }}
          />
          {/* Transparent Gradient Fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
          {/* Subtle paper grain texture */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply pointer-events-none" 
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-8 md:p-10">
        {/* Icon + Arrow row */}
        <div className="flex items-start justify-between mb-8">
          <div className="w-12 h-12 rounded-2xl bg-foreground/5 border border-foreground/5 flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground transition-all duration-500">
            <Icon className="w-5 h-5 text-foreground/60 group-hover:text-background transition-colors duration-500" />
          </div>

          {/* Arrow icon — scale & rotate in on hover */}
          <div className="w-11 h-11 rounded-full border border-foreground/10 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:rotate-0 -rotate-45 group-hover:translate-x-0 translate-x-4 transition-all duration-700">
            <ArrowUpRight className="w-5 h-5 text-foreground" />
          </div>
        </div>

        {/* Title — High contrast Serif */}
        <h3 className="text-2xl md:text-3xl font-heading font-black text-heading mb-4 tracking-tight leading-none transition-transform duration-500 group-hover:translate-x-1">
          {title}
        </h3>

        {/* Description — Muted sans */}
        <p className="text-sm text-muted-foreground/80 leading-relaxed font-body max-w-[260px] opacity-80 group-hover:opacity-100 transition-opacity duration-500">
          {description}
        </p>

        {/* Bottom accent line — Cinematic Reveal */}
        <div className="mt-10 h-[2px] w-0 bg-foreground/10 group-hover:w-full transition-all duration-1000 ease-[0.22,1,0.36,1]" />
      </div>

      {/* Subtle border bleed */}
      <div className="absolute inset-0 border border-foreground/[0.02] rounded-2xl pointer-events-none" />
    </motion.div>
  );
};

export default ServiceCard;
