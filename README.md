# English Loop (MVP v0.2)

Prompt-first English conversation training app.

## Setup

```bash
npm install
npm run dev
```

## Included

- 4 tabs: Week / Practice / Materials / Profile
- Prompt generation and copy for Step2/5/6/7
- Paste-and-save flow for scripts and corrections (localStorage)
- Text-to-speech via Web Speech API
- Recording via MediaRecorder + file upload fallback
- 3-2-1 timer and records
- Sunday review with Monday vs Sunday recording comparison
- Basic PWA support (manifest + service worker)

## Notes

- No direct LLM API integration in v0.x
- Data structure is designed to be replaceable with Supabase later
