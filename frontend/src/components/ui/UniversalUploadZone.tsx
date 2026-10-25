import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, ShieldCheck, FileImage, CornerRightDown } from "lucide-react";

interface UniversalUploadZoneProps {
  label: string;
  image: string | null;
  onUpload: (url: string, file: File) => void;
  onClear: () => void;
  className?: string;
}

const UniversalUploadZone = ({
  label,
  image,
  onUpload,
  onClear,
  className = "",
}: UniversalUploadZoneProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = useCallback((file: File) => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      onUpload(url, file);
    }
  }, [onUpload]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelection(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6 opacity-30">
        <CornerRightDown className="w-3.5 h-3.5" />
        <p className="text-[10px] font-body font-black uppercase tracking-[0.4em]">
          {label}
        </p>
      </div>

      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !image && inputRef.current?.click()}
        whileHover={!image ? { y: -6, borderColor: "rgba(0,0,0,0.12)" } : {}}
        className={`relative group min-h-[320px] rounded-[32px] border transition-all duration-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer ${
          image
            ? "border-foreground/10 bg-card shadow-xl shadow-black/[0.03]"
            : isDragActive
            ? "border-foreground/40 bg-foreground/[0.05] shadow-2xl"
            : "border-foreground/5 bg-foreground/[0.01] hover:bg-foreground/[0.03]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />

        {/* Paper texture overlay */}
        <div className="absolute inset-0 opacity-[0.02] mix-blend-multiply pointer-events-none" 
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

        <AnimatePresence mode="wait">
          {image ? (
            <motion.div
              key="image"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full h-full p-6 flex items-center justify-center"
            >
              <div className="relative group/preview w-full h-full rounded-2xl overflow-hidden aspect-video md:aspect-auto">
                <img
                    src={image}
                    alt={label}
                    className="w-full h-full object-cover rounded-2xl shadow-lg saturate-[1.05] contrast-[1.05] transition-transform duration-700 group-hover/preview:scale-110"
                />
                
                {/* Overlay controls */}
                <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/20 transition-colors duration-500 flex items-center justify-center opacity-0 group-hover/preview:opacity-100">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                        className="p-5 bg-white text-black rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
              </div>
              
              <div className="absolute bottom-10 left-10">
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-md border border-foreground/[0.05]">
                    <ShieldCheck className="w-3 h-3 text-foreground/40" />
                    <span className="text-[9px] font-mono font-bold text-foreground/60 uppercase tracking-widest">Ingress locked</span>
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-8 p-12 text-center"
            >
              <div className={`w-28 h-28 rounded-[40px] bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground transition-all duration-700 ${isDragActive ? "scale-110 bg-foreground" : ""}`}>
                {isDragActive ? (
                   <FileImage className="w-10 h-10 text-background" />
                ) : (
                   <Upload className="w-10 h-10 text-foreground/30 group-hover:text-background group-hover:scale-110 transition-all duration-500" />
                )}
              </div>
              
              <div className="space-y-3">
                <h6 className="text-xl font-heading font-black text-heading uppercase tracking-tight mb-1">
                    Initialize <span className="italic">Archetype</span>
                </h6>
                <div className="flex items-center justify-center gap-4">
                    <div className="h-px w-8 bg-foreground/10" />
                    <p className="text-[10px] text-muted-foreground/40 font-body font-black tracking-[0.4em] uppercase">
                        High-Fidelity Ingress
                    </p>
                    <div className="h-px w-8 bg-foreground/10" />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-full border border-foreground/[0.03] bg-foreground/[0.01]">
                   <ShieldCheck className="w-3.5 h-3.5 text-foreground/20" />
                   <span className="text-[9px] font-body font-black text-foreground/30 uppercase tracking-[0.2em]">Archival Compliance Guaranteed</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default UniversalUploadZone;
