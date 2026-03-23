export type JobStatus =
  | 'Pending'
  | 'Uploading'
  | 'Transcribing'
  | 'GeneratingAI'
  | 'RenderingSubtitles'
  | 'Complete'
  | 'Failed';

export interface UploadVideoResponse {
  jobId: string;
  status: JobStatus;
  uploadedAt: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progressPercent: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface SubtitleEntry {
  index: number;
  start: string;
  end: string;
  text: string;
}

export interface VideoMetadata {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  frameRate: number | null;
}

export interface ViralScore {
  hookScore: number;
  emotionScore: number;
  clarityScore: number;
  trendScore: number;
  engagementScore: number;
  viralScore: number;
  problem: string;
  improvedHook: string;
}

// ── View Prediction ────────────────────────────────────────────────────────────

export interface ViewScenario {
  followers: string;  // e.g. "10K"
  views: string;      // e.g. "1.3K–5.2K"
  tier: string;       // "Low" | "Medium" | "High"
}

export interface ViewPrediction {
  predictionType: 'scenario' | 'personalized';
  viralTier: 'Low' | 'Medium' | 'High';
  scenarios: ViewScenario[];
  note: string;
  // Personalised fields (null in scenario mode)
  followers?: number | null;
  avgViews?: number | null;
  predictedRange?: string | null;
  confidence?: string | null;
  basedOn?: string | null;
}

// ── Instagram ─────────────────────────────────────────────────────────────────

export interface InstagramStatus {
  connected: boolean;
  username?: string;
  followers?: number;
  avgViews?: number | null;
  engagementRate?: number;
  connectedAt?: string;
  lastSyncAt?: string;
  expired?: boolean;
}

export interface AnalysisResult {
  jobId: string;
  hook: string;
  caption: string;
  hashtags: string[];
  subtitles: SubtitleEntry[];
  metadata: VideoMetadata | null;
  viralScore: ViralScore | null;
  hasAudio: boolean;
  insights: string[];
  viewPrediction: ViewPrediction | null;
}

export interface BurnSubtitlesResponse {
  jobId: string;
  burnedVideoUrl: string;
}

// ── Image Growth Engine ────────────────────────────────────────────────────────

export interface VisualFeatures {
  width: number;
  height: number;
  aspectRatio: string;
  brightness: number;
  contrast: number;
  sharpness: number;
  visualClutterScore: number;
  dominantColors: string[];
  colorTemperature: string;
  isHighContrast: boolean;
  isWellLit: boolean;
  isSharp: boolean;
  isVertical: boolean;
}

export interface SemanticAnalysis {
  hasFace: boolean;
  faceCount: number;
  hasTextOverlay: boolean;
  textContent: string | null;
  dominantObjects: string[];
  sceneType: string;
  mood: string;
  qualityIssues: string[];
  engagementBoosters: string[];
  engagementKillers: string[];
  claudePostScore: number;
}

export interface EngagementPrediction {
  postScore: number;
  likesPrediction: string;
  saveProbability: string;
  shareProbability: string;
  confidence: string;
  estimatedReach: string;
  scoreBreakdown: Record<string, number>;
}

export interface CaptionSuggestion {
  hook: string;
  fullCaption: string;
  cta: string;
  hashtags: string[];
  tone: string;
}

export interface SlideAnalysis {
  slideIndex: number;
  postScore: number;
  visual: VisualFeatures;
  semantic: SemanticAnalysis;
  engagement: EngagementPrediction;
  insights: string[];
  isWeakSlide: boolean;
  improvementSuggestion: string | null;
}

export interface ImageAnalysisResult {
  type: 'image' | 'carousel';
  postScore: number;
  hasFace: boolean;
  hasTextOverlay: boolean;
  insights: string[];
  missingElements: string[];
  engagement: EngagementPrediction;
  primaryVisualFeatures: VisualFeatures | null;
  caption: CaptionSuggestion;
  slideBreakdown: SlideAnalysis[];
  bestSlideIndex: number | null;
  carouselFlowSuggestions: string[];
  suggestedSlideOrder: number[] | null;
  coverRecommendation: string | null;
  isPremiumResult: boolean;
}

export interface ImageJobStatus {
  jobId: string;
  status: 'Pending' | 'Analyzing' | 'GeneratingCaptions' | 'Complete' | 'Failed';
  progressPercent: number;
  message: string | null;
  createdAt: string;
}

// ── Auto Reel Generator ────────────────────────────────────────────────────────

export type ReelJobStatus =
  | 'Pending'
  | 'Detecting'
  | 'Ranking'
  | 'Extracting'
  | 'Processing'
  | 'Complete'
  | 'Failed';

export interface GeneratedReel {
  index: number;
  title: string;
  startFormatted: string;
  endFormatted: string;
  downloadUrl: string;
  motionScore: number;
  engagementScore: number;
  transcriptSnippet: string | null;
  fileSizeBytes: number;
  locked: boolean;
  watermarked: boolean;
}

export interface ReelJobStatusResponse {
  reelJobId: string;
  status: ReelJobStatus;
  progressPercent: number;
  currentStep: string | null;
  errorMessage: string | null;
  reelCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ReelResult {
  reelJobId: string;
  sourceJobId: string;
  reelCount: number;
  completedAt: string;
  isPremium: boolean;
  unlockedCount: number;
  reels: GeneratedReel[];
}
