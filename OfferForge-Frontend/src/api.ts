import type { ChatRequest, ChatResponse, InterviewParseRequest, InterviewParseResponse, Question, ResumeAnalyzeResponse, ResumeExtractResponse, InterviewChatRequest, InterviewChatResponse, InterviewEvaluateRequest, InterviewEvaluateResponse } from './types';

const API_BASE = '/api';

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || '请求失败');
  }
  return response.json();
}

export const api = {
  getQuestions: (params?: { company?: string; difficulty?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.company) searchParams.set('company', params.company);
    if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
    const query = searchParams.toString();
    return fetchAPI<Question[]>(`/questions${query ? `?${query}` : ''}`);
  },

  getQuestion: (id: number) => fetchAPI<Question>(`/questions/${id}`),

  deleteQuestion: (id: number) =>
    fetchAPI<{ message: string }>(`/questions/${id}`, { method: 'DELETE' }),

  parseInterview: (data: InterviewParseRequest) =>
    fetchAPI<InterviewParseResponse>('/interviews/parse', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  chat: (data: ChatRequest) =>
    fetchAPI<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  analyzeResumeFile: (file: File, targetPosition?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (targetPosition) formData.append('target_position', targetPosition);

    return fetchAPI<ResumeAnalyzeResponse>('/resume/analyze', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  extractResume: (file: File, targetPosition?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (targetPosition) formData.append('target_position', targetPosition);

    return fetchAPI<ResumeExtractResponse>('/mock-interview/resume/extract', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  interviewChat: (data: InterviewChatRequest) =>
    fetchAPI<InterviewChatResponse>('/mock-interview/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  evaluateInterview: (data: InterviewEvaluateRequest) =>
    fetchAPI<InterviewEvaluateResponse>('/mock-interview/evaluate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};