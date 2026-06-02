import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Dialog({ isOpen, onClose, title, description, children, size = 'md' }: DialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm:   'max-w-md',
    md:   'max-w-lg',
    lg:   'max-w-2xl',
    xl:   'max-w-4xl',
    full: 'max-w-7xl',
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Contenedor centrado */}
      <div className="fixed inset-0 top-16 flex items-center justify-center p-4 pointer-events-none">
        {/* Modal */}
        <div
          className={[
            'pointer-events-auto relative bg-background rounded-2xl shadow-2xl shadow-black/20 w-full',
            'ring-1 ring-border/50',
            sizeClasses[size],
            'max-h-[calc(100vh-5rem)] overflow-y-auto',
            'animate-in zoom-in-95 fade-in duration-200',
          ].join(' ')}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b px-6 py-4 flex items-start justify-between rounded-t-2xl">
            <div className="pr-4">
              <h2 className="text-lg font-semibold leading-snug">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 -mt-1 -mr-2 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
