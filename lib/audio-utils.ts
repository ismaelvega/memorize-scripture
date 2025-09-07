import { readingTime } from 'reading-time-estimator';

/**
 * Calculate dynamic recording time limit based on verse text length
 */
export function calculateRecordingLimit(verseText: string): number {
  if (!verseText || verseText.trim().length === 0) {
    return 30; // Default 30 seconds for empty text
  }

  // Calculate reading time for the verse
  // Use speaking speed (slower than reading) - around 180-200 WPM for speech
  const speakingWPM = 180;
  const result = readingTime(verseText, speakingWPM);
  
  // Convert minutes to seconds and add buffer time
  const estimatedSeconds = result.minutes * 60;
  
  // Add buffer time for pauses, corrections, and natural speech patterns
  // 2.5x the estimated time PLUS 60 seconds window, with minimum 75 seconds
  const bufferMultiplier = 2.5;
  const timeWindow = 60; // Extra 60 seconds for user comfort
  let recordingLimit = Math.max(estimatedSeconds * bufferMultiplier + timeWindow, 75);
  recordingLimit = Math.min(recordingLimit, 240); // Cap at 4 minutes
  
  // Round to nearest 5 seconds for cleaner UI
  recordingLimit = Math.ceil(recordingLimit / 5) * 5;
  
  return recordingLimit;
}

/**
 * Format recording limit for display
 */
export function formatRecordingLimit(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get recording limit info for display
 */
export interface RecordingLimitInfo {
  seconds: number;
  formatted: string;
  estimatedSpeakingTime: number;
  wordCount: number;
}

export function getRecordingLimitInfo(verseText: string): RecordingLimitInfo {
  const seconds = calculateRecordingLimit(verseText);
  const formatted = formatRecordingLimit(seconds);
  
  // Calculate estimated speaking time without buffer
  const speakingWPM = 180;
  const readingResult = readingTime(verseText, speakingWPM);
  const words = typeof readingResult.words === 'number'
    ? readingResult.words
    : (verseText?.trim()?.split(/\s+/).filter(Boolean).length || 0);
  const estimatedSecondsRaw = words > 0 ? (words / speakingWPM) * 60 : 0;
  const estimatedSpeakingTime = words > 0 ? Math.max(1, Math.round(estimatedSecondsRaw)) : 0;
  
  return {
    seconds,
    formatted,
    estimatedSpeakingTime,
    wordCount: readingResult.words
  };
}
