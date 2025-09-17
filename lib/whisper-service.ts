import OpenAI from 'openai';

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export class WhisperService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    if (!apiKey && typeof window === 'undefined') {
      // Server-side: expect API key from environment
      apiKey = process.env.OPENAI_API_KEY;
    }
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey,
      // Only set dangerouslyAllowBrowser for client-side usage
      // In practice, we'll use this server-side via API routes
      dangerouslyAllowBrowser: typeof window !== 'undefined'
    });
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  async transcribe(
    audioFile: File | Blob, 
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      const {
        language = 'es',
        prompt,
        responseFormat = 'text',
        temperature = 0
      } = options;

      // Always clean up and recreate the file for OpenAI compatibility
      const extension = this.getFileExtensionFromBlob(audioFile);
      const fileName = `recording.${extension}`;
      
      // Clean up MIME type for OpenAI compatibility
      let mimeType = audioFile.type;
      // Remove codec information that OpenAI might not like
      if (mimeType.includes(';')) {
        mimeType = mimeType.split(';')[0];
      }
      if (!mimeType || mimeType === 'audio/wav') {
        mimeType = extension === 'webm' ? 'audio/webm' : 'audio/wav';
      }
      
      console.log('Creating file for OpenAI:', { fileName, mimeType, originalType: audioFile.type });
      
      // Always create a new File with cleaned up properties
      const file = new File([audioFile], fileName, { type: mimeType });

      console.log('Whisper request params:', {
        fileName, mimeType, language, prompt, responseFormat, temperature,
        fileSize: file.size
      });

      const response = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'gpt-4o-transcribe',
        language: 'es',
        prompt,
        response_format: responseFormat,
        temperature
      });

      // Handle different response formats
      if (responseFormat === 'text') {
        return {
          text: (response as unknown) as string,
          language
        };
      }

      // For verbose_json and json formats
      const result = response as any;
      return {
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments?.map((segment: any) => ({
          start: segment.start,
          end: segment.end,
          text: segment.text
        }))
      };

    } catch (error) {
      console.error('Transcription error:', error);
      
      if (error instanceof OpenAI.APIError) {
        switch (error.status) {
          case 400:
            throw new Error('Invalid audio file or request parameters');
          case 401:
            throw new Error('Invalid API key');
          case 413:
            throw new Error('Audio file too large (max 25MB)');
          case 429:
            throw new Error('Rate limit exceeded. Please try again later.');
          case 500:
            throw new Error('OpenAI service error. Please try again.');
          default:
            throw new Error(`API error: ${error.message}`);
        }
      }
      
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Get file extension from blob type
   */
  private getFileExtensionFromBlob(blob: Blob): string {
    const type = blob.type;
    
    if (type.includes('webm')) return 'webm';
    if (type.includes('mp4')) return 'mp4';
    if (type.includes('wav')) return 'wav';
    if (type.includes('mp3')) return 'mp3';
    if (type.includes('m4a')) return 'm4a';
    
    return 'webm'; // Default fallback
  }

  /**
   * Check if audio file size is within limits
   */
  static isValidAudioSize(file: File | Blob): boolean {
    const maxSize = 25 * 1024 * 1024; // 25MB limit from OpenAI
    return file.size <= maxSize;
  }

  /**
   * Check if audio file type is supported
   */
  static isSupportedAudioType(file: File | Blob): boolean {
    const supportedTypes = [
      'audio/mp3', 'audio/mpeg',
      'audio/mp4', 'audio/m4a',
      'audio/wav',
      'audio/webm'
    ];
    
    return supportedTypes.some(type => file.type.includes(type.split('/')[1]));
  }
}

// Create a singleton instance for client-side usage
let whisperServiceInstance: WhisperService | null = null;

export function getWhisperService(apiKey?: string): WhisperService {
  if (!whisperServiceInstance) {
    whisperServiceInstance = new WhisperService(apiKey);
  }
  return whisperServiceInstance;
}
