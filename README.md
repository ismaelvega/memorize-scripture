# Memorize – Scripture Memorization App

Minimal Bible verse memorization with **Type**, **Speech**, and **Stealth** modes using a Spanish scripture dataset. Built with Next.js App Router, Tailwind CSS v4, OpenAI Whisper integration, and localStorage persistence.

## Features

### Core Functionality
- **Triple Practice Modes**: Type Mode (free typing with grading), Speech Mode (voice input via OpenAI Whisper), and Stealth Mode (word-by-word recall with hidden text)
- **Mode Toggle**: Seamless switching between typing, speaking, and stealth practice
- **Read Mode (sin calificación)**: Reveals the selected pasaje en fragmentos según la puntuación para repasarlo antes de practicar
- **Cross-Platform**: Works on desktop and mobile with optimized mobile flow

### Verse Management
- Verse picker (Spanish dataset under `public/bible_data`) with:
  - Filter-as-you-type book list (`/` focuses filter)
  - Collapsible book selector (auto‑collapses after choosing a book; `Cambiar` button reopens)
  - Reload index & reload current book buttons
  - Clearable chapter & verse numeric inputs (backspace leaves them blank while editing; clamps on blur)
  - Peek / hide verse text (Alt+P)

### Practice Features
- **Hints**: 0 / 3 / 6 starting words reveal
- **Calificación sin conexión**: Type y Speech calculan la precisión localmente sin depender de APIs
- **Dynamic recording limits**: Speech recording time automatically adjusts based on verse length
- **Editable transcriptions**: Fix Whisper transcription errors before grading
- **Local attempt history**: Per-verse history with expandable diff & clear-history action
- **Stealth Mode workflow**: Hidden verse text where each word must be recalled from memory; incorrect words highlight red until corrected
- **Mode picker**: After selecting verses you choose Type, Speech, or Stealth before jumping into `/practice/<mode>`
- **Leer rápidamente**: Botón “Leer” siempre visible junto a “Cambiar versículos”, con una sugerencia para pasajes sin intentos previos

### Speech Mode (STT) Features
- **OpenAI Whisper Integration**: High-quality speech-to-text transcription
- **Biblical Context Enhancement**: Spanish biblical terms for improved accuracy
- **Smart Recording Limits**: 
  - Calculates speaking time at 180 WPM
  - Adds 60s comfort buffer + 2.5x multiplier
  - Minimum 75s, maximum 4 minutes
- **Edit Transcription**: Review and correct transcription before grading
- **Audio Playback**: Listen to your recording before submitting

### User Experience
- **Keyboard shortcuts**: `/` focus filter, Alt+P toggle peek, Ctrl+Enter submit attempt, Esc clear
- **Toast notifications** for grading & actions
- **Progress tracking** across both Type and Speech modes
- **Accessible design** with proper labels, focus styles, and aria-live feedback
- **Mobile-optimized** interface with dedicated mobile flow

## Tech Stack

### Core Framework
- **Next.js 15** (App Router) + **React 19**
- **Tailwind CSS v4**
- **TypeScript** with strict configuration

### Speech-to-Text Integration
- **OpenAI Whisper API** for high-quality transcription
- **reading-time-estimator** for dynamic recording limits
- **Web Audio API** (MediaRecorder) for browser-based recording

### UI Components
- Custom minimal primitives (Card, Button, Input, Textarea, Badge, Progress, Toast)
- **lucide-react** icons
- Responsive mobile-first design

### Data & State Management
- **localStorage** persistence for offline functionality
- Mobile flow with React Context state management
- Optimistic UI updates

## Data Format

`/public/bible_data/_index.json` – array of book metadata objects:

```jsonc
[
	{
		"testament": "NT",
		"title": "Juan",
		"shortTitle": "Jn",
		"abbr": "Jn",
		"category": "Gospel",
		"key": "juan",      // filename stem
		"number": 43,
		"chapters": 21,
		"verses": 879
	}
]
```

Each book file (`juan.json`) is a 2‑D string array: `string[][]` where index 0 = chapter 1, each chapter array holds verse strings (1‑based in UI). Example (truncated):

```json
[
	[
		"En el principio era el Verbo...",
		"Este era en el principio con Dios..."
	],
	[
		"Al tercer día se hicieron unas bodas..."
	]
]
```

Text sanitation removes literal `/n` markers and underscores, normalizing whitespace.

## Development

```powershell
npm install
npm run dev
```

Run the local grading tests:

```bash
node --test tests/grade.test.js
```

**Required for Speech Mode**: Create a `.env.local` with:

```bash
OPENAI_API_KEY=sk-...
```

**OpenAI API usage:**
- **Speech transcription**: `/api/transcribe` (automatic in Speech Mode)
- Falls back gracefully if key missing (Speech Mode will show error)

Visit <http://localhost:3000>

## API Endpoints

### Speech Transcription API
`POST /api/transcribe`

Multipart form data:
- `audio`: Audio file (WebM, WAV, MP3, etc.)
- `expectedText`: Target verse text (optional, improves accuracy)
- `language`: Language code (default: 'en')

```json
{
  "success": true,
  "transcription": "For God so loved the world...",
  "language": "es",
  "duration": 12.5
}
```

**Features:**
- Supports multiple audio formats (WebM, WAV, MP3, MP4, etc.)
- Biblical context enhancement for improved accuracy
- 25MB file size limit
- Automatic format cleanup for OpenAI compatibility

## Persistence

LocalStorage key `bm_progress_v1`:

```jsonc
{
  "verses": {
    "<verseId>": {
      "reference": "Jn 3:16",
      "translation": "ES", 
      "text": "Porque de tal manera amó Dios al mundo...",
      "attempts": [
        {
          "ts": 1732300000000,
          "mode": "type", // or "speech" / "stealth"
          "inputLength": 45,
          "accuracy": 92.3,
          "missedWords": ["mundo"],
          "extraWords": [],
          "feedback": "Great job!",
          "diff": [/* token diff array */],
          // Speech mode specific fields
          "transcription": "Porque de tal manera amo Dios al mundo...", 
          "audioDuration": 12.5,
          "confidenceScore": null
        }
      ],
      "source": "built-in"
    }
  },
  "lastSelectedVerseId": "juan-3-16-es"
}
```

## Speech Mode Workflow

1. **Select Speech Mode**: Toggle from Type Mode to Speech Mode
2. **Choose Verse**: Select any verse - recording limit automatically adjusts
3. **See Recording Info**: 
   - Dynamic limit based on verse length (75s - 4m)
   - Word count and estimated speaking time
4. **Record Audio**: 
   - Press Record button to start
   - Visual feedback with progress bar
   - Auto-stop at time limit or manual stop
5. **Review & Edit**: 
   - Whisper transcribes your speech
   - Review "What we heard" section
   - Edit transcription if needed (fix errors)
6. **Submit & Grade**: 
   - Click "Submit & Grade" 
   - Same accuracy scoring as Type Mode
   - Progress tracked in history

## Implementation Notes

- `/practice` is the real “home” view—the root route simply redirects there so the floating header, ProgressList, and Flow-based selector remain consistent across desktop and mobile.
- The Flow store (`components/mobile/flow.tsx`) drives book → chapter → verse → mode navigation; `BottomBar` enforces contiguous ranges and warns when a selection exceeds ~6 verses / ~120 estimated words (opt-out stored under `bm_skip_large_selection_warning`).
- Verse search preloads the entire Bible JSON dataset for instant local filtering, AND/OR/NOT syntax, and “Juan 3:16-19” parsing. Keep its memory cost in mind if you expand it.
- Read Mode (`/practice/read`) reveals sanitized fragments sequentially and requires users to rebuild the citation (book/chapter/verses) via interactive bubbles before calling the passage “read”.
- Each practice card writes attempts into `bm_progress_v1` along with diff tokens and per-mode completion counters (3 perfect runs per mode). Sequence Mode chunks text via `chunkVerseForSequenceMode`, Stealth relies on `HiddenInlineInput`, Speech integrates `AudioRecorder` + Whisper, and Type includes time-limited peeks.
- Diff rendering/History is centralized (`components/history.tsx` + `components/diff-renderer.tsx`), so reuse those helpers whenever you add new attempt visuals.

## Current Caveats & Next Steps

1. Verse search eagerly loads every book JSON on the client. If you extend it, consider async strategies (Web Worker, API endpoint, or per-book lazy loading) to reduce memory pressure.
2. Speech Mode submits `expectedText` with the transcription request, but `/api/transcribe` currently ignores it. Thread the text into `WhisperService`’s prompt if you touch that route.
3. The transcription route logs filename/type/size for every upload. Strip or guard those logs before shipping production builds to avoid leaking metadata.
4. Neither `/api/transcribe` nor `/api/ai-feedback` declares `export const runtime = 'nodejs'`; add it when editing those files so Next.js never deploys them to the Edge runtime.
5. `/api/ai-feedback` exists but nothing calls it yet. If you want richer coaching, wire it into Type/Speech results (with opt-in) instead of relying solely on the naive grader.

## Browser Requirements

- **Microphone access** required for Speech Mode
- **Modern browser** with MediaRecorder API support:
  - Chrome 47+ ✅
  - Firefox 29+ ✅  
  - Safari 14.1+ ✅
  - Edge 79+ ✅
