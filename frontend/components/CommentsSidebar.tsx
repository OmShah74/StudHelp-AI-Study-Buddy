// frontend/components/CommentsSidebar.tsx (New File)
'use client';
import { useState, useEffect } from 'react';
import { getComments, addComment, Comment } from '@/lib/api';
import toast from 'react-hot-toast';
import { LoaderCircle, MessageSquare, Send } from 'lucide-react';

interface CommentsSidebarProps {
  docId: string;
  currentPage: number;
  totalNumPages: number;
}

export default function CommentsSidebar({ docId, currentPage, totalNumPages }: CommentsSidebarProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const fetchedComments = await getComments(docId);
        setComments(fetchedComments);
      } catch (error) {
        toast.error("Could not fetch comments.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchComments();
  }, [docId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsPosting(true);
    try {
      const addedComment = await addComment(docId, currentPage, newComment);
      setComments(prev => [addedComment, ...prev]);
      setNewComment('');
      toast.success(`Comment added to page ${currentPage}`);
    } catch (error) {
      toast.error("Failed to add comment.");
    } finally {
      setIsPosting(false);
    }
  };

  const commentsForCurrentPage = comments.filter(c => c.page_number === currentPage);

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-xl font-bold flex items-center"><MessageSquare className="mr-2 text-indigo-400" /> Comments</h3>
        <p className="text-sm text-slate-400">Page {currentPage} of {totalNumPages}</p>
      </div>
      
      {/* Comment List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? <LoaderCircle className="animate-spin mx-auto mt-4" /> :
          commentsForCurrentPage.length > 0 ? commentsForCurrentPage.map(comment => (
            <div key={comment.id} className="bg-slate-700 rounded-lg p-3">
              <p className="text-slate-200 text-sm">{comment.comment_text}</p>
              <p className="text-xs text-slate-500 mt-2 text-right">{new Date(comment.created_at).toLocaleString()}</p>
            </div>
          )) : <p className="text-slate-500 text-center text-sm pt-4">No comments for this page yet.</p>
        }
      </div>
      
      {/* Add Comment Form */}
      <div className="p-4 border-t border-slate-700">
        <form onSubmit={handleAddComment} className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`Add a comment for page ${currentPage}...`}
            className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            disabled={isPosting}
          />
          <button type="submit" className="w-full flex justify-center items-center py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:bg-slate-600" disabled={isPosting}>
            {isPosting ? <LoaderCircle className="animate-spin" size={20}/> : <Send size={16}/>}
            <span className="ml-2">Post Comment</span>
          </button>
        </form>
      </div>
    </div>
  );
}