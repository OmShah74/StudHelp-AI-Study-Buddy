// frontend/components/NewChatModal.tsx (New File)
'use client';
import { useState } from 'react';
import { Document, createChatSession } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { LoaderCircle, X, MessageSquarePlus } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
}

export default function NewChatModal({ isOpen, onClose, documents }: NewChatModalProps) {
  const [sessionName, setSessionName] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleDocToggle = (storagePath: string) => {
    setSelectedDocs(prev => 
      prev.includes(storagePath) ? prev.filter(id => id !== storagePath) : [...prev, storagePath]
    );
  };
  
  const handleCreateSession = async () => {
    if (!sessionName.trim() || selectedDocs.length === 0) {
      toast.error("Please provide a session name and select at least one document.");
      return;
    }
    setIsCreating(true);
    try {
      const newSession = await createChatSession(sessionName, selectedDocs);
      toast.success("Chat session created!");
      onClose();
      router.push(`/chat/${newSession.id}`);
    } catch (error) {
      toast.error("Failed to create chat session.");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-2xl p-6 border border-slate-700 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white flex items-center"><MessageSquarePlus className="mr-2" /> New Chat Session</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700"><X size={20} /></button>
        </div>
        
        <div className="space-y-4">
            <input type="text" value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Session Name (e.g., 'Quantum Physics Research')" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg"/>
            
            <p className="font-semibold">Select Documents for Context:</p>
            <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-slate-900 rounded-lg">
                {documents.map(doc => (
                    <div key={doc.storage_path} onClick={() => handleDocToggle(doc.storage_path)} className={`p-3 rounded-lg cursor-pointer flex items-center space-x-3 transition-colors ${selectedDocs.includes(doc.storage_path) ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                        <input type="checkbox" checked={selectedDocs.includes(doc.storage_path)} readOnly className="form-checkbox h-5 w-5 text-indigo-500 bg-slate-800 border-slate-600 rounded focus:ring-indigo-400"/>
                        <span className="truncate">{doc.file_name}</span>
                    </div>
                ))}
            </div>

            <button onClick={handleCreateSession} disabled={isCreating} className="w-full flex justify-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-slate-600">
                {isCreating ? <LoaderCircle className="animate-spin" /> : "Start Chatting"}
            </button>
        </div>
      </div>
    </div>
  );
}