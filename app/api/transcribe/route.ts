import { NextRequest, NextResponse } from 'next/server';
import { WhisperService } from '../../../lib/whisper-service';

export async function POST(request: NextRequest) {
  try {
    // Validate API key exists
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'es';

    console.log('Received audio file:', {
      name: audioFile?.name,
      type: audioFile?.type,
      size: audioFile?.size
    });

    // Validate audio file
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check file size (25MB limit)
    if (!WhisperService.isValidAudioSize(audioFile)) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    // Check file type
    if (!WhisperService.isSupportedAudioType(audioFile)) {
      return NextResponse.json(
        { 
          error: 'Unsupported audio format. Please use MP3, MP4, WAV, or WebM.' 
        },
        { status: 400 }
      );
    }

    // Initialize Whisper service
    const whisperService = new WhisperService(process.env.OPENAI_API_KEY);

    const result = await whisperService.transcribe(
      audioFile,
      { language }
    );

    // Return transcription result
    return NextResponse.json({
      success: true,
      transcription: result.text,
      language: result.language,
      duration: result.duration,
      segments: result.segments
    });

  } catch (error) {
    console.error('Transcription API error:', error);

    // Return appropriate error message
    const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
    
    // Determine status code based on error type
    let status = 500;
    if (errorMessage.includes('Invalid API key')) {
      status = 401;
    } else if (errorMessage.includes('Rate limit')) {
      status = 429;
    } else if (
      errorMessage.includes('Invalid audio file') || 
      errorMessage.includes('too large')
    ) {
      status = 400;
    }

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to transcribe audio.' },
    { status: 405 }
  );
}
