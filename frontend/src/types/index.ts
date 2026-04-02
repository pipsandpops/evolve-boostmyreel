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

// ── AI Agent Chat ──────────────────────────────────────────────────────────────

// ── Reel Streak Battle ─────────────────────────────────────────────────────────

export interface CreateChallengeResponse {
  challengeId: string;
  battleLink: string;
  whatsappLink: string;
  instagramDmLink: string;
  youtubeDmLink: string | null;
  expiresAt: string;
  battleTitle: string | null;
  durationHours: number;
  platform: string;
  themeHashtag: string | null;
  prizePoolAmount: number | null;
  prizeCurrency: string | null;
  contentGuidelines: string | null;
  trashTalkMsg: string | null;
  prizeDescription: string | null;
}

export interface ChallengeStatus {
  type: 'challenge';
  challengeId: string;
  battleId: string | null;
  opponentHandle: string;
  battleTitle: string | null;
  durationHours: number;
  platform: string;
  themeHashtag: string | null;
  prizePoolAmount: number | null;
  prizeCurrency: string | null;
  contentGuidelines: string | null;
  trashTalkMsg: string | null;
  prizeDescription: string | null;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Expired';
  expiresAt: string;
}

export interface CreatorScore {
  userId: string;
  handle: string;
  score: number;
  deltaViews: number;
  deltaLikes: number;
  deltaComments: number;
  deltaSaves: number;
  deltaShares: number;
  deltaFollowers: number;
  metricSource: string;
}

export interface AudienceVoteTally {
  challengerEntryId: string;
  challengerVotes: number;
  opponentEntryId: string;
  opponentVotes: number;
}

export interface BattleScoreResult {
  type: 'battle';
  battle: {
    battleId: string;
    status: string;
    endsAt: string;
    timeLeftSeconds: number;
    challenger: CreatorScore;
    opponent: CreatorScore;
    audienceVotes: AudienceVoteTally;
  };
}

export interface BattleSummary {
  battleId: string;
  challengerHandle: string;
  opponentHandle: string;
  challengerScore: number;
  opponentScore: number;
  status: string;
  endsAt: string;
}

// ── Prize Pool ─────────────────────────────────────────────────────────────────

export type PrizePoolTier = 'Starter' | 'Pro' | 'Premium' | 'Custom';
export type PrizePoolStatus = 'Pending' | 'Held' | 'Distributing' | 'Distributed' | 'Refunded';

export interface PrizePoolSplit {
  winner: number;
  runnerUp: number;
  voters: number;
  platform: number;
}

export interface PrizeDistributionRow {
  recipientType: string;
  userId: string | null;
  amount: number;
  status: string;
}

export interface PrizePoolSummary {
  hasPrizePool: boolean;
  prizePoolId?: string;
  totalAmount?: number;
  currency?: string;
  status?: PrizePoolStatus;
  tier?: PrizePoolTier;
  nonCashPrizes?: string | null;
  split?: PrizePoolSplit;
  distributions?: PrizeDistributionRow[];
}

export interface CreatePrizePoolResponse {
  prizePoolId: string;
  tier: string;
  amount: number;
  currency: string;
  status: string;
  nonCashPrizes: string | null;
  split: {
    winner: string;
    runnerUp: string;
    voters: string;
    platform: string;
  };
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentToolCall {
  toolName: string;
  input: unknown;
  output: unknown;
}

export interface AgentChatResponse {
  reply: string;
  toolCalls?: AgentToolCall[];
}
