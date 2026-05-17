// ---------- Auth ----------
export interface RegisterRequest {
  account: string;
  password: string;
  nickname?: string;
}

export interface LoginRequest {
  account: string;
  password: string;
}

export interface UserInfo {
  userid: number;
  account: string;
  nickname: string;
  avatar: string;
  email: string;
  created_at: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

// ---------- Questions ----------
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
  skip_action?: string;  // "", "skip", "dont_know"
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

// ---------- Evaluations ----------
export interface EvaluationListItem {
  id: number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  target_position: string | null;
  created_at: string | null;
}

export interface EvaluationDetail extends EvaluationListItem {
  user_id: number;
  learning_path: string[];
  detailed_feedback: string;
}

export interface EvaluationStats {
  scores: number[];
  average_score: number;
  total_count: number;
  latest_score: number | null;
  score_change: number | null;
}

export interface StudyPlan {
  focus_areas: string[];
  weekly_plan: { day: string; task: string }[];
  long_term_goals: string[];
  resource_recommendations: string[];
}
