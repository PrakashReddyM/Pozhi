import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, Copy, Check, Clock, ArrowRight, ShieldCheck, Zap } from "lucide-react";
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

const WHATSAPP_NUMBER = "919121201076";
const PHONE_DISPLAY = "+91 91212 01076";
const PHONE_RAW = "+919121201076";

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
    },
    {
      icon: Phone,
      label: "Phone Number",
      value: PHONE_DISPLAY,
      action: () => copyToClipboard(PHONE_RAW, "phone"),
      copied: copiedPhone,
      type: "phone" as const,
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
          {/* Header */}
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

          {/* Main grid */}
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

              {/* WhatsApp CTA */}
              <motion.a
                variants={cardVariants}
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Pozhi%2C%20I%27d%20like%20to%20enquire%20about%20your%20services.`}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -5, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full group text-left p-10 rounded-[40px] border border-[#25D366]/20 bg-[#25D366]/[0.04] hover:bg-[#25D366]/[0.08] hover:border-[#25D366]/40 transition-all duration-700 cursor-pointer relative overflow-hidden shadow-2xl shadow-black/[0.01] flex items-center gap-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center transition-all duration-500 group-hover:bg-[#25D366] flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366] group-hover:fill-white transition-colors duration-500">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.4em] mb-2 font-body font-black">
                    WhatsApp
                  </p>
                  <p className="text-xl md:text-2xl font-heading font-black text-heading tracking-tight">
                    Message Us
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-foreground/20 group-hover:text-[#25D366] group-hover:translate-x-1 transition-all duration-300 ml-auto" />
              </motion.a>

              {/* Book session CTA */}
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

            {/* Right — Studio Hours */}
            <motion.div variants={cardVariants}>
              <div className="h-full rounded-[60px] border border-foreground/[0.03] bg-card overflow-hidden relative shadow-2xl shadow-black/[0.02]">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

                <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.01] to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent shadow-sm" />

                <div className="relative p-12 lg:p-16 flex flex-col h-full gap-12">
                  {/* Studio Hours header */}
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center">
                      <Clock className="w-5 h-5 text-foreground/30" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.4em] mb-2 font-body font-black">
                        Opening Hours
                      </p>
                      <p className="text-2xl font-heading font-black text-heading uppercase tracking-tighter">
                        Studio Hours
                      </p>
                    </div>
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

                  {/* Quick WhatsApp repeat */}
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Pozhi%2C%20I%27d%20like%20to%20enquire%20about%20your%20services.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center gap-4 group/wa"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center group-hover/wa:bg-[#25D366] transition-colors duration-300">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366] group-hover/wa:fill-white transition-colors duration-300">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <span className="text-[10px] font-body font-black text-foreground/40 uppercase tracking-[0.4em] group-hover/wa:text-foreground/80 transition-colors">
                      Open WhatsApp Chat
                    </span>
                    <ArrowRight className="w-3 h-3 text-foreground/20 group-hover/wa:text-foreground/60 group-hover/wa:translate-x-1 transition-all duration-300" />
                  </a>

                  <div className="mt-auto flex items-center gap-3 opacity-20">
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
