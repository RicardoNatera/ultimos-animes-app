'use client'

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SOURCE_ICONS, SOURCE_NAMES, type SourceName } from "@/types/sourceVars";

type DownloadModalProps = {
  onClose: () => void;
  downloads: { label: string; url: string; source?: SourceName; episode?: number }[];
};

export default function DownloadModal({ onClose, downloads }: DownloadModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Si los enlaces vienen de más de una fuente, se muestran separados por fuente
  const sources = [
    ...new Set(downloads.map((d) => d.source).filter((s): s is SourceName => !!s)),
  ];
  const sections =
    sources.length > 1
      ? sources.map((src) => ({
          source: src as SourceName | undefined,
          links: downloads.filter((d) => d.source === src),
        }))
      : [{ source: undefined as SourceName | undefined, links: downloads }];

  // Si cada sitio numera distinto el mismo capítulo, se aclara en cada sección
  const sectionEpisodes = new Set(sections.map((s) => s.links[0]?.episode));
  const showEpisodes = sections.length > 1 && sectionEpisodes.size > 1;
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center"
        onClick={handleBackdropClick}
      >
        <motion.div
          key="modal"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          ref={modalRef}
          className="p-6 mx-4 rounded-xl shadow-2xl max-w-lg w-full relative"
          style={{
            backgroundColor: "var(--panel)",
            color: "var(--foreground)"
          }}
        >
            <button
                onClick={onClose}
                className="absolute top-3 right-3 text-lg font-bold cursor-pointer"
                style={{ color: "var(--muted)" }}
                aria-label="Cerrar modal"
            >
                ×
            </button>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                Enlaces de descarga
            </h2>

            <div className="max-h-80 overflow-y-auto pr-1 space-y-4">
                {sections.map((section) => (
                    <div key={section.source ?? "all"}>
                        {section.source && (
                            <h3 className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: "var(--muted)" }}>
                                <img
                                    src={SOURCE_ICONS[section.source]}
                                    alt=""
                                    className="h-5 w-5 rounded-full"
                                />
                                {SOURCE_NAMES[section.source]}
                                {showEpisodes && section.links[0]?.episode !== undefined && (
                                    <span className="font-normal opacity-70">· episodio {section.links[0].episode}</span>
                                )}
                            </h3>
                        )}
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3">
                            {section.links.map((link, idx) => (
                             <a
                                key={idx}
                                href={link.url}
                                title={link.label}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium px-3 py-2 rounded shadow-sm border transition-colors duration-200 text-center truncate"
                                style={{
                                backgroundColor: "var(--panel)",
                                color: "var(--accent)",
                                borderColor: "var(--accent-border)",
                                borderWidth: "1px"
                                }}
                                onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--hover)";
                                }}
                                onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--panel)";
                                }}
                            >
                                {link.label}
                            </a>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}