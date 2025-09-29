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