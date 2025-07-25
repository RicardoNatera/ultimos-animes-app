'use client'

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type DownloadModalProps = {
  onClose: () => void;
  downloads: { label: string; url: string }[];
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
          className="p-6 rounded-xl shadow-2xl max-w-md w-full relative"
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

            <div className="max-h-64 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {downloads.map((link, idx) => (
                    <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium px-3 py-2 rounded shadow-sm border transition-colors duration-200 text-center"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
