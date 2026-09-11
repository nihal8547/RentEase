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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up relative border border-line"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-400 hover:text-ink-600 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDestructive ? 'bg-ruby-100 text-ruby-600' : 'bg-gold-100 text-gold-600'}`}>
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1 mt-1">
              <h3 className="text-lg font-serif font-bold text-ink-900 mb-1">{title}</h3>
              <p className="text-sm text-ink-600 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-sand-050 border-t border-line flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          <Button 
            variant={isDestructive ? 'destructive' : 'primary'} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
