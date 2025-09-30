import axios from 'axios';
import { createClient } from './supabaseClient'; // Import our client

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

// This interceptor automatically adds the auth token to every request.
// It runs before each request is sent.
apiClient.interceptors.request.use(async (config) => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// All our API functions remain the same, they will now be automatically authenticated.
export const uploadDocument = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const askQuestion = (docId: string, query: string) => {
  return apiClient.post('/chat', { doc_id: docId, query });
};

export const generateMindMap = async (docId: string, topic: string) => {
    const response = await apiClient.post('/mindmap', { doc_id: docId, query: topic });
    return response.data;
};

export const summarizeDocument = (docId: string) => {
  return apiClient.post('/summarize', { doc_id: docId, query: 'summarize' });
};

export const generateQuiz = async (docId: string, numQuestions: number): Promise<QuizQuestion[]> => {
  const response = await apiClient.post('/quiz', { doc_id: docId, num_questions: numQuestions });
  return response.data;
};

export const deleteDocument = (docId: string) => {
  // Axios uses a different syntax for DELETE requests. The URL includes the docId.
  return apiClient.delete(`/documents/${docId}`);
};

export interface RecommendationResult {
    title: string;
    link: string;
    snippet: string;
    thumbnail?: string | null;
}

export interface RecommendationResponse {
    youtube: RecommendationResult[];
    articles: RecommendationResult[];
}

// --- NEW FUNCTION ---
export const getRecommendations = async (docId: string, topic: string): Promise<RecommendationResponse> => {
  const response = await apiClient.post('/recommendations', {
    doc_id: docId,
    topic: topic,
  });
  return response.data;
};

export interface Comment {
    id: number;
    page_number: number;
    comment_text: string;
    created_at: string;
}

export const getComments = async (docId: string): Promise<Comment[]> => {
    const response = await apiClient.get(`/documents/${docId}/comments`);
    return response.data;
};

export const addComment = async (docId: string, pageNumber: number, commentText: string): Promise<Comment> => {
    const response = await apiClient.post(`/documents/${docId}/comments`, {
        page_number: pageNumber,
        comment_text: commentText,
    });
    return response.data;
};

export const convertToPdf = async (file: File): Promise<Blob> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/convert-to-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob', // This is CRITICAL for handling file downloads
  });

  return response.data;
};