// frontend/components/RecommendationsComponent.tsx (New File)
'use client';
import { useState } from 'react';
import { getRecommendations, RecommendationResponse } from '@/lib/api';
import toast from 'react-hot-toast';
import { LoaderCircle, Sparkles, Search } from 'lucide-react';
import PreviewCard from './PreviewCard';

export default function RecommendationsComponent({ documentId }: { documentId: string }) {
  const [topic, setTopic] = useState('');
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetRecommendations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a topic to get recommendations.");
      return;
    }

    setIsLoading(true);
    setResults(null);
    const recoToast = toast.loading(`Searching for resources on "${topic}"...`);

    try {
      const response = await getRecommendations(documentId, topic);
      setResults(response);
      toast.success("Recommendations found!", { id: recoToast });
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch recommendations.", { id: recoToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8 text-center">
        <Sparkles size={40} className="mx-auto text-indigo-400 mb-4" />
        <h2 className="text-3xl font-bold text-white mb-2">Find More Resources</h2>
        <p className="text-slate-400 mb-6">Struggling with a concept? Enter a topic from your document to find helpful videos and articles.</p>
        <form onSubmit={handleGetRecommendations} className="flex items-center max-w-lg mx-auto">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., 'Quantum Entanglement' or 'Mitochondria'"
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            disabled={isLoading}
          />
          <button type="submit" className="p-3 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 disabled:bg-slate-600" disabled={isLoading}>
            {isLoading ? <LoaderCircle className="animate-spin" /> : <Search />}
          </button>
        </form>
      </div>

      {isLoading && (
        <div className="text-center"><LoaderCircle className="animate-spin mx-auto text-indigo-400" size={40} /></div>
      )}

      {results && (
        <div className="space-y-12">
          {/* YouTube Section */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">YouTube Videos</h3>
            {results.youtube.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.youtube.map((item, index) => <PreviewCard key={`yt-${index}`} item={item} source="youtube" />)}
              </div>
            ) : <p className="text-slate-400">No relevant YouTube videos found.</p>}
          </div>
          
          {/* Articles Section */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">Web Articles</h3>
            {results.articles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.articles.map((item, index) => <PreviewCard key={`article-${index}`} item={item} source="article" />)}
              </div>
            ) : <p className="text-slate-400">No relevant web articles found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}