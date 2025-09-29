// frontend/lib/api.ts (Complete File)

import axios from 'axios';

// Define the structure of a single quiz question for TypeScript
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

// 1. Upload a document
export const uploadDocument = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 2. Chat with a document
export const askQuestion = (docId: string, query: string) => {
  return apiClient.post('/chat', { doc_id: docId, query });
};

// 3. Generate a mind map
export const generateMindMap = async (docId: string, topic: string) => {
    const response = await apiClient.post('/mindmap', { doc_id: docId, query: topic });
    return response.data;
};

// 4. Summarize a document
export const summarizeDocument = (docId: string) => {
  return apiClient.post('/summarize', { doc_id: docId, query: 'summarize' });
};

// 5. Generate a Quiz (NEW FUNCTION)
export const generateQuiz = async (docId: string, numQuestions: number): Promise<QuizQuestion[]> => {
  const response = await apiClient.post('/quiz', { 
    doc_id: docId, 
    num_questions: numQuestions 
  });
  return response.data;
};