// frontend/components/ViewerLayout.tsx (Complete, Updated File)
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import CommentsSidebar from './CommentsSidebar';
import { LoaderCircle } from 'lucide-react';

// --- THIS IS THE KEY FIX ---
// Import 'dynamic' from Next.js
import dynamic from 'next/dynamic';

// Use a dynamic import to load the DocumentViewer component only on the client-side.
// The `ssr: false` option is crucial.
const DocumentViewer = dynamic(() => import('./DocumentViewer'), {
  ssr: false,
  // You can also provide a loading component while the viewer is being loaded.
  loading: () => <div className="flex-1 flex justify-center items-center"><LoaderCircle className="animate-spin text-indigo-400" size={40} /></div>,
});
// -------------------------

export default function ViewerLayout({ docId }: { docId: string }) {
  const { supabase } = useAuth();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    // Construct the public URL for the viewable PDF from Supabase Storage
    const { data } = supabase.storage.from('files').getPublicUrl(`${docId}/viewable.pdf`);
    if (data?.publicUrl) {
      setFileUrl(data.publicUrl);
    }
  }, [docId, supabase]);

  // This check is important. If the document was a DOCX that failed conversion,
  // we show a helpful message instead of trying to render the viewer.
  if (!fileUrl) {
    return (
      <div className="flex justify-center items-center h-[75vh] bg-slate-800 border border-slate-700 rounded-xl">
        <div className="text-center p-8 text-slate-400">
            <h3 className="text-xl font-semibold text-white mb-2">Document Not Viewable</h3>
            <p>This document cannot be displayed. This can happen if it was a .docx file that failed to convert to PDF during upload.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-[85vh] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
      <DocumentViewer 
        fileUrl={fileUrl}
        pageNumber={pageNumber}
        setPageNumber={setPageNumber}
        numPages={numPages}
        setNumPages={setNumPages}
      />
      <CommentsSidebar 
        docId={docId}
        currentPage={pageNumber}
        totalNumPages={numPages}
      />
    </div>
  );
}