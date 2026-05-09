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

export interface PredictedQuestion {
  question: string;
  difficulty: string;
  category: string;
  reason: string;
}

export interface ResumeAnalyzeResponse {
  predicted_questions: PredictedQuestion[];
  overall_analysis: string;
}

// ---------- Mock Interview: Resume Extract ----------
export interface ResumeExtractResponse {
  resume_markdown: string;
  resume_raw: string;
}

// ---------- Mock Interview: Chat ----------
export interface InterviewMessage {
  role: 'interviewer' | 'user';
  content: string;
}

export interface InterviewChatRequest {
  resume_text: string;
  conversation_history: InterviewMessage[];
  target_position?: string;
}

export interface InterviewChatResponse {
  message: string;
  is_complete: boolean;
}

// ---------- Mock Interview: Evaluate ----------
export interface InterviewEvaluateRequest {
  resume_text: string;
  conversation_history: InterviewMessage[];
  target_position?: string;
}

export interface InterviewEvaluateResponse {
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  learning_path: string[];
  detailed_feedback: string;
}
