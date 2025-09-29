// frontend/components/ConfirmModal.tsx (New File)
'use client';

import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-xl shadow-2xl p-6 border border-slate-700 w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="text-red-500" />
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-700"
            title="Close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <p className="text-slate-300 mb-6">{message}</p>
        
        <div className="flex justify-end space-x-4">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}