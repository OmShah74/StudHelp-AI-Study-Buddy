'use client';
import { useState, useEffect } from 'react';
// Import the new delete function and the Trash2 icon
import { getChatSessions, getDocuments, deleteChatSession, Document, ChatSession } from '@/lib/api'; 
import toast from 'react-hot-toast';
import { LoaderCircle, MessageSquare, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import NewChatModal from '@/components/NewChatModal';
import ConfirmModal from '@/components/ConfirmModal'; // Import the confirmation modal

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // --- STATE FOR DELETION ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedSessions, fetchedDocs] = await Promise.all([
                getChatSessions(),
                getDocuments()
            ]);
            setSessions(fetchedSessions);
            setDocuments(fetchedDocs);
        } catch (error) {
            console.error("Failed to load page data:", error);
            toast.error("Failed to load your chat sessions and documents.");
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, []);

  // --- HANDLER FUNCTIONS FOR DELETION ---
  const openDeleteModal = (session: ChatSession) => {
    setSessionToDelete(session);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setSessionToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;

    const deleteToast = toast.loading(`Deleting session "${sessionToDelete.session_name}"...`);
    try {
      await deleteChatSession(sessionToDelete.id);
      toast.success("Session deleted successfully!", { id: deleteToast });
      
      // Update the UI by filtering out the deleted session from the state
      setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionToDelete.id));

    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Deletion failed.';
      toast.error(errorMessage, { id: deleteToast });
      console.error(err);
    } finally {
      closeDeleteModal();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-20">
        <LoaderCircle className="animate-spin text-indigo-400" size={48} />
      </div>
    );
  }

  return (
    <>
      {/* Modal for creating a new chat session */}
      <NewChatModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        documents={documents} 
      />
      
      {/* Modal for confirming deletion */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Confirm Session Deletion"
        message={`Are you sure you want to permanently delete the chat session "${sessionToDelete?.session_name}"? This action cannot be undone.`}
      />

      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Chat Sessions</h1>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 font-semibold text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
            >
                <Plus size={20} />
                <span>New Chat Session</span>
            </button>
        </div>

        {sessions.length > 0 ? (
            <div className="space-y-4">
                {sessions.map(session => (
                    // The main element is now a div to contain both the link and the button
                    <div key={session.id} className="group flex items-center justify-between p-6 bg-slate-800 border border-slate-700 rounded-lg hover:border-indigo-500 hover:bg-slate-700/50 transition-all">
                        {/* Link wraps the content to make most of the card clickable */}
                        <Link href={`/chat/${session.id}`} className="flex-grow min-w-0">
                            <h2 className="font-semibold text-xl text-slate-100 group-hover:text-indigo-300 transition-colors truncate">{session.session_name}</h2>
                            <p className="text-sm text-slate-400 mt-1">Created on {new Date(session.created_at).toLocaleString()}</p>
                        </Link>
                        {/* The delete button is now a sibling to the Link */}
                        <button 
                          onClick={(e) => { 
                            e.preventDefault(); // Prevent the Link from navigating
                            openDeleteModal(session); 
                          }} 
                          className="p-2 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-4 flex-shrink-0"
                          title="Delete session"
                        >
                          <Trash2 size={20} />
                        </button>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center p-12 border-2 border-dashed border-slate-700 rounded-lg">
                <MessageSquare size={48} className="mx-auto text-slate-500 mb-4" />
                <h3 className="text-xl font-semibold text-white">No Chat Sessions Yet</h3>
                <p className="text-slate-400 mt-2">Click "New Chat Session" to start a conversation with your documents.</p>
            </div>
        )}
      </main>
    </>
  );
}