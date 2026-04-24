export interface Question {
  id: number;
  company: string;
  difficulty: string;
  question: string;
  answer: string;
  created_at: string | null;
}

export interface ChatRequest {
  message: string;
  history: { role: string; content: string }[] | null;
}

export interface ChatResponse {
  reply: string;
}

export interface InterviewParseRequest {
  content: string;
  company: string;
}

export interface ParsedQuestion {
  question: string;
  difficulty: string;
  answer: string;
}

export interface InterviewParseResponse {
  questions: ParsedQuestion[];
}
