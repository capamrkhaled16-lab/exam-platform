import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';
import { type ReactNode } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtext: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  children?: ReactNode;
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  subtext,
  confirmLabel,
  cancelLabel = 'تراجع',
  variant = 'danger',
  children,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center">
        <div
          className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            variant === 'danger'
              ? 'bg-red-500/15 text-red-400'
              : 'bg-emerald-500/15 text-emerald-400'
          }`}
        >
          <AlertTriangle size={32} />
        </div>
        <h3
          className={`text-xl font-bold mb-2 ${
            variant === 'danger' ? 'text-red-300' : 'text-white'
          }`}
        >
          {title}
        </h3>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          {subtext}
        </p>
        {children}
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
