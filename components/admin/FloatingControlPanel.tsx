import { useLayoutEffect, useRef, type HTMLAttributes, type RefObject } from "react";

/** Keep the existing calendar/select design above scrolling tables and dialogs. */
export default function FloatingControlPanel({ anchor, floating = false, children, style, ...props }: HTMLAttributes<HTMLDivElement> & { anchor: RefObject<HTMLDivElement | null>; floating?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = panel.current;
    if (!floating || !node || !anchor.current) return;
    const position = () => {
      const rect = anchor.current!.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, "calendar" in node.dataset ? 305 : 240), window.innerWidth - 24);
      const height = Math.min(node.scrollHeight, 370);
      const below = window.innerHeight - rect.bottom - 18;
      const above = rect.top - 18;
      const flip = below < Math.min(height, 250) && above > below;
      const available = Math.max(100, flip ? above : below);
      Object.assign(node.style, { position: "fixed", inset: "auto", margin: "0", width: `${width}px`, maxHeight: `${Math.min(height, available)}px`, left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`, top: `${flip ? Math.max(12, rect.top - Math.min(height, available) - 8) : rect.bottom + 8}px`, overflowY: "auto", zIndex: "500" });
    };
    if (typeof node.showPopover === "function") { try { node.showPopover(); } catch {} }
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => { window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); if (typeof node.hidePopover === "function") { try { node.hidePopover(); } catch {} } };
  }, [floating, anchor]);
  return <div {...props} ref={panel} popover={floating ? "manual" : undefined} data-admin-control-panel={floating || undefined} style={style}>{children}</div>;
}
