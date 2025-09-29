// frontend/components/Header.tsx (Complete, Updated File)

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Upload } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-slate-900/70 backdrop-blur-lg border-b border-slate-700 p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold hover:text-indigo-400 transition-colors gradient-text">
          AI Study Buddy
        </Link>

        {pathname !== '/' && (
          <Link
            href="/"
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-all transform hover:scale-105"
          >
            <Upload size={18} />
            <span>Upload New</span>
          </Link>
        )}
      </div>
    </header>
  );
}