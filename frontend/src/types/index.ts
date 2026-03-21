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

export interface AnalysisResult {
  jobId: string;
  hook: string;
  caption: string;
  hashtags: string[];
  subtitles: SubtitleEntry[];
  metadata: VideoMetadata | null;
  viralScore: ViralScore | null;
}

export interface BurnSubtitlesResponse {
  jobId: string;
  burnedVideoUrl: string;
}
