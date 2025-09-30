// frontend/app/converter/page.tsx (New File)
'use client';
import { useState } from 'react';
import { convertToPdf } from '@/lib/api';
import toast from 'react-hot-toast';
import { UploadCloud, LoaderCircle, FileCheck } from 'lucide-react';

export default function ConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        toast.error("Invalid file type. Please upload a .docx file.");
        setFile(null);
      } else {
        setFile(selectedFile);
        toast.success(`${selectedFile.name} selected!`);
      }
    }
  };

  const handleConvertAndDownload = async () => {
    if (!file) return;

    setIsConverting(true);
    const convertToast = toast.loading('Converting your file to PDF...');

    try {
      const pdfBlob = await convertToPdf(file);

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(pdfBlob);
      // Create a hidden anchor tag to trigger the download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // Set the desired file name for the download
      const downloadFileName = `${file.name.replace(/\.docx$/, '')}.pdf`;
      a.download = downloadFileName;
      
      // Append the anchor to the body, click it, and then remove it
      document.body.appendChild(a);
      a.click();
      
      // Clean up by revoking the object URL
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Conversion successful! Download started.', { id: convertToast });
      setFile(null); // Reset the file input

    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Conversion failed. Please try again.';
      toast.error(errorMessage, { id: convertToast });
      console.error(err);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <main className="container mx-auto flex flex-col items-center justify-center p-8 mt-10 text-center">
      <h1 className="text-5xl font-extrabold mb-4">
        DOCX to <span className="gradient-text">PDF Converter</span>
      </h1>
      <p className="text-lg text-slate-400 max-w-2xl mb-12">
        Quickly and easily convert your Word documents to universally viewable PDF files. This is a stateless utility; your files are not saved on our servers.
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
                  <p className="mb-2 text-lg text-slate-400"><span className="font-semibold text-indigo-400">Click to upload a .docx file</span></p>
                  <p className="text-sm text-slate-500">or drag and drop</p>
                </>
              )}
            </div>
            <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={isConverting}/>
          </label>
        </div>

        <button
          onClick={handleConvertAndDownload}
          disabled={!file || isConverting}
          className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-lg shadow-lg text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-all duration-300"
        >
          {isConverting ? (
            <>
              <LoaderCircle className="animate-spin mr-3" />
              Converting...
            </>
          ) : (
            'Convert & Download PDF'
          )}
        </button>
      </div>
    </main>
  );
}