import { motion } from "framer-motion";
import { Camera, Copy, BookOpen, Frame, Aperture, ArrowRight, CornerRightDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ServiceCard from "@/components/ServiceCard";
import Navbar from "@/components/Navbar";

import passphotoImg from "@/assets/services/passphoto.jpg";
import photocopiesImg from "@/assets/services/photocopies.jpg";
import albumImg from "@/assets/services/album.jpg";
import framesImg from "@/assets/services/frames.jpg";
import snapnprintImg from "@/assets/services/snapnprint.png";

const services = [
  {
    title: "PassPhoto",
    description:
      "Precision-crafted identification portraits. Compliance at its finest.",
    icon: Camera,
    image: passphotoImg,
    route: "/studio/passphoto",
  },
  {
    title: "Photo Copies",
    description:
      "High-fidelity digital asset replication. Preserving the original aura.",
    icon: Copy,
    image: photocopiesImg,
    route: "/studio/photocopies",
  },
  {
    title: "Album",
    description:
      "Artisanal archival volumes. Hand-bound for generations.",
    icon: BookOpen,
    image: albumImg,
    route: "/studio/album",
  },
  {
    title: "Frames",
    description:
      "Curated museum-grade bespoke framing for the modern atelier.",
    icon: Frame,
    image: framesImg,
    route: "/studio/frames",
  },
  {
    title: "Snap n' Print",
    description:
      "On-demand mobile atelier mobilization. Capture, curate, and deliver — anywhere.",
    icon: Aperture,
    image: snapnprintImg,
    route: "/studio/snapnprint",
  },
];

const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.12, delayChildren: 0.4 },
  },
};

const Studio = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar visible={true} />

      {/* Redundant background removed — handled by ThemeLayout */}

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 pt-32 pb-40 px-6 md:px-12"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section header — Editorial Layout */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-16 md:mb-24 px-2">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl text-left"
            >
              <div className="flex items-center gap-3 mb-6 md:mb-8 opacity-40">
                <CornerRightDown className="w-4 h-4" />
                <p className="text-[10px] font-body font-bold tracking-[0.5em] uppercase">

                </p>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-black text-heading leading-[0.95] tracking-tighter mb-6 md:mb-8">
                The <br /> <span className="text-foreground/20 italic">Studio.</span>
              </h1>
              <p className="text-xs md:text-base text-muted-foreground/60 leading-relaxed font-body tracking-wide max-w-md">
                Our curated suite of high-fidelity photography services. Each workflow is architected for precision, archival longevity, and artistic yield.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-end gap-2 border-t border-foreground/5 lg:border-none pt-8 lg:pt-0"
            >
              <div className="flex flex-col lg:items-end gap-1">
                <span className="text-[10px] font-body font-bold text-foreground/20 tracking-[0.4em] uppercase">Selection Hub</span>
                <p className="hidden lg:block text-[11px] font-body font-bold text-foreground/40 uppercase tracking-[0.2em] max-w-[120px] text-right">
                  Core Services <br /> Available Today
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="opacity-80 scale-[0.6] -mr-6 -my-4">
                  <img src="/favicon.ico" alt="Pozhi" className="w-16 h-16 object-contain" />
                </div>
                <p className="lg:hidden text-[11px] font-body font-bold text-foreground/40 uppercase tracking-[0.1em]">
                  Core Services
                </p>
              </div>
            </motion.div>
          </div>

          {/* Services Bento Grid — High Contrast Editorial */}
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr"
          >
            {services.map((service, index) => (
              <ServiceCard
                key={service.title}
                {...service}
                index={index}
                onClick={service.route ? () => navigate(service.route!) : undefined}
                className={
                  index === 0 ? "lg:col-span-1" :
                    index === 4 ? "md:col-span-2" : ""
                }
              />
            ))}
          </motion.div>

          {/* Bottom CTA — Archival Card Aesthetic */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 md:mt-32 p-6 md:p-16 rounded-[32px] md:rounded-[48px] border border-white/10 glass-pro relative overflow-hidden group shadow-3xl shadow-black/[0.03]"
          >
            {/* Soft geometric light wash */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-foreground/[0.02] rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/20 animate-pulse" />
                  <p className="text-[10px] text-muted-foreground font-bold tracking-[0.4em] uppercase font-body">
                    Ready to Capture?
                  </p>
                </div>
                <h2 className="text-3xl md:text-4xl font-heading font-black text-heading tracking-tight leading-none mb-4">
                  Initialize <br /> <span className="italic text-foreground/30">Your Session.</span>
                </h2>
                <p className="text-sm text-foreground/40 font-body tracking-[0.05em] leading-relaxed">
                  Collaborate with our studio leads to architect your perfect photographic project.
                  Immediate response for all premium inquiries.
                </p>
              </div>

              <button
                onClick={() => navigate("/contact")}
                className="group relative flex-shrink-0 px-12 py-6 bg-foreground text-background text-xs font-black tracking-[0.4em] uppercase rounded-full hover:bg-white hover:text-foreground hover:shadow-2xl transition-all duration-700 cursor-pointer overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Contact Atelier
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </span>
                <div className="absolute inset-x-0 h-full top-0 bg-transparent group-hover:bg-foreground/5 transition-all" />
              </button>
            </div>
          </motion.div>
        </div>
      </motion.main>
    </>
  );
};

export default Studio;
