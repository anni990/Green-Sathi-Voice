# Audio Pipeline Implementation Plan (Revised)

## Purpose
Centralize audio pipeline selection so the backend chooses between the local "library" implementations (gTTS + speech_recognition) and the cloud "api" implementations (Azure Speech SDK) using a single `Config.AUDIO_PIPELINE` flag. The frontend will call unified endpoints; backend selects the implementation.

## Quick findings from current code
- `backend/services/speech_service.py` contains `speech_to_text`, `text_to_speech`, `azure_real_time_speech_to_text`, and `azure_text_to_speech` but does not initialize `self.azure_speech_config` in `__init__` (risk of AttributeError when calling Azure methods).
- There is a duplicate/alternative implementation in `backend/services/rough.py` which does initialize Azure config — we must consolidate to a single canonical service.
- `backend/routes/voice_routes.py` currently calls library-based methods (e.g., `process_uploaded_audio`, `text_to_speech`) and also calls `azure_real_time_speech_to_text` / `azure_text_to_speech` directly in some endpoints — this prevents centralized selection.
- `backend/utils/config.py` does not include an `AUDIO_PIPELINE` flag yet.

## Goals
- Add `Config.AUDIO_PIPELINE` with values `"library"` or `"api"` (default: `"library"`).
- Provide a single decision point in `SpeechService` so routes call unified wrappers instead of selecting implementations.
- Normalize return values and behavior across implementations.
- Add tests for pipeline switching and fallback.

## High-level approach (no code changes yet)
1. Add `AUDIO_PIPELINE` to `backend/utils/config.py` (default `"library"`).
2. Consolidate Azure initialization and client creation in `SpeechService.__init__` (or a single canonical module) to ensure `self.azure_speech_config` exists whenever Azure is usable.
3. Add high-level wrapper methods to `SpeechService`:
   - `stt_from_file(audio_path: str, language: str) -> Optional[str]` — returns transcribed text or `None`.
   - `tts_to_file(text: str, language: str, output_path: Optional[str] = None) -> Optional[str]` — returns filepath on success or `None`.
   - `real_time_stt(language: str) -> Optional[str]` — for microphone/streaming use (prefer Azure when `api`).
   Behavior: wrappers pick implementation based on `Config.AUDIO_PIPELINE`, and fall back to `library` when `api` is selected but Azure is not configured.
4. Update `process_uploaded_audio()` to call `stt_from_file()` rather than `speech_to_text()` directly.
5. Update `voice_routes.py` endpoints to call the unified wrappers:
   - `/process_audio` → `speech_service.process_uploaded_audio(...)` (unchanged signature for routes)
   - `/text_to_speech` → `speech_service.tts_to_file(...)`
   Keep Azure-specific endpoints only for admin/debug if desired.

## Normalization and behavior contracts
- STT: always return `str` (transcription) or `None` on failure.
- TTS: always return `str` (filepath to audio file) or `None` on failure. Do not internally play audio on server; if previously code used speaker playback, change to writing a tempfile and returning path.
- All wrappers must log: chosen pipeline, reasons for fallback, and any Azure diagnostic info when available.

## Tests to add/modify
- Add tests in `tests/test_voice_bot.py` to cover:
  - `AUDIO_PIPELINE='library'` behavior: `process_uploaded_audio`, `tts_to_file`.
  - `AUDIO_PIPELINE='api'` behavior: successful Azure path (mock Azure clients) and fallback when Azure keys missing.
  - Normalized return types and file cleanup.

## Rollout and migration
- Default to `"library"` to avoid requiring Azure credentials.
- Keep Azure endpoints while migrating; mark them experimental in docs.
- After wrapper is stable and tested, update frontend to only call unified endpoints if not already.

## Files touched (minimal set)
- `backend/utils/config.py` — add `AUDIO_PIPELINE` and document allowed values.
- `backend/services/speech_service.py` —
  - Initialize Azure config safely in `__init__` (or centralize init code from `rough.py`).
  - Add `stt_from_file`, `tts_to_file`, `real_time_stt` wrappers and fallback logic.
  - Normalize return types and logging.
- `backend/routes/voice_routes.py` — call wrappers instead of Azure/lib specific methods; keep route signatures.
- `backend/services/rough.py` — consolidate useful initialization code or remove duplicate file to avoid divergence.
- `tests/test_voice_bot.py` — add pipeline selection tests and mocks.

## Edge cases & implementation notes
- Ensure `AUDIO_UPLOAD_FOLDER` exists and has correct permissions; tests should mock filesystem I/O.
- Azure: use file-based recognition for uploaded files (SpeechRecognizer with `AudioConfig(filename=...)`) instead of microphone streaming.
- Avoid playing audio via `use_default_speaker` on servers; always produce a file to return.
- Guarantee singletons for Azure clients (reusing `SpeechConfig` / `SpeechSynthesizer`) to avoid re-creating clients per request.

## Suggested wrapper signatures (for the implementation phase)
- `def stt_from_file(self, file_path: str, language: str) -> Optional[str]:` — returns text or None.
- `def tts_to_file(self, text: str, language: str, output_path: Optional[str] = None) -> Optional[str]:` — returns filepath or None.
- `def real_time_stt(self, language: str) -> Optional[str]:` — real-time STT wrapper for microphone stream.

## Next actionable steps (recommended order)
1. Add `AUDIO_PIPELINE` to `backend/utils/config.py` (default `"library"`).
2. Consolidate Azure initialization in `speech_service.py` and/or remove `rough.py` duplication.
3. Add the wrapper methods to `SpeechService` (implement fallback and logging).
4. Update route handlers to call wrappers.
5. Add tests and run test suite.
6. Update docs (`README.md` and `Notes/`) and deploy behind a feature flag if needed.

If you'd like, I can now produce the exact code skeletons and line-level TODOs for each file (no edits applied), or implement the changes in a feature branch. Which do you prefer?
<parameter name="filePath">e:\Green-Sathi-Voice\Notes\audio_pipeline_implementation_plan.md