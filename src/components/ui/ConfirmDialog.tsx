import type { ReactNode } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

export type ConfirmDialogType = 'warning' | 'danger' | 'success' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: ConfirmDialogType;
  icon?: ReactNode;
  isDangerous?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'info',
  isDangerous = false,
}: ConfirmDialogProps) {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-12 w-12 text-orange-600" />;
      case 'danger':
        return <XCircle className="h-12 w-12 text-red-600" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'info':
        return <Info className="h-12 w-12 text-blue-600" />;
    }
  };

  const getButtonColor = () => {
    if (isDangerous) return 'bg-red-600 hover:bg-red-700';
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'warning':
        return 'bg-orange-600 hover:bg-orange-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Icon */}
        <div className="flex justify-center">
          {getIcon()}
        </div>

        {/* Message */}
        <p className="text-center text-sm text-muted-foreground">
          {description}
        </p>

        {/* Buttons */}
        <div className="flex gap-3 w-full pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={`flex-1 text-white ${getButtonColor()}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}