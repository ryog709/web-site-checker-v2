/**
 * Gemini API関連の型定義
 */

export interface GeminiAnalysisRequest {
  url: string;
  lighthouseResults?: any;
  axeResults?: any;
  analysisType?: 'content-quality' | 'usability' | 'comprehensive';
}

export interface GeminiAnalysisResponse {
  contentQuality?: {
    score: number;
    improvements: string[];
    details: string;
  };
  usabilityInsights?: {
    score: number;
    recommendations: string[];
    details: string;
  };
  comprehensiveAnalysis?: {
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    priorityActions: string[];
    detailedReport: string;
  };
  generatedAt: string;
  modelUsed: string;
  tokensUsed?: number;
}

export interface SemanticAnalysis {
  geminiAnalysis?: GeminiAnalysisResponse;
  isEnabled: boolean;
  error?: string;
  processingTime?: number;
}

export interface GeminiConfig {
  apiKey: string;
  model: 'gemini-1.5-flash' | 'gemini-1.5-pro';
  maxTokens?: number;
  temperature?: number;
  enabled: boolean;
  rateLimitPerMinute: number;
  timeout: number;
}

export interface GeminiError extends Error {
  code: string;
  status?: number;
  retryAfter?: number;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailure?: Date;
  nextAttempt?: Date;
}

export interface PromptTemplate {
  system: string;
  user: string;
  context: Record<string, any>;
}