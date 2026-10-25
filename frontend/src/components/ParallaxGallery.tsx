import { useEffect, memo } from "react";
import { motion } from "framer-motion";

import img1 from "@/assets/parallax/01.jpg";
import img2 from "@/assets/parallax/02.jpg";
import img3 from "@/assets/parallax/03.jpg";
import img4 from "@/assets/parallax/04.jpg";
import img6 from "@/assets/parallax/06.jpg";
import img7 from "@/assets/parallax/07.jpg";
import img8 from "@/assets/parallax/08.jpg";
import img9 from "@/assets/parallax/09.jpg";
import img10 from "@/assets/parallax/10.jpg";
import img11 from "@/assets/parallax/11.jpg";
import img12 from "@/assets/parallax/12.jpg";

const columns = [
  { images: [img11, img7, img3], speed: 42, scale: 1, opacity: 0.3, isHalf: true },
  { images: [img1, img2, img3], speed: 35, scale: 1, opacity: 0.8, isHalf: false },
  { images: [img4, img6, img7], speed: 25, scale: 1, opacity: 0.5, isHalf: false },
  { images: [img8, img9, img10], speed: 45, scale: 1, opacity: 0.7, isHalf: false },
  { images: [img11, img12, img1], speed: 30, scale: 1, opacity: 0.4, isHalf: false },
  { images: [img2, img9, img12], speed: 38, scale: 1, opacity: 0.3, isHalf: true },
];

const allAssetImages = [img1, img2, img3, img4, img6, img7, img8, img9, img10, img11, img12];

interface ScrollColumnProps {
  images: string[];
  direction: "up" | "down";
  baseSpeed: number;
  warpSpeed: boolean;
  scale: number;
  opacity: number;
  index: number;
  isHalf?: boolean;
}

const ScrollColumn = memo(({ 
  images, 
  direction, 
  baseSpeed, 
  warpSpeed, 
  scale, 
  opacity,
  index,
  isHalf = false
}: ScrollColumnProps) => {
  // Create an infinite loop by doubling the images
  const allImages = [...images, ...images];

  // Calculate duration based on speed
  const duration = warpSpeed ? 2 : baseSpeed;

  const colWidthClass = isHalf ? "w-[22.5vw] md:w-[10vw] max-w-[160px]" : "w-[45vw] md:w-[20vw] max-w-[320px]";
  // 4/5 aspect ratio means height = width * 1.25. 
  // 45vw * 1.25 = 56.25vw. 20vw * 1.25 = 25vw. 320px * 1.25 = 400px.
  const imgHeightClass = "h-[56.25vw] md:h-[25vw] max-h-[400px]"; 
  
  // On mobile, show only columns 1 and 2 (the first two full ones)
  const displayClass = (index === 1 || index === 2) ? "block" : "hidden md:block";

  return (
    <div 
      className={`relative ${colWidthClass} overflow-hidden h-[130vh] ${displayClass}`}
      style={{ 
        transform: `scale(${scale})`,
        opacity: opacity,
        contain: "strict"
      }}
    >
      <div 
        className={`flex flex-col gap-[10px] will-change-transform ${
            direction === "up" ? "parallax-col-up" : "parallax-col-down"
        }`}
        style={{ 
            animationDuration: `${duration}s`,
            willChange: "transform"
        }}
      >
        {allImages.map((src, i) => (
          <div
            key={i}
            className={`relative w-full ${imgHeightClass} rounded-[10px] overflow-hidden flex-shrink-0 bg-zinc-400/5`}
            style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden" }}
          >
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
              draggable={false}
              style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

ScrollColumn.displayName = "ScrollColumn";

interface ParallaxGalleryProps {
  visible: boolean;
  warpSpeed?: boolean;
}

const ParallaxGallery = memo(({ visible, warpSpeed = false }: ParallaxGalleryProps) => {
  // Preload all images on mount to ensure they are in cache
  useEffect(() => {
    allAssetImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: visible ? 1 : 0, scale: 1 }}
      transition={{ duration: 1.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <style>
        {`
          @keyframes parallax-up {
            from { transform: translate3d(0, 0, 0); }
            to { transform: translate3d(0, -50%, 0); }
          }
          @keyframes parallax-down {
            from { transform: translate3d(0, -50%, 0); }
            to { transform: translate3d(0, 0, 0); }
          }
          .parallax-col-up {
            animation: parallax-up linear infinite;
          }
          .parallax-col-down {
            animation: parallax-down linear infinite;
          }
        `}
      </style>
      <div className="absolute inset-[-15%] flex gap-[10px] justify-center items-center">
        {columns.map((col, colIdx) => (
          <ScrollColumn
            key={colIdx}
            index={colIdx}
            images={col.images}
            direction={colIdx % 2 === 0 ? "up" : "down"}
            baseSpeed={col.speed}
            warpSpeed={warpSpeed}
            scale={col.scale}
            opacity={col.opacity}
            isHalf={col.isHalf}
          />
        ))}
      </div>

      {/* Premium Multi-layer gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/60 pointer-events-none" />
      
      {/* Side vignette */}
      <div className="absolute inset-x-0 inset-y-0 bg-[radial-gradient(circle_at_center,transparent_30%,hsl(var(--background))_110%)] pointer-events-none opacity-40" />
    </motion.div>
  );
});

ParallaxGallery.displayName = "ParallaxGallery";

export default ParallaxGallery;
