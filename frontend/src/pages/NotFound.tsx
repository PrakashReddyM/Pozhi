import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: Access failure at manifest path:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Navbar visible={true} />

      <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
        {/* Ambient warm lighting — Light Luxe Atmosphere */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-background">
            <div className="absolute top-[30%] right-[-10%] w-[800px] h-[800px] bg-orange-50/20 rounded-full blur-[160px]" />
            <div className="absolute bottom-[0%] left-[-5%] w-[600px] h-[600px] bg-blue-50/10 rounded-full blur-[140px]" />
            
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

        <div className="relative text-center px-6 z-10">
          {/* Giant Editorial 404 Manifest */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12"
          >
            <span
              className="font-heading font-black text-[clamp(6rem,18vw,14rem)] leading-none tracking-tighter select-none italic"
              style={{
                background: "linear-gradient(135deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.02) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              404
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-center gap-4 mb-6 opacity-40">
                <ShieldAlert className="w-5 h-5" />
                <span className="text-[10px] font-heading font-black tracking-[0.6em] uppercase">MANIFEST PATH // CORRUPTED</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-heading font-black text-heading mb-6 tracking-tighter uppercase">
              Signal Lost.
            </h1>
            <p className="text-sm md:text-md text-muted-foreground/60 mb-12 max-w-sm mx-auto leading-relaxed font-body font-bold uppercase tracking-[0.2em] opacity-80">
              This coordinate does not exist in our archival portfolio ledger. Let's return you to the secure atelier terminal.
            </p>

            <button
              onClick={() => navigate("/")}
              className="cursor-pointer inline-flex items-center gap-6 text-[10px] font-heading font-black text-background bg-foreground px-12 py-6 rounded-3xl hover:bg-black transition-all shadow-3xl uppercase tracking-[0.4em] group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-2 transition-transform" />
              TERMINAL HUB
            </button>
          </motion.div>
          
          <div className="mt-24 opacity-10">
             <div className="h-px w-24 bg-foreground mx-auto mb-10" />
             <p className="text-[9px] font-body font-black text-foreground uppercase tracking-[0.6em] pointer-events-none">
                POZHI ERROR LOG // 0X404.ARCHIVE
             </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
