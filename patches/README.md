# Re-ingest fixes, round 2: tool patches (carrier branch, not for merge)

These fix the gaps found by the re-run (who-iris#286), plus the page→section map the owner asked for on 2026-11-15 ("Fix gaps, then batch"; "Keep page→section map"). Each subdirectory holds one `git format-patch` commit for cat-harness-tools: apply it with `git am` onto `main` and open it as its own PR. Fix 2 is a who-iris script and has its own who-iris PR.

| dir | what | applies |
|---|---|---|
| `cat-harness-tools/fix-1-contents-skip-figure-lists` | contents page: entries under a Figures / Tables / Boxes list are not contents (10665-75211: 71 → 19 entries, 97 → 49 sections) | alone, any order |
| `cat-harness-tools/fix-3-promote-keeps-licence-and-tables` | promotion copies the filed entry's licence and kept table transcription into staging before building nodes | alone |
| `cat-harness-tools/fix-4-promote-records-summaries` | promotion records the entry's summaries kind | **after fix 3** |
| `cat-harness-tools/fix-5-page-section-map` | `section-map.json` (folio-library-section-map/v1): old page-NNN → new sections, old pN:sM → new (section, sentence); resolver and CLI; written at promotion | **after fix 4** |

Base: cat-harness-tools `4b8978c2`. Order: fix 1 anywhere, then 3 → 4 → 5. Delete this branch once the PRs are open.
