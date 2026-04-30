Phase: 20 UI integration fix pass
Branch: phase-rag-foundation
Runtime behavior changed: no additional backend pipeline change except route sanitization and compatibility shaping
UI changed: hardened structured RAG section rendering
Old UI fallback: preserved
DB changed: no migration
Hardcoded content: none
Security:
- unsafe/internal section keys omitted
- raw meta/artifacts/raw facts not rendered
- secrets/env/local URLs not rendered
- HTML rendered as text, no dangerouslySetInnerHTML
Validation:
- rag UI test: passed
- rag API route test: passed
- broader RAG tests: passed for selected UI/provider/RAG suites
- existing UI tests: passed for selected UI suites
- existing groq/provider tests: passed for selected provider suites
- typecheck: pending
- lint: pending
- build: pending
- tests: pending
Visual:
- local: Codex sandbox EPERM on socket bind; use normal Mac terminal for dev smoke
- live: not run
Deployment:
- skipped
Remaining blockers:
- none
