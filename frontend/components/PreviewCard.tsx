// frontend/components/PreviewCard.tsx (New File)
'use client';

import Image from 'next/image';
import { Youtube, Globe } from 'lucide-react';
import { RecommendationResult } from '@/lib/api';

interface PreviewCardProps {
  item: RecommendationResult;
  source: 'youtube' | 'article';
}

export default function PreviewCard({ item, source }: PreviewCardProps) {
  return (
    <a 
      href={item.link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block bg-slate-800 border border-slate-700 rounded-lg overflow-hidden group hover:border-indigo-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
    >
      <div className="relative w-full h-40">
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt={item.title}
            layout="fill"
            objectFit="cover"
            className="group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-slate-700 flex items-center justify-center">
            <Globe size={48} className="text-slate-500" />
          </div>
        )}
        <div className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-full">
          {source === 'youtube' ? <Youtube size={20} className="text-red-500" /> : <Globe size={20} className="text-cyan-400" />}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-slate-100 group-hover:text-indigo-400 transition-colors truncate">{item.title}</h3>
        <p className="text-sm text-slate-400 mt-2 line-clamp-3">{item.snippet}</p>
      </div>
    </a>
  );
}