"use client";
import * as React from 'react';
import { Verse, Attempt, GradeResponse, TranscriptionResponse } from '../lib/types';
import { appendAttempt, loadProgress, clearVerseHistory } from '../lib/storage';
import { classNames } from '../lib/utils';
import { getRecordingLimitInfo } from '../lib/audio-utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TooltipIconButton } from '@/components/ui/tooltip-icon-button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { RotateCcw, Volume2, Loader2 } from 'lucide-react';
import { AudioRecorder } from './audio-recorder';
import { History } from './history';
import { useToast } from './ui/toast';

interface Props {
  verse: Verse | null;
  onAttemptSaved: () => void;
  onFirstRecord: () => void;
}

export const SpeechModeCard: React.FC<Props> = ({ verse, onAttemptSaved, onFirstRecord }) => {
  const { pushToast } = useToast();
  const [status, setStatus] = React.useState<'idle' | 'recording' | 'transcribing' | 'transcribed' | 'editing' | 'grading' | 'result' | 'error'>('idle');
  const [result, setResult] = React.useState<GradeResponse | null>(null);
  const [transcription, setTranscription] = React.useState<string>('');
  const [editedTranscription, setEditedTranscription] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [attempts, setAttempts] = React.useState<Attempt[]>([]);
  const [audioDuration, setAudioDuration] = React.useState<number>(0);
  const liveRef = React.useRef<HTMLDivElement | null>(null);

  const resetAttempt = React.useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setTranscription('');
    setEditedTranscription('');
    setAudioDuration(0);
  }, []);

  // Load attempts for current verse
  React.useEffect(() => {
    if (!verse) { 
      setAttempts([]); 
      return; 
    }
    const p = loadProgress();
    const data = p.verses[verse.id];
    setAttempts(data?.attempts || []);
  }, [verse]);

  const transcribeAudio = React.useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    if (verse?.text) {
      formData.append('expectedText', verse.text);
    }
    formData.append('language', 'en');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: TranscriptionResponse = await response.json();
      
      if (!data.success || !data.transcription) {
        throw new Error(data.error || 'No transcription received');
      }

      return data.transcription;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }, [verse]);

  const gradeTranscription = React.useCallback(async (transcribedText: string): Promise<GradeResponse> => {
    if (!verse) throw new Error('No verse selected');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        body: JSON.stringify({
          targetText: verse.text,
          attemptText: transcribedText
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) throw new Error('Grading failed');

      const json = await response.json() as GradeResponse;
      let acc = json.accuracy;
      if (acc <= 1) acc = Math.round(acc * 100);
      json.accuracy = Math.min(100, Math.max(0, acc));
      if (!json.gradedBy) json.gradedBy = 'naive';

      return json;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }, [verse]);

  const handleRecordingComplete = React.useCallback(async (audioBlob: Blob) => {
    if (!verse) return;

    try {
      setError(null);
      setStatus('transcribing');
      
      const transcribedText = await transcribeAudio(audioBlob);
      setTranscription(transcribedText);
      setEditedTranscription(transcribedText);
      setStatus('transcribed');

    } catch (err: unknown) {
      console.error('Speech processing error:', err);
      const error = err as Error;
      const message = error.name === 'AbortError' ? 'Request timed out' : 
                     error.message || 'Failed to process speech';
      setError(message);
      setStatus('error');
      pushToast({ 
        title: 'Speech processing failed', 
        description: message,
        action: { label: 'Try Again', onClick: resetAttempt }
      });
    }
  }, [verse, transcribeAudio, pushToast, resetAttempt]);

  const handleRecordingStart = React.useCallback(() => {
    setStatus('recording');
    setError(null);
    setResult(null);
    setTranscription('');
    onFirstRecord();
  }, [onFirstRecord]);

  const handleRecordingStop = React.useCallback((duration: number = 0) => {
    setAudioDuration(duration);
  }, []);

  const handleSubmitTranscription = React.useCallback(async () => {
    if (!verse || !editedTranscription.trim()) return;

    try {
      setStatus('grading');
      const gradeResult = await gradeTranscription(editedTranscription);
      setResult(gradeResult);
      setStatus('result');

      // Save attempt
      const attempt: Attempt = {
        ts: Date.now(),
        mode: 'speech',
        inputLength: editedTranscription.length,
        accuracy: gradeResult.accuracy,
        missedWords: gradeResult.missedWords || [],
        extraWords: gradeResult.extraWords || [],
        feedback: gradeResult.feedback,
        diff: gradeResult.diff,
        transcription: editedTranscription,
        audioDuration,
        confidenceScore: undefined
      };

      appendAttempt(verse, attempt);
      onAttemptSaved();
      
      const p = loadProgress();
      setAttempts(p.verses[verse.id]?.attempts || []);

      setTimeout(() => {
        if (liveRef.current) {
          liveRef.current.textContent = `Accuracy ${attempt.accuracy} percent. Transcribed: ${editedTranscription.substring(0, 50)}${editedTranscription.length > 50 ? '...' : ''}`;
        }
      }, 50);

    } catch (err: unknown) {
      console.error('Grading error:', err);
      const error = err as Error;
      const message = error.message || 'Failed to grade transcription';
      setError(message);
      setStatus('error');
      pushToast({ 
        title: 'Grading failed', 
        description: message,
        action: { label: 'Try Again', onClick: resetAttempt }
      });
    }
  }, [verse, editedTranscription, gradeTranscription, audioDuration, onAttemptSaved, pushToast, resetAttempt]);

  const handleEditTranscription = React.useCallback(() => {
    setStatus('editing');
  }, []);

  const handleSaveEdit = React.useCallback(() => {
    setStatus('transcribed');
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && status !== 'recording') {
        resetAttempt();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, resetAttempt]);

  const isProcessing = status === 'transcribing' || status === 'grading';
  const isRecording = status === 'recording';
  const showTranscriptionActions = status === 'transcribed' || status === 'editing';
  
  // Calculate dynamic recording limit based on verse length
  const recordingInfo = React.useMemo(() => {
    return verse ? getRecordingLimitInfo(verse.text) : { seconds: 30, formatted: '30s', estimatedSpeakingTime: 0, wordCount: 0 };
  }, [verse]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Volume2 size={18} />
              Speech Mode
            </CardTitle>
            <CardDescription>
              {verse ? verse.reference : 'Select a verse to begin'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TooltipIconButton 
              label="Reset attempt" 
              onClick={resetAttempt}
              disabled={isRecording}
            >
              <RotateCcw size={16} />
            </TooltipIconButton>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1 overflow-auto">
        <div className="space-y-4">
          

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Record your attempt
            </label>
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={handleRecordingStart}
              onRecordingStop={handleRecordingStop}
              maxDuration={recordingInfo.seconds}
              disabled={!verse || isProcessing || showTranscriptionActions}
            />
            
            {verse && (
              <div className="text-xs text-neutral-500 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Recording limit: {recordingInfo.formatted}</span>
                  <span>{recordingInfo.wordCount} words</span>
                </div>
                <div className="text-[10px] text-neutral-400">
                  Takes ~{Math.ceil(recordingInfo.estimatedSpeakingTime)}s to read aloud • Plenty of time for practice!
                </div>
              </div>
            )}
          </div>

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <Loader2 className="animate-spin" size={16} />
              {status === 'transcribing' ? 'Converting speech to text...' : 'Grading your attempt...'}
            </div>
          )}

          {transcription && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                What we heard
              </p>
              
              {status === 'editing' ? (
                <div className="space-y-2">
                  <textarea
                    value={editedTranscription}
                    onChange={(e) => setEditedTranscription(e.target.value)}
                    className="w-full p-3 text-sm font-mono rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Edit the transcription..."
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleSaveEdit}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Save Changes
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setEditedTranscription(transcription);
                        setStatus('transcribed');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                    <p className="text-sm font-mono">{editedTranscription}</p>
                  </div>
                  
                  {status === 'transcribed' && (
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSubmitTranscription}
                        disabled={!editedTranscription.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Submit & Grade
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleEditTranscription}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />
        
        <div aria-live="polite" ref={liveRef} className="sr-only" />
        
        <div className="space-y-4">
          {isProcessing && !result && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-200 dark:border-red-800 p-2 rounded">
              {error}
            </div>
          )}

          {result && status === 'result' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-semibold">{result.accuracy}%</span>
                {result.gradedBy && (
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {result.gradedBy}
                  </Badge>
                )}
                <div className="flex-1 relative">
                  <Progress value={result.accuracy} className="bg-neutral-200 dark:bg-neutral-800" />
                  <div 
                    className={classNames(
                      'absolute inset-0 rounded-full mix-blend-multiply pointer-events-none',
                      result.accuracy >= 85 && 'bg-green-500/30',
                      result.accuracy >= 60 && result.accuracy < 85 && 'bg-blue-500/30',
                      result.accuracy < 60 && 'bg-amber-500/30'
                    )} 
                    aria-hidden 
                  />
                </div>
              </div>

              {audioDuration > 0 && (
                <p className="text-xs text-neutral-500">
                  Recording duration: {audioDuration}s
                </p>
              )}

              {result.diff && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-500">
                    Comparison
                  </p>
                  <div className="p-2 rounded-md bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 max-h-48 overflow-auto leading-relaxed text-sm">
                    {result.diff.map((t, i) => (
                      <span 
                        key={i} 
                        className={classNames(
                          'px-0.5',
                          t.status === 'match' && 'text-neutral-800 dark:text-neutral-100',
                          t.status === 'missing' && 'bg-red-500/10 text-red-600 dark:text-red-400 underline',
                          t.status === 'extra' && 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 line-through',
                          t.status === 'punct' && 'bg-amber-300/20 text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {t.token + ' '}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Punctuation shown in yellow (ignored for scoring).
                  </p>
                </div>
              )}

              {result.feedback && (
                <div className="text-sm text-neutral-600 dark:text-neutral-400 border-l-2 border-neutral-300 dark:border-neutral-700 pl-3">
                  {result.feedback}
                </div>
              )}

              <div>
                <Button size="sm" variant="secondary" onClick={resetAttempt}>
                  Try again
                </Button>
              </div>
            </div>
          )}
        </div>

        {attempts.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">History</h4>
              <History 
                attempts={attempts} 
                onClear={() => {
                  if (verse) {
                    if (confirm('Clear history?')) {
                      clearVerseHistory(verse.id);
                      const p = loadProgress();
                      setAttempts(p.verses[verse.id]?.attempts || []);
                      pushToast({ 
                        title: 'History cleared', 
                        description: verse.reference 
                      });
                    }
                  }
                }} 
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
