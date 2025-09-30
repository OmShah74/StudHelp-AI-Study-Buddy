// frontend/components/DocumentViewer.tsx (Complete, Final Correct Code)
'use client';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { LoaderCircle, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

// --- THIS IS THE CORRECT, COMPATIBLE WORKER CONFIGURATION ---
// We point to the file we copied into the /public directory.
// The browser will be able to fetch this file at the root of our site.
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
// -------------------------------------------------------------

interface DocumentViewerProps {
  fileUrl: string;
  pageNumber: number;
  setPageNumber: (num: number) => void;
  numPages: number;
  setNumPages: (num: number) => void;
}

export default function DocumentViewer({ fileUrl, pageNumber, setPageNumber, numPages, setNumPages }: DocumentViewerProps) {
  const [scale, setScale] = useState(1.5);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const goToPrevPage = () => {
    setPageNumber(Math.max(1, pageNumber - 1));
  }
  
  const goToNextPage = () => {
    if (numPages > 0) {
      setPageNumber(Math.min(numPages, pageNumber + 1));
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
      {/* Controls Bar */}
      <div className="bg-slate-800 p-2 flex items-center justify-center space-x-4 border-b border-slate-700 text-white">
        <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="p-2 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronLeft />
        </button>
        
        <div className="flex items-center space-x-2">
            <span>Page</span>
            <input 
                type="number"
                value={pageNumber}
                onChange={(e) => {
                    const newPage = parseInt(e.target.value, 10);
                    if (newPage > 0 && newPage <= numPages) {
                        setPageNumber(newPage);
                    }
                }}
                className="w-16 text-center bg-slate-700 border border-slate-600 rounded-md"
            />
            <span>of {numPages > 0 ? numPages : '...'}</span>
        </div>

        <button onClick={goToNextPage} disabled={pageNumber >= numPages && numPages > 0} className="p-2 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronRight />
        </button>
        
        <div className="w-px h-6 bg-slate-600 mx-2"></div>
        
        <button onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))} className="p-2 rounded-md hover:bg-slate-700">
          <ZoomOut />
        </button>
        <span className="w-16 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(prev => Math.min(3, prev + 0.1))} className="p-2 rounded-md hover:bg-slate-700">
          <ZoomIn />
        </button>
      </div>

      {/* PDF Viewer Area */}
      <div className="flex-1 overflow-auto flex justify-center p-4">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<LoaderCircle className="animate-spin text-indigo-400" size={40} />}
          error={<p className="text-red-500">Failed to load PDF file. Please ensure the file was uploaded correctly.</p>}
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale} 
            renderAnnotationLayer={true}
            renderTextLayer={true}
          />
        </Document>
      </div>
    </div>
  );
}