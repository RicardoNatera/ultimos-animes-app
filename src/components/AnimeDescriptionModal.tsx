'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SOURCE_ICONS, SourceName } from '@/types/sourceVars';
import { ExternalLink } from 'lucide-react';

type AnimeDescriptionModalProps = {
  onClose: () => void;
  title: string;
  description: string;
  source: SourceName;
  url: string;
};

export default function AnimeDescriptionModal({
  onClose,
  title,
  description,
  source,
  url
}: AnimeDescriptionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Cerrar al hacer clic fuera del modal
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
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          key="modal"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          ref={modalRef}
          className="p-6 rounded-xl shadow-2xl max-w-md w-full relative max-h-[90vh] overflow-hidden"
          style={{
            backgroundColor: 'var(--panel)',
            color: 'var(--foreground)'
          }}
        >
          {/* Botón de cerrar */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-xl font-bold cursor-pointer"
            style={{ color: 'var(--muted)' }}
            aria-label="Cerrar modal"
          >
            ×
          </button>

          {/* Encabezado */}
          <div className="flex items-center gap-3 mb-4">
            <img
              src={SOURCE_ICONS[source]}
              alt={source}
              className="w-7 h-7 rounded-full bg-white p-0.5 border border-gray-300 shadow"
            />
            <h2 className="text-lg font-semibold leading-snug truncate" title={title}>
              {title}
            </h2>
          </div>

          {/* Descripción con scroll */}
          <div className="overflow-y-auto pr-2 text-sm text-[var(--muted-foreground)] leading-relaxed max-h-64 whitespace-pre-wrap">
            {description?.trim() ? description : 'Sin descripción disponible.'}
          </div>

          {/* Enlace a la fuente */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors duration-200"
            style={{
              color: 'var(--accent)',
              borderColor: 'var(--accent-border)',
              backgroundColor: 'var(--panel)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--panel)';
            }}
          >
            <ExternalLink size={16} />
            Ver en el sitio original
          </a>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
