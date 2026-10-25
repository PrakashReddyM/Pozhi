import { motion, AnimatePresence } from "framer-motion";
import { Upload, ImageIcon, X, Plus } from "lucide-react";
import { useState, useRef } from "react";

export interface SelectedImage {
  url: string;
  file: File;
}

interface CopyPreviewProps {
  aspectRatio: string;
  sizeLabel: string;
  maxImages?: number;
  onImagesSelect: (images: SelectedImage[]) => void;
  selectedImages: SelectedImage[];
}

const CopyPreview = ({ aspectRatio, sizeLabel, maxImages = 1, onImagesSelect, selectedImages }: CopyPreviewProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    const remaining = maxImages - selectedImages.length;
    const filesToAdd = files.slice(0, remaining);

    const newImages: SelectedImage[] = [];
    let loadedCount = 0;

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push({ url: reader.result as string, file });
        loadedCount++;
        if (loadedCount === filesToAdd.length) {
          onImagesSelect([...selectedImages, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    const updated = [...selectedImages];
    updated.splice(index, 1);
    onImagesSelect(updated);
    
    if (previewIndex === index) {
      setPreviewIndex(0);
    } else if (previewIndex > index) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  const hasMaxImages = selectedImages.length >= maxImages;
  
  return (
    <div className="space-y-6">
      {/* Upload area */}
      <input
        type="file"
        multiple={maxImages > 1}
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="space-y-4">
        {selectedImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {selectedImages.map((img, idx) => (
              <motion.div 
                key={img.file.name + idx} 
                layout 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.8 }} 
                onClick={() => setPreviewIndex(idx)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer shadow-sm group transition-colors ${
                  previewIndex === idx ? "border-primary" : "border-primary/20 hover:border-primary/50"
                }`}
              >
                <img src={img.url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(idx);
                  }}
                  className="absolute top-1 right-1 p-1 bg-background/80 backdrop-blur-sm rounded-full text-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
            {!hasMaxImages && (
              <motion.button 
                layout 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-surface/50 hover:bg-accent/30 flex flex-col items-center justify-center gap-2 transition-colors group"
              >
                <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Add</span>
              </motion.button>
            )}
          </div>
        )}

        {selectedImages.length === 0 && (
          <motion.div
            layout
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors duration-300 border-border bg-surface/50 hover:border-primary/40 hover:bg-accent/30 cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Upload Your {maxImages > 1 ? "Photos" : "Photo"}</p>
            <p className="text-xs text-muted-foreground">
              {maxImages > 1 ? `Select up to ${maxImages} photos` : "Click to select photo for printing"}
            </p>
          </motion.div>
        )}
      </div>

      {/* Frame preview */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Print Preview
          </p>
          <AnimatePresence mode="wait">
            <motion.span
              key={sizeLabel}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="text-xs font-mono text-primary bg-accent px-2 py-0.5 rounded-md"
            >
              {sizeLabel}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${aspectRatio}-${selectedImages[previewIndex]?.url || 'none'}`}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[280px] rounded-lg bg-muted border border-border/50 flex items-center justify-center overflow-hidden"
              style={{ aspectRatio }}
            >
              {selectedImages.length > 0 && selectedImages[previewIndex] ? (
                <img src={selectedImages[previewIndex].url} alt="Copy Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          {sizeLabel} {selectedImages.length > 1 && `(Showing ${previewIndex + 1} of ${selectedImages.length})`}
        </p>
      </div>
    </div>
  );
};

export default CopyPreview;
