# Re-ingest pilot: tool-fix patches (carrier branch, not for merge)

These are the fixes for the defects found by the re-ingest pilot (who-iris#280). They were written in a session that has no push access to the two tool repositories. Each subdirectory holds one `git format-patch` commit, to be applied with `git am` onto that repository's `main` and opened as its own PR:

| dir | repo | what |
|---|---|---|
| `folio-assistant-core/fix-1-references-footnote` | folio-assistant-core | `references-extract`: a whole References section is read from after its heading, past a stray footnote line (9789240101197-eng 4 → 29) |
| `folio-assistant-core/fix-2-glossary-layout` | folio-assistant-core | `glossary-from-source`: reads the PDF layout (term over definition, acronym over expansion); a titled glossary section is never recorded `none`; title words must open the title |
| `cat-harness-tools/fix-3-tables-prose` | cat-harness-tools | table arm: prose cut into columns is not drafted as a table (word-split test) |
| `cat-harness-tools/fix-4-7-extraction-counts` | cat-harness-tools | extraction record: footnotes count only called notes; a re-run over a promoted entry trusts the artefacts over its old record |
| `cat-harness-tools/fix-5-6-image-translations` | cat-harness-tools | `apply-image-verdicts`: keeps image descriptions in other languages when the English is unchanged (re-ingest and bare run) |
| `cat-harness-tools/fix-8-contents-unlisted-sections` | cat-harness-tools | library viewer: an inferred contents shows the sections it does not list, at their place |

Each patch applies alone and in any order onto folio-assistant-core `745c3541` and cat-harness-tools `06efeba4`. Delete this branch once the PRs are open.
