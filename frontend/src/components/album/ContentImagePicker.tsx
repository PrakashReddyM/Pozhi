import { useEffect, useRef } from "react";
import { Reorder, motion, AnimatePresence } from "framer-motion";
import { Upload, X, GripVertical, Loader2 } from "lucide-react";

export interface ContentImage {
  id: string;
  url: string;
  file: File;
}

interface ContentImagePickerProps {
  images: ContentImage[];
  onChange: (images: ContentImage[]) => void;
  maxImages: number;
  disabled?: boolean;
}

const LARGE_BATCH_WARNING = 60;

const ContentImagePicker = ({ images, onChange, maxImages, disabled }: ContentImagePickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Object URLs are only ever held client-side before upload — revoke
  // everything on unmount so a 100-image session doesn't leak blob memory.
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const remaining = maxImages - images.length;
    const toAdd = incoming.slice(0, remaining);

    const newImages: ContentImage[] = toAdd.map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      file,
    }));

    onChange([...images, ...newImages]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeImage = (id: string) => {
    const target = images.find((i) => i.id === id);
    if (target) URL.revokeObjectURL(target.url);
    onChange(images.filter((i) => i.id !== id));
  };

  const atCap = images.length >= maxImages;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Content Photos ({images.length}/{maxImages})
        </p>
        {images.length > 1 && (
          <p className="text-xs text-muted-foreground">Drag tiles to reorder</p>
        )}
      </div>

      {images.length > LARGE_BATCH_WARNING && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          You've selected {images.length} photos — large batches can be slow on mobile data or older devices.
          Consider adding them in two batches if things feel sluggish.
        </p>
      )}

      {images.length > 0 && (
        <Reorder.Group
          axis="y"
          as="div"
          values={images}
          onReorder={onChange}
          className="grid grid-cols-3 sm:grid-cols-4 gap-3"
        >
          <AnimatePresence>
            {images.map((img, idx) => (
              <Reorder.Item
                key={img.id}
                value={img}
                as="div"
                className="relative aspect-square rounded-lg overflow-hidden border-2 border-primary/20 bg-surface/50 cursor-grab active:cursor-grabbing group"
                whileDrag={{ scale: 1.05, zIndex: 10 }}
              >
                <img
                  src={img.url}
                  alt={`Content ${idx + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-background/80 text-[10px] font-semibold">
                  {idx + 1}
                </div>
                <GripVertical className="absolute bottom-1 left-1 w-3.5 h-3.5 text-white/80 drop-shadow" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(img.id);
                  }}
                  disabled={disabled}
                  className="absolute top-1 right-1 p-1 bg-background/80 backdrop-blur-sm rounded-full text-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {!atCap && (
        <motion.button
          type="button"
          layout
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-surface/50 hover:bg-accent/30 flex flex-col items-center justify-center gap-2 py-6 transition-colors group disabled:opacity-60"
        >
          {disabled ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
          <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
            {images.length === 0 ? `Select up to ${maxImages} photos` : `Add more (${maxImages - images.length} left)`}
          </span>
        </motion.button>
      )}
    </div>
  );
};

export default ContentImagePicker;
