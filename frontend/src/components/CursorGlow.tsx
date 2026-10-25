import { useEffect, useRef, useState } from "react";

const CursorGlow = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const mouse = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>();

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`;
        dotRef.current.style.top = `${e.clientY}px`;
      }
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    const animate = () => {
      const ring = ringRef.current;
      if (ring) {
        ringPos.current.x += (mouse.current.x - ringPos.current.x) * 0.12;
        ringPos.current.y += (mouse.current.y - ringPos.current.y) * 0.12;
        ring.style.left = `${ringPos.current.x}px`;
        ring.style.top = `${ringPos.current.y}px`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    // Expand ring on interactive elements
    const onHoverIn = () => setIsHovering(true);
    const onHoverOut = () => setIsHovering(false);

    const interactables = document.querySelectorAll(
      "button, a, [role='button'], .cursor-pointer"
    );
    interactables.forEach((el) => {
      el.addEventListener("mouseenter", onHoverIn);
      el.addEventListener("mouseleave", onHoverOut);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      interactables.forEach((el) => {
        el.removeEventListener("mouseenter", onHoverIn);
        el.removeEventListener("mouseleave", onHoverOut);
      });
    };
  }, [visible]);

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        className="cursor-dot"
        style={{
          opacity: visible ? 1 : 0,
          width: isHovering ? "12px" : "8px",
          height: isHovering ? "12px" : "8px",
        }}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        className="cursor-ring"
        style={{
          opacity: visible ? 1 : 0,
          width: isHovering ? "56px" : "36px",
          height: isHovering ? "56px" : "36px",
          transition: "width 0.2s, height 0.2s, opacity 0.2s",
        }}
      />
    </>
  );
};

export default CursorGlow;
