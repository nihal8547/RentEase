import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm animate-fade-only">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in relative border border-line">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 w-7 h-7 flex items-center justify-center rounded-lg text-ink-400 hover:text-ink-900 hover:bg-sand-100 transition-colors"
        >
          <X size={15} />
        </button>

        <div className="p-6 pb-5">
          <div className="flex items-start gap-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isDestructive ? 'bg-ruby-100 text-ruby-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-base font-bold text-ink-900 leading-tight">{title}</h3>
              <p className="text-xs text-ink-600 mt-1.5 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2.5">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            size="sm"
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
