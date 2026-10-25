import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, MapPin, Copy, Check, Clock, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 30, filter: "blur(10px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const Contact = () => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const navigate = useNavigate();

  const copyToClipboard = (text: string, type: "email" | "phone") => {
    navigator.clipboard.writeText(text);
    toast.success(`${type === "email" ? "Email address" : "Phone number"} copied to clipboard.`);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const contactItems = [
    {
      icon: Mail,
      label: "Email Address",
      value: "hello@pozhi.studio",
      action: () => copyToClipboard("hello@pozhi.studio", "email"),
      copied: copiedEmail,
      type: "email" as const,
      href: "mailto:hello@pozhi.studio",
    },
    {
      icon: Phone,
      label: "Phone Number",
      value: "+91 98765 43210",
      action: () => copyToClipboard("+91 98765 43210", "phone"),
      copied: copiedPhone,
      type: "phone" as const,
      href: "tel:+919876543210",
    },
  ];

  return (
    <>
      <Navbar visible={true} />

      {/* Ambient warm lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-background">
        <div className="absolute top-[20%] right-[-10%] w-[700px] h-[700px] bg-orange-50/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] left-[-15%] w-[600px] h-[600px] bg-blue-50/10 rounded-full blur-[160px]" />
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
            className="mb-24"
          >
            <p className="text-[10px] font-body font-black text-muted-foreground/60 tracking-[0.5em] uppercase mb-8">
              CONTACT US
            </p>
            <h1 className="text-4xl md:text-6xl font-heading font-black text-heading leading-[0.85] tracking-tighter mb-8">
              Get in <br /> <span className="text-foreground/10 italic">Touch.</span>
            </h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
              className="h-px bg-foreground/[0.05] origin-left mt-12 shadow-sm"
            />
          </motion.div>

          {/* Main grid — BENTO High Contrast */}
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="grid lg:grid-cols-2 gap-8 items-start"
          >
            {/* Left — Contact cards */}
            <div className="flex flex-col gap-6">
              {contactItems.map((item) => (
                <motion.button
                  key={item.label}
                  variants={cardVariants}
                  whileHover={{ y: -5, backgroundColor: "rgba(0,0,0,0.01)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={item.action}
                  className="w-full group text-left p-10 rounded-[40px] border border-foreground/[0.03] bg-card hover:border-foreground/10 transition-all duration-700 cursor-pointer relative overflow-hidden shadow-2xl shadow-black/[0.01]"
                >
                    {/* Paper texture */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply" 
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] border border-foreground/5 flex items-center justify-center transition-all duration-500 group-hover:bg-foreground group-hover:text-background">
                        <item.icon className="w-5 h-5 text-foreground/40 transition-colors duration-500 group-hover:text-background" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.4em] mb-2 font-body font-black">
                          {item.label}
                        </p>
                        <p className="text-xl md:text-2xl font-heading font-black text-heading tracking-tight">
                          {item.value}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex-shrink-0">
                      <AnimatePresence mode="wait">
                        {item.copied ? (
                            <motion.div
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            >
                            <Check className="w-5 h-5 text-foreground/40" />
                            </motion.div>
                        ) : (
                            <motion.div key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <Copy className="w-5 h-5 text-foreground/10 group-hover:text-foreground/40 transition-all duration-300" />
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.button>
              ))}

              {/* Book session CTA — Premium Light Visual */}
              <motion.div
                variants={cardVariants}
                className="relative p-12 rounded-[50px] border border-foreground/[0.03] bg-foreground/[0.015] overflow-hidden group shadow-xl shadow-black/[0.01]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.01] via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent shadow-sm" />
                <div className="relative">
                   <div className="flex items-center gap-3 mb-6 opacity-20">
                      <Zap className="w-4 h-4 fill-current" />
                      <span className="text-[10px] font-body font-black text-foreground uppercase tracking-[0.5em]">STUDIO LINK</span>
                   </div>
                  <p className="text-2xl font-heading font-black text-heading tracking-tighter mb-4 uppercase">
                    Ready to book?
                  </p>
                  <p className="text-sm text-muted-foreground/60 leading-relaxed font-body font-bold uppercase tracking-widest mb-10 opacity-60">
                    Walk into our studio or reach out to us to book your next session. We specialize in capturing your legacy.
                  </p>
                  <button
                    onClick={() => navigate("/studio")}
                    className="cursor-pointer flex items-center gap-4 text-[10px] font-heading font-black text-foreground tracking-[0.4em] uppercase hover:gap-6 transition-all duration-500 group/btn"
                  >
                    VIEW SERVICES
                    <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover/btn:translate-x-2" />
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Right — Location + Hours Hub */}
            <motion.div variants={cardVariants}>
              <div className="h-full rounded-[60px] border border-foreground/[0.03] bg-card overflow-hidden relative shadow-2xl shadow-black/[0.02]">
                 {/* Subtle paper texture */}
                 <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply" 
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

                <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.01] to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent shadow-sm" />

                <div className="relative p-12 lg:p-16 flex flex-col h-full gap-12">
                  {/* Location header */}
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-foreground/30" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.4em] mb-2 font-body font-black">
                        Our Location
                      </p>
                      <p className="text-2xl font-heading font-black text-heading uppercase tracking-tighter">
                        Visit Our Studio
                      </p>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <p className="text-md font-body font-black text-foreground/80 mb-3 uppercase tracking-widest">
                      Pozhi Photography Studio
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed font-body font-bold uppercase tracking-[0.2em] opacity-40">
                      123 Creative Lane, Art District
                      <br />
                      Chennai, Tamil Nadu 600001
                      <br />
                      India
                    </p>
                  </div>

                  {/* Map Archive Visual — High End Gallery Effect */}
                  <div className="flex-1 rounded-[40px] bg-foreground/[0.02] border border-foreground/[0.05] flex items-center justify-center min-h-[160px] overflow-hidden relative shadow-inner">
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.01) 0%, transparent 70%)",
                      }}
                    />
                    <div className="text-center relative z-10">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-foreground/5 shadow-xl mx-auto mb-6 transform hover:scale-110 transition-transform duration-700">
                         <MapPin className="w-6 h-6 text-foreground/20" />
                      </div>
                      <p className="text-[10px] text-foreground/20 tracking-[0.6em] uppercase font-body font-black">
                        CHENNAI // ARCHIVE.001
                      </p>
                    </div>
                  </div>

                  {/* Studio Hours */}
                  <div className="pt-12 border-t border-foreground/[0.05]">
                    <div className="flex items-center gap-4 mb-8">
                       <span className="text-[11px] font-heading font-black text-heading">STUDIO HOURS</span>
                       <div className="w-12 h-px bg-foreground/10" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center group/day">
                        <span className="text-[10px] text-muted-foreground/40 font-body font-black uppercase tracking-[0.4em] group-hover/day:text-foreground/80 transition-colors">Mon – Sat</span>
                        <div className="h-px flex-1 mx-4 bg-foreground/[0.05] shadow-sm" />
                        <span className="text-xs font-heading font-black text-heading tracking-widest uppercase">09:00 — 20:00</span>
                      </div>
                      <div className="flex justify-between items-center group/day">
                        <span className="text-[10px] text-muted-foreground/40 font-body font-black uppercase tracking-[0.4em] group-hover/day:text-foreground/80 transition-colors">Sunday</span>
                        <div className="h-px flex-1 mx-4 bg-foreground/[0.05] shadow-sm" />
                        <span className="text-xs font-heading font-black text-heading tracking-widest uppercase italic">10:00 — 17:00</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3 opacity-20">
                     <ShieldCheck className="w-4 h-4" />
                     <p className="text-[9px] font-body font-black text-foreground uppercase tracking-[0.4em]">Secure Connection</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.main>
    </>
  );
};

export default Contact;
