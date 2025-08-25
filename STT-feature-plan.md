# Speech-to-Text (STT) Feature Plan

## Overview
Add Whisper-based speech-to-text functionality to the memorize-scripture app to allow users to practice verse recitation through speech input instead of typing.

## Technology Approach

Based on the documentation research, we'll use the **OpenAI API Whisper endpoint** approach:
- Use the existing `openai` package (v5.15.0) already in dependencies
- Leverage OpenAI's hosted Whisper API for high-quality transcription
- No need for local model hosting or complex setup
- Works seamlessly in web browsers

## Implementation Plan

### 1. Audio Recording Component
- **File**: `components/audio-recorder.tsx`
- **Features**:
  - Record button with visual feedback (recording state)
  - Audio waveform visualization (optional)
  - Stop/start recording controls
  - Audio playback for review
  - File size and duration limits

### 2. Whisper Integration Service  
- **File**: `lib/whisper-service.ts`
- **Features**:
  - OpenAI API client wrapper
  - Audio file transcription
  - Error handling and retry logic
  - Audio format conversion (if needed)

### 3. Speech Mode Card
- **File**: `components/speech-mode-card.tsx`
- **Features**:
  - Alternative to TypeModeCard for speech input
  - Integrate AudioRecorder component
  - Show verse text for reference
  - Compare transcription with target verse
  - Scoring/accuracy feedback
  - Practice session history

### 4. API Route
- **File**: `app/api/transcribe/route.ts`
- **Features**:
  - Handle audio file uploads
  - Call OpenAI Whisper API
  - Return transcription results
  - Error handling and validation

### 5. Mode Selector
- **Enhancement**: Add toggle between Type Mode and Speech Mode
- **Location**: Header or main interface
- **State**: Global mode selection

## Technical Implementation Details

### Audio Recording
```typescript
// Use Web Audio API MediaRecorder
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus' // or 'audio/mp4'
});
```

### OpenAI Whisper Integration
```typescript
// Using the existing openai package
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  language: 'en', // or auto-detect
  response_format: 'text'
});
```

### File Handling
- Support audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
- Client-side: Record as webm/mp4
- Server-side: Forward to OpenAI API as-is

## File Structure Changes

```
lib/
├── whisper-service.ts          # New: Whisper API wrapper
├── audio-utils.ts              # New: Audio processing utilities
└── types.ts                    # Updated: Add speech attempt types

components/
├── audio-recorder.tsx          # New: Recording component  
├── speech-mode-card.tsx        # New: Speech practice interface
├── mode-selector.tsx           # New: Type/Speech mode toggle
└── ui/                         # Existing UI components

app/
└── api/
    └── transcribe/
        └── route.ts            # New: Transcription API endpoint
```

## User Experience Flow

1. **Mode Selection**: User chooses Speech Mode
2. **Verse Selection**: Same verse picker as Type Mode
3. **Recording**: 
   - Press and hold to record
   - Visual feedback during recording
   - Auto-stop after silence or time limit
4. **Processing**: 
   - Show loading state while transcribing
   - Display transcription result
5. **Feedback**: 
   - Compare with target verse
   - Highlight differences
   - Provide accuracy score
6. **Retry**: Option to record again or switch to Type Mode

## Configuration & Environment

### Required Environment Variables
```bash
OPENAI_API_KEY=sk-...  # Required for Whisper API
```

### Optional Configuration
```bash
NEXT_PUBLIC_MAX_RECORDING_DURATION=30  # seconds
NEXT_PUBLIC_WHISPER_MODEL=whisper-1     # model selection
NEXT_PUBLIC_WHISPER_LANGUAGE=en         # language hint
```

## Success Metrics

- **Accuracy**: Transcription quality for biblical text
- **Performance**: Sub-3 second transcription response time
- **Usability**: Intuitive recording interface
- **Accessibility**: Voice input alternative to typing

## Future Enhancements

1. **Local Whisper**: Option for offline processing using whisper.cpp
2. **Language Support**: Multi-language verse memorization
3. **Speaker Training**: Adapt to user's voice patterns
4. **Advanced Scoring**: Pronunciation and fluency assessment
5. **Voice Commands**: Navigate app via speech

## Risk Considerations

- **API Costs**: Monitor OpenAI usage and implement rate limiting
- **Audio Quality**: Poor microphone quality affecting accuracy  
- **Privacy**: Clarify audio data handling (not stored by OpenAI for API calls)
- **Browser Support**: MediaRecorder API compatibility
- **Network**: Handle offline scenarios gracefully

## Development Priority

1. **Phase 1**: Basic audio recording and transcription
2. **Phase 2**: Speech mode interface and comparison
3. **Phase 3**: Enhanced UX and accuracy scoring
4. **Phase 4**: Advanced features and optimizations