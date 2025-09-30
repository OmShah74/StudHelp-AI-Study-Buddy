// frontend/app/chat/[sessionId]/page.tsx (Complete, Final Code)
'use client';
import { useState, useEffect } from 'react';
import { getSessionDetails, Document, ChatSession } from '@/lib/api';
import { useParams } from 'next/navigation';
import { LoaderCircle, FileText } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface'; // <-- Import our new component

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<ChatSession | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      setIsLoading(true);
      getSessionDetails(sessionId).then(data => {
        setSession(data.session);
        setDocuments(data.documents);
        setIsLoading(false);
      }).catch(err => {
        console.error("Failed to get session details:", err);
        setIsLoading(false);
        // You could add a toast error here
      });
    }
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-20">
        <LoaderCircle className="animate-spin text-indigo-400" size={48} />
      </div>
    );
  }
  
  if (!session) {
    return (
        <div className="text-center mt-20 text-slate-400">
            <h1 className="text-2xl font-bold text-white">Session Not Found</h1>
            <p>The requested chat session could not be found or you do not have permission to view it.</p>
        </div>
    );
  }

  return (
    <main className="container mx-auto p-4">
        {/* Header section that matches the screenshot */}
        <div className="mb-4">
            <h1 className="text-4xl font-bold text-white">{session.session_name}</h1>
            <div className="text-sm text-slate-400 mt-2 flex items-center flex-wrap gap-x-4 gap-y-2">
                <span className="font-semibold">Context from:</span>
                {documents.map((doc, index) => (
                    <span key={index} className="flex items-center">
                        <FileText size={14} className="mr-1.5 text-slate-500" />
                        {doc.file_name}
                    </span>
                ))}
            </div>
        </div>
        
        {/* --- Replace the placeholder with the actual ChatInterface component --- */}
        <ChatInterface sessionId={sessionId} />
    </main>
  );
}