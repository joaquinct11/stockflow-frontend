import type { ReactNode } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

export type ConfirmDialogType = 'warning' | 'danger' | 'success' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: ConfirmDialogType;
  icon?: ReactNode;
  isDangerous?: boolean;
}

const TYPE_CONFIG = {
  warning: {
    icon:       <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
    iconBg:     'bg-amber-100 dark:bg-amber-900/40',
    btnClass:   'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20',
  },
  danger: {
    icon:       <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />,
    iconBg:     'bg-red-100 dark:bg-red-900/40',
    btnClass:   'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20',
  },
  success: {
    icon:       <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
    iconBg:     'bg-emerald-100 dark:bg-emerald-900/40',
    btnClass:   'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20',
  },
  info: {
    icon:       <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
    iconBg:     'bg-blue-100 dark:bg-blue-900/40',
    btnClass:   'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20',
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText  = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'info',
  isDangerous = false,
}: ConfirmDialogProps) {
  const cfg = TYPE_CONFIG[type];
  const btnClass = isDangerous ? TYPE_CONFIG.danger.btnClass : cfg.btnClass;

  return (
    <Dialog isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="flex flex-col items-center gap-5 py-2">

        {/* Icono en contenedor coloreado */}
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${cfg.iconBg}`}>
          {cfg.icon}
        </div>

        {/* Mensaje */}
        <p className="text-center text-sm text-muted-foreground leading-relaxed whitespace-pre-line max-w-xs">
          {description}
        </p>

        {/* Botones */}
        <div className="flex gap-3 w-full pt-2 border-t">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            {cancelText}
          </Button>
          <Button type="button" onClick={onConfirm} className={`flex-1 ${btnClass}`}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
