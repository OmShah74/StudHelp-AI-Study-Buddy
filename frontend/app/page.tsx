'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { uploadDocument } from '@/lib/api';
import toast from 'react-hot-toast';
import { UploadCloud, LoaderCircle, FileText, PlusCircle, Trash2 } from 'lucide-react';

interface Document {
  id: string;
  created_at: string;
  file_name: string;
  storage_path: string;
}

export default function Dashboard() {
  const { supabase, user, isLoading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = async () => {
    if (user) {
      setIsLoadingDocs(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        toast.error("Could not fetch documents.");
        console.error("Fetch documents error:", error);
      } else {
        setDocuments(data || []);
      }
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchDocuments();
    }
  }, [user, authLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        toast.success(`${selectedFile.name} selected!`);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const uploadToast = toast.loading('Uploading and processing...');
    try {
      await uploadDocument(file);
      toast.success('Document uploaded!', { id: uploadToast });
      setFile(null);
      fetchDocuments(); // Refresh the document list
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Upload failed. Please try again.';
      toast.error(errorMessage, { id: uploadToast });
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDelete = async (doc: Document) => {
    // Advanced feature: Implement delete logic here
    toast('Delete functionality coming soon!', { icon: '🚧' });
  }

  if (authLoading) {
    return <div className="text-center mt-20"><LoaderCircle className="animate-spin mx-auto text-indigo-400" size={48} /></div>;
  }

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document List */}
        <div className="lg:col-span-2">
          <h2 className="text-3xl font-bold mb-6 text-white">Your Study Library</h2>
          <div className="space-y-4">
            {isLoadingDocs ? (
                <div className="text-center p-8"><LoaderCircle className="animate-spin mx-auto text-indigo-400" /></div>
            ) : documents.length > 0 ? (
              documents.map(doc => (
                <Link key={doc.id} href={`/${doc.storage_path}`} className="group flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-indigo-500 hover:bg-slate-700/50 transition-all">
                  <div className="flex items-center space-x-4">
                    <FileText className="text-indigo-400" />
                    <div>
                      <p className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">{doc.file_name}</p>
                      <p className="text-sm text-slate-400">Uploaded on {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {/* <button onClick={(e) => { e.preventDefault(); handleDelete(doc); }} className="p-2 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={18} />
                  </button> */}
                </Link>
              ))
            ) : (
              <div className="text-center p-12 border-2 border-dashed border-slate-700 rounded-lg">
                  <h3 className="text-xl font-semibold text-white">Your library is empty</h3>
                  <p className="text-slate-400 mt-2">Upload your first document to get started.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Upload Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-6 h-fit lg:sticky lg:top-24">
          <h3 className="text-xl font-bold mb-4 flex items-center"><PlusCircle className="mr-2 text-indigo-400" /> Upload New Document</h3>
          <div className="mt-4">
            <label htmlFor="doc-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 transition-colors">
                <div className="flex flex-col items-center justify-center">
                    <UploadCloud className="w-10 h-10 mb-3 text-slate-500" />
                    {file ? (
                        <p className="font-semibold text-sm text-green-400">{file.name}</p>
                    ) : (
                        <p className="text-sm text-slate-400"><span className="font-semibold text-indigo-400">Click to upload</span></p>
                    )}
                </div>
                <input id="doc-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx" disabled={isUploading}/>
            </label>
          </div>
          <button onClick={handleUpload} disabled={!file || isUploading} className="w-full mt-4 flex justify-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
            {isUploading ? <LoaderCircle className="animate-spin" /> : 'Upload & Process'}
          </button>
        </div>
      </div>
    </main>
  );
}