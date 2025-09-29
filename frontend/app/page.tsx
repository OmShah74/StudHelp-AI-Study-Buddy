// frontend/app/page.tsx (Complete, Updated File)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadDocument } from '@/lib/api';
import { UploadCloud, LoaderCircle, FileCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("File is too large (> 10MB).");
        setFile(null);
      } else {
        setFile(selectedFile);
        toast.success(`${selectedFile.name} selected!`);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const uploadToast = toast.loading('Uploading and processing document...');

    try {
      const response = await uploadDocument(file);
      const { document_id } = response.data;
      
      toast.success('Success! Taking you to your workspace.', {
        id: uploadToast,
      });
      router.push(`/${document_id}`);
    } catch (err) {
      console.error(err);
      toast.error('Upload failed. Please try again.', {
        id: uploadToast,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="container mx-auto flex flex-col items-center justify-center p-8 mt-10 text-center">
      <h1 className="text-5xl font-extrabold mb-4">
        Unlock Your Study Potential with <span className="gradient-text">AI</span>
      </h1>
      <p className="text-lg text-slate-400 max-w-2xl mb-12">
        Simply upload your PDF or DOCX study materials, and let our AI create summaries, mind maps, and quizzes to help you master any subject.
      </p>

      <div className="w-full max-w-2xl p-8 space-y-6 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl">
        <div className="flex items-center justify-center w-full">
          <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {file ? <FileCheck className="w-12 h-12 mb-4 text-green-400" /> : <UploadCloud className="w-12 h-12 mb-4 text-slate-500" />}
              {file ? (
                <p className="font-semibold text-slate-200">{file.name}</p>
              ) : (
                <>
                  <p className="mb-2 text-lg text-slate-400"><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</p>
                  <p className="text-sm text-slate-500">PDF or DOCX (MAX. 10MB)</p>
                </>
              )}
            </div>
            <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx" disabled={isUploading}/>
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-lg shadow-lg text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-all duration-300"
        >
          {isUploading ? (
            <>
              <LoaderCircle className="animate-spin mr-3" />
              Processing Your File...
            </>
          ) : (
            'Start Studying'
          )}
        </button>
      </div>
    </main>
  );
}