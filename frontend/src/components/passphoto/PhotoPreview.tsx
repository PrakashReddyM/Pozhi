import { motion, AnimatePresence } from "framer-motion";
import { Upload, User, X } from "lucide-react";
import type { Category, Pack } from "@/lib/passphoto-data";
import { useState, useRef } from "react";

interface PhotoPreviewProps {
  category: Category;
  selectedPack: Pack;
  onImageSelect: (imageUrl: string | null, file?: File | null) => void;
  selectedImage: string | null;
}

const PhotoPreview = ({ category, selectedPack, onImageSelect, selectedImage }: PhotoPreviewProps) => {
  const gridCount = Math.min(selectedPack.copies, category.columns * category.rows);
  const isVisa = category.id === "visa";
  const isStamp = category.id === "stamp";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(reader.result as string, file);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      <motion.div
        layout
        onClick={() => !selectedImage && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors duration-300 ${
          selectedImage 
            ? "border-primary/20 bg-primary/5 cursor-default" 
            : "border-border bg-surface/50 hover:border-primary/40 hover:bg-accent/30 cursor-pointer group"
        }`}
      >
        {selectedImage ? (
          <>
            <div className="relative w-32 h-40 rounded-lg overflow-hidden border-2 border-primary shadow-lg">
              <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onImageSelect(null);
                }}
                className="absolute top-1 right-1 p-1 bg-background/80 backdrop-blur-sm rounded-full text-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm font-semibold text-primary">Photo Uploaded Successfully</p>
            <p className="text-xs text-muted-foreground">Click the X to change photo</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Upload Your Photo</p>
            <p className="text-xs text-muted-foreground">Click or drag & drop</p>
          </>
        )}
      </motion.div>

      {/* Print sheet preview */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Print Preview
          </p>
          <span className="text-xs font-mono text-primary bg-accent px-2 py-0.5 rounded-md">
            {category.aspectLabel}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${category.id}-${selectedPack.id}-${selectedImage}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${category.columns}, 1fr)`,
            }}
          >
            {Array.from({ length: gridCount }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.01, duration: 0.3 }}
                className={`rounded-md overflow-hidden bg-muted flex items-center justify-center border border-border/50 ${
                  isVisa ? "aspect-square" : isStamp ? "aspect-[5/6]" : "aspect-[7/9]"
                }`}
              >
                {selectedImage ? (
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground/40" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        <p className="text-xs text-muted-foreground text-center mt-3">
          {selectedPack.label} • {category.label}
        </p>
      </div>
    </div>
  );
};

export default PhotoPreview;

