# A parallel OptimusKG-style KG path for who-iris: design and integration options

**Status: exploration and design only.** This document adds no code, no
process files and no beans. It sets out the integration options, a
recommendation, and the questions the owner needs to answer before the work
items are opened. The existing L1 → KG ingestion is left exactly as it is: the
new path runs **beside** it and never writes the files it writes.

The owner's request, 2026-11-17 (relayed, lightly edited for typos):

> need to update who-iris KG to include a new parallel KG process/tooling/skill
> set. The current L1 → KG ingestion should remain. We have a new one that makes
> use of a tool 'redacto'. It will adapt https://optimuskg.ai/ . Explore
> integration paths and document processes. Where outputs are related, we need
> to align schemas to DAK/WHO schemas. When schema aligned, then need
> adjudication to compare outputs of different tools. The ingestion process for
> the Optimus-like KG extract should pull from the nightly who-iris CDN feed to
> process new materials. As part of the new L1 guideline development process,
> the editor should describe the articles / evidence / what comprises a
> guideline of interest for that L1 document. This should be used to develop
> queries against IRIS DSpace / Dublin Core, as well as provide guidance for
> agentic review of a library KG (who-iris or external).

**Contents**

1. [Findings that shape the design](#1-findings-that-shape-the-design)
2. [The existing L1 → KG ingestion, which stays](#2-the-existing-l1--kg-ingestion-which-stays)
3. [OptimusKG: what is worth adapting](#3-optimuskg-what-is-worth-adapting)
4. [Integration options and the recommendation](#4-integration-options-and-the-recommendation)
5. [Consuming the nightly CDN feed](#5-consuming-the-nightly-cdn-feed)
6. [Schema alignment: the crosswalk](#6-schema-alignment-the-crosswalk)
7. [Adjudication between the two tools](#7-adjudication-between-the-two-tools)
8. [The L1 editor's scope of interest](#8-the-l1-editors-scope-of-interest)
9. [The processes, as the harness expects them](#9-the-processes-as-the-harness-expects-them)
10. [Where each piece lives](#10-where-each-piece-lives)
11. [Proposed work items (beans)](#11-proposed-work-items-beans)
12. [Open questions for the owner](#12-open-questions-for-the-owner)

---

## 1. Findings that shape the design

Three findings change the request as it was written. Each one is stated first
because the rest of the design depends on it.

1. **OptimusKG does not extract a graph from documents.** It is a reproducible
   build that merges about 65 structured and semi-structured biomedical
   databases, such as Open Targets, DrugBank, CTD and Reactome, into one property graph. It has no
   chunking, no entity or relation extraction from text, and no LLM in the
   build; an LLM (PaperQA3) appears only in its *evaluation*. Its code is at
   [mims-harvard/optimuskg](https://github.com/mims-harvard/optimuskg) and
   [the lab announced it in April 2026](https://zitniklab.hms.harvard.edu/2026/04/25/OptimusKG/).
   So "adapt OptimusKG" for WHO IRIS PDFs can only mean adopting its
   **architecture, schema shape and provenance model**, with a text-extraction
   front end that OptimusKG does not have. Section 3 lists what carries over.
2. **"redacto" could not be identified.** A code search of the `litlfred`
   organisation found only a local `class Redactor` that scrubs e-mail
   addresses in `litlfred/ihris`. Searches of issues in `litlfred` and
   `WorldHealthOrganization` found nothing. Several unrelated public
   repositories have the name; the closest is
   [FredHutch/RedactO](https://github.com/FredHutch/RedactO), which OCRs PDFs and
   redacts them. Nothing links any of them to OptimusKG. **This design does not
   guess what redacto does.** It leaves a slot for it, `Tool B`, and section 12
   asks the owner for the repository or package. The slot is shaped to accept
   either an extractor (text → candidate nodes and edges) or a pre-extraction
   redaction step (PDF → PDF or text with personal data removed). Section 4
   shows how each reading changes the plan.
3. **The nightly CDN feed is designed and coded, but it is not consumable
   yet.** [`processes/iris-cdn-nightly.bpmn`](../processes/iris-cdn-nightly.bpmn)
   and `scripts/iris-cdn/run.ts nightly` produce a signed BagIt release in a git
   repository on Cloudflare Artifacts, with bytes in R2. Deployment still has
   open items ([`iris-cdn-deployment.md` §Still open](iris-cdn-deployment.md#still-open)).
   The new path should depend on the feed's *contract*, the verified release
   and its payload manifest, and not on its run time. Then it can be built and
   tested against a local release before the feed is live.

A fourth point is a constraint rather than a finding. **The gap is the point**
([`AGENTS.md`](../AGENTS.md)). The nightly feed reports every IRIS change, and
IRIS has 273,559 items. The new path must not turn the feed into a bulk import.
It processes an item only when an L1 editor's scope of interest (section 8)
selects it, and only after the materialisation gates in
[`materialize-remote`](../folio-assistant-core/schemas/materialization.ts) pass.

## 2. The existing L1 → KG ingestion, which stays

The current path is folio-assistant-core's library-ingestion chain. smart-base
skills then write the L1 knowledge graph from what it derives. Nothing in this
design edits these processes or the files they own.

| step | process (folio-assistant-core `processes/library/`) | what it writes under `library/<slug>/` |
|---|---|---|
| extract structure | `ingest-extract-structure.bpmn` | `sections/*.md`, `structure.json`, `candidates.json`, OCR pages |
| derive content | `ingest-derive-content.bpmn` | `images.json`, `vector-*.json`, `footnotes.json`, tabular CSVW |
| build the L1 KG | `ingest-build-l1-kg.bpmn` | `dublin-core.jsonld`, `manifest.jsonld`, assets, glossary candidates, `references/` |
| completeness gate | `ingest-l1-completeness-gate.bpmn` | the `check:l1-complete` verdict. Its round-trip and `Task_FlagDrift` adjudication are the pattern section 7 reuses |
| publish statements | `publish-extracted-statements.bpmn` | statement pages with source links |
| L1 KG (smart-base) | skill `smart-base/extract-smart-kg-l1` | `smart-kg-l1.json`, context `http://smart.who.int/kg/l1.context.jsonld`: nodes `publication`, `publication-section`, `recommendation`; edges are `Statement`s (`contains`), each node with `derivation` and `evidence{location, quote}` |
| L1 library KG (smart-base) | skill `smart-base/dak-l1-library` | `smart-kg-l1-library.jsonld`, ontology 3.0: `library-node`, `publication-section`, `publication-element`; edges `contains`, `specializationOf` |

Today three library entries carry `smart-kg-l1-library.jsonld` and two carry
`smart-kg-l1.json`. The existing path is **section-structural and
recommendation-centred**: it knows where a statement is in a publication and
that the statement is a recommendation. It does not know which disease, drug or
exposure the statement is about. That missing layer is what an OptimusKG-style
typed entity graph would add, which is why the two outputs are related but not
redundant, and why aligning them is worth the effort.

## 3. OptimusKG: what is worth adapting

Read from the repository at commit `4fb3529` (2026-09-21) and its docs site
source (`docs/content/docs/`). optimuskg.ai and arXiv could not be fetched from
this session, so the paper's figures are not quoted here.

| aspect | OptimusKG | adopt for the WHO path? |
|---|---|---|
| layers | Kedro "medallion": `landing → bronze → silver → gold`, pure-function nodes in DAG pipelines, a dataset catalog that is the single source of truth for each schema | **Yes, the shape.** `landing` = verified CDN bytes; `bronze` = Tool B's raw output; `silver` = grounded and normalised; `gold` = aligned to the WHO crosswalk, ready to adjudicate |
| determinism | version-pinned providers, checksum and quality-check hooks, reproducible runs | **Yes.** It matches the CDN's no-churn rule: same input, same bytes |
| grounding | BioCypher + Biolink Model; MONDO, DO, HPO, GO, Orphanet, UBERON; UMLS CUIs kept as properties; CURIE ids | **Partly.** Keep the BioCypher schema-config approach. Ground to **WHO vocabularies first** (ICD-11, ATC/INN, MeSH as IRIS already carries it, the WHO glossary), with Biolink and MONDO as `skos:closeMatch` bridges |
| node types | 10: Gene, Drug, Disease, Phenotype, Anatomy, Pathway, Biological Process, Cellular Component, Molecular Function, Exposure | **Subset.** Drug, Disease, Phenotype, Exposure and Anatomy matter for WHO guidance. The molecular types are out of scope unless a scope of interest asks for them |
| edge shape | `from, to, label, relation, undirected, properties`; at most one edge per `(from, to, label)` | **Yes**, plus a mandatory evidence locator (section 6) |
| provenance | `sources{direct[], indirect[]}` on every node and edge; `evidence_score/count/index` on associations | **Yes**, with `direct` = the IRIS handle + section + page + quote |
| conflict model | `relation_assertions` keeps every `{source, relation}`; `relation_conflict` flags mutually exclusive ones (339 drug–disease pairs are both INDICATION and CONTRAINDICATION) | **Yes. This is the seed of the adjudication input.** It records disagreement *inside* one tool; section 7 extends it to disagreement *between* tools |
| outputs | Parquet (`nodes/*.parquet`, `edges/*.parquet`), Neo4j export, PyPI client (Polars/NetworkX), MCP bundle on DuckDB; **no RDF** | **Parquet as the working form**, then projected to N-Quads so the existing Oxigraph partitions ([`iris-oxigraph`](../skills/iris-oxigraph.md)) can query both graphs side by side |
| evaluation | PaperQA3 checks sampled edges (100 per node type by centrality, true and false neighbours, a power analysis at α = 0.05) | **Yes, as the sampling plan** for the agentic adjudication in section 7 |
| licence | code MIT (© 2025 Zitnik Lab); data keeps each source's licence, some academic or non-commercial only; distributed on Harvard Dataverse `doi:10.7910/DVN/IYNGEV` | Adapting the **code patterns** is clear under MIT. Importing the **OptimusKG data** as an external library KG is a separate question, gated by `copyright` and `restrictions` (section 12) |

## 4. Integration options and the recommendation

All four options keep the existing path untouched, and all four consume the
same CDN contract. They differ in where Tool B runs and where its output lives.

| | option | how | for | against |
|---|---|---|---|---|
| **A** | Sibling pipeline in who-iris | IRIS-specific scripts in `scripts/optimus/`; outputs under a new declared directory, e.g. `kg-optimus/<slug>/{bronze,silver,gold}/` | One repository, same CI, same mounts | who-iris is `separation: content` and tolerates IRIS-specific code only with a QA warning. A Kedro/Python extractor is far more than "a small number of tools" (owner, 2026-10-01) |
| **B** | A step inside `ingest-build-l1-kg` | a new task after `Task_Link` | No new process | **Rejected.** It is not parallel: it changes the process the owner said must remain, and it couples Tool B's failures to L1 completeness |
| **C** | External extractor, referenced KG | Tool B and the medallion pipeline run in their own repository or service, pinned by version. who-iris holds only orchestration, the crosswalk and adjudication records, and references the gold output by digest | Clean split: code where code belongs; the gold output is a **remote KG** in the materialisation sense, so its subgraph metadata sits under `library/<source>/` | Two release trains to pin and keep in step |
| **D** | Import OptimusKG's own graph as an external library KG | subscribe to the Dataverse release as a remote KG; no extraction | Gives drug–disease grounding at once | Biomedical-database facts, not WHO guidance. Licences vary per source. Useful only as a **grounding and comparison reference** for section 8's agentic review, never as Tool B |

**Recommendation: C for the extractor runtime, with A's thin orchestration
layer in who-iris.** The parts are placed in section 10.

- who-iris holds the IRIS-specific **feed consumer**, the **processes**, the
  **skills** and the **crosswalk data**. These are small and IRIS-specific, so
  they fit the owner's 2026-10-09 ruling: "iris specific tools need to be in
  litlfred/who-iris".
- **Tool B (redacto) and the medallion pipeline** live in their own
  repository, pinned in `index.lock.json` like the other layers, or called as
  a pinned container.
- The **gold output** is held by reference, `referenced` by default. A
  document's gold graph is `materialized` only where a scope of interest
  selected it and the five gates passed.
- **D is optional and later.** It serves as a comparison reference in agentic
  review, after the licence question is answered.

**If redacto turns out to be a redaction step** rather than an extractor, the
recommendation keeps its shape. Redacto becomes a `landing → bronze`
pre-processor, run before Tool B *and* before the existing
`ingest-extract-structure` on the same bytes, so both tools read the same
redacted text and the comparison stays fair. A third "Tool B" extractor then
still has to be chosen (section 12, Q1).

## 5. Consuming the nightly CDN feed

What the feed produces (from `scripts/iris-cdn/run.ts` and
[`iris-cdn-exporter`](../skills/iris-cdn-exporter.md)):

- a **release** is a commit in the release-history git repository on
  Cloudflare Artifacts: BagIt `bagit.txt`, date-free `bag-info.txt`,
  `manifest-sha256.txt`, `tagmanifest-sha256.txt` and its detached JWS
  `tagmanifest-sha256.txt.jws` (ES256; key from `did:web`);
- the payload manifest maps logical paths to SHA-256 digests:
  `records/<handle>.json` (the canonical DC record), `bitstreams/<handle>/<bundle>/<name>`,
  `graph/<partition>`, and per-item `items/<handle>/manifest-sha256.txt(.jws)`;
- bytes are in R2 under `sha256/<aa>/<digest>`;
- `state/cursor.json` is the exporter's own cursor. The new path never moves it.

How the new path consumes it, as process `optimus-kg-nightly` (section 9):

1. **Start after the exporter's `End_Done`**, as a message start event. A
   scheduled timer at 04:00 UTC is the fallback. A night with `End_NoChange`
   never starts it.
2. **Verify before reading.** Resolve the key from the DID document and verify
   `tagmanifest-sha256.txt.jws` (the `iris-cdn-signing` verifier: "Resolves the
   key from the DID document, never from the package"). An unverified release
   is refused. That is a state, not an error to retry.
3. **Diff against its own cursor**, `state/optimus-cursor.json`: the release
   commit and tag-manifest digest it last finished. Use `diffManifests` from
   `scripts/iris-cdn/bag.ts` to get `added`, `changed` and `removed` paths.
4. **Classify each changed handle.**
   - Only `records/<handle>.json` changed (a metadata edit): re-ground the
     publication node only. **Do not re-extract**, because the PDF digest did
     not change (the exporter's "metadata changes and the PDF does not" rule).
   - A bitstream in `ORIGINAL` changed: a candidate for extraction.
   - `removed`, or marked withdrawn by the weekly reconciliation: mark the
     derived nodes and edges `withdrawn`. Keep them addressable and never
     delete them, mirroring the reconciliation.
5. **Select by scope.** Test each candidate record's DC fields against every
   *active* scope of interest (section 8). Out of scope means not processed,
   and the run report counts it. The gap is the point.
6. **Gate.** Check `materialize-remote`'s five gates (size, restrictions,
   retention, sourceLoss, copyright) for each selected bitstream.
   `restrictions: unknown` stays `unknown` and is never `permitted`.
7. **Run Tool B over the landing bytes**, fetched from R2 by digest and
   checked against the digest. The work is keyed by **bitstream SHA-256 plus
   Tool B version plus crosswalk version**, so an unchanged triple is never
   re-run. That is the no-churn rule applied to derivations.
8. **bronze → silver → gold**, then project the gold output to N-Quads in its
   own named graph partition, e.g. `graph/optimus/<handle>`, beside the
   existing partitions.
9. **Hand off to adjudication** (section 7) for every document that also has
   an L1 KG.
10. **Advance the cursor only when the run completes.** Review the run report
    and open beans for anomalies, as `Task_Review` in the exporter does.

## 6. Schema alignment: the crosswalk

Both tools are projected to one **comparison form** before they are compared:

```
(subject IRI, predicate IRI, object IRI | literal,
 evidence: { handle, uuid?, section id, page range, quote },
 derivation: derived | inferred | extracted, tool, tool version)
```

**WHO identifiers come first.** The publication is always the IRIS item (Handle
`10665/…`, DSpace UUID, ISBN or govdoc). Entities are grounded to a WHO-owned
or WHO-used scheme where one exists. Other schemes link by `skos:exactMatch`
or `skos:closeMatch`, never by replacing the WHO identifier.

### Node types

The DAK component names below are the nine components of a SMART Guidelines
Digital Adaptation Kit. The smart-base **logical-model names** are given as
*targets to confirm*: smart-base is not mounted in this checkout, so they are
not verified against its pinned version (section 12, Q6).

| OptimusKG-style (Tool B) | existing L1 KG (smart-base `kg/l1`) | DAK component / WHO schema target | WHO grounding (primary) | bridge |
|---|---|---|---|---|
| — (no publication node) | `publication` | DAK L1 source; IRIS DC record | Handle, DSpace UUID, ISBN (from `records/<handle>.json`) | `dcterms:` |
| — | `publication-section`, `publication-element` | location in L1 | section id + page range | — |
| — | `recommendation` | **Component 2 — Health interventions and recommendations** (smart-base recommendation / health-intervention model) | the recommendation's own IRI | GRADE certainty and strength as properties |
| Disease (DIS) | — *(gap: propose `condition`)* | Component 2 (condition targeted); Component 5 decision-support logic inputs | **ICD-11 MMS** URI | MONDO, UMLS CUI, MeSH |
| Phenotype (PHE) | — *(gap: propose `finding`)* | **Component 5 — Core data elements** (observation) | ICD-11 signs/symptoms chapter | HPO |
| Drug (DRG) | — *(gap: propose `product`)* | Component 5 data elements (medication); WHO **EML** | **ATC** code + **INN** | DrugBank, RxNorm |
| Exposure (EXP) | — *(gap)* | Component 5 data elements (risk factor) | ICD-11 extension codes where one exists | CTD, ExO |
| Anatomy (ANA) | — | Component 5 (body site) | ICD-11 anatomy extension | UBERON |
| Gene, Pathway, BP/CC/MF | — | out of scope unless a scope of interest asks | — | keep `referenced` |
| term label / synonym | glossary candidate (`folio-glossary/v1`, SKOS) | WHO glossary ([`glossary/`](../glossary/)) | `skos:prefLabel`, notation | `skos:altLabel` |
| — | — | Components 1 (personas), 3 (user scenarios), 4 (business processes), 6 (indicators), 7 (requirements), 8 (test scenarios) | not produced by either tool | the L1 editor and DAK authoring |

The "gap" rows are a **proposal to smart-base**: add typed entity nodes to the
`kg/l1` ontology so a recommendation can be `about` a condition, product or
finding. Until smart-base adopts this, the gold output carries these as its own
`who-iris` types, with `skos:closeMatch` to the Biolink class. **who-iris does
not extend smart-base's ontology on its own.**

### Edges and properties

| OptimusKG-style | L1 KG / DAK target | note |
|---|---|---|
| DRG–DIS `INDICATION` | `recommendation` `recommends` (intervention for condition), strength and certainty if stated | a guideline's recommendation is not a database indication: same pair, different claim. The comparison matches the **pair**, and the predicate difference is a *kind* finding, not a conflict |
| DRG–DIS `CONTRAINDICATION` | `recommendation` with negative direction ("do not use") | |
| DRG–DIS `OFF_LABEL_USE` | no target | WHO guidance seldom states it; record and do not compare |
| DIS–PHE, DIS–EXP associations | Component 5 data-element relations | compare only within a scope that asks for them |
| `sources.direct` | `evidence{location, quote}` + `wasDerivedFrom` | must resolve to the IRIS handle and a section; **an edge without a locator is invalid in gold**, the same "no default" rule as catalogue state |
| `evidence_score`, `evidence_count` | none in L1 | kept as Tool B properties; never mapped to GRADE certainty |
| `relation_assertions`, `relation_conflict` | `block-qa` entries (section 7) | intra-tool disagreement is surfaced, not resolved by `RELATION_PRIORITY` |
| `contains` (L1) | — | structural; Tool B does not produce it. Not compared |

The crosswalk itself is **data** (`crosswalk/optimus-l1-dak.json`, versioned),
not code. Its version is part of the derivation key (section 5, step 7), so a
crosswalk change re-projects gold without re-running Tool B.

## 7. Adjudication between the two tools

This reuses the harness's adjudication and does not invent another.

- **The entry condition is the harness's own**
  ([`adjudication`](../cat-harness/skills/process/process-core/adjudication.md)):
  *mechanical agreement* (the comparison script passes), *consensus* (both
  tools agree), and *adjudicable* (the two tools disagree on **one** claim).
  **A claim only one tool made is not a disagreement.** It is a coverage
  finding, reported but never adjudicated, as the skill says: "A missing entry
  is not a disagreement."
- **The parties are dispatched untainted**
  ([`untainted-verification`](../cat-harness/skills/process/process-core/untainted-verification.md)).
  The adjudicator sees the source passage (the quote and section, read from the
  library entry) and the two claims **anonymised as X and Y**, never which tool
  made which. It uses no tools and says so (`tools_used`). It never sees either
  tool's full graph.
- **Rulings are keyed by content**, like the translation round-trip
  ([`AGENTS.md` §Translations](../AGENTS.md)). Each ruling is pinned by the
  hashes of the two claims and the source passage, and stored on a state
  branch (`cat/who-iris/attestations`, a new `kg-adjudication/` subtree). A
  re-run that reorders or drops claims needs no re-adjudication.

### Agreement metrics (per document, per node/edge type, per night)

| metric | over | why |
|---|---|---|
| entity grounding agreement | entities both tools found in the same evidence span | the same text grounded to different ICD-11 or ATC codes is the commonest real disagreement |
| pair overlap: Jaccard; precision and recall of each tool with the other as reference | (subject, object) pairs after grounding | symmetric, and no tool is assumed to be the truth |
| predicate agreement: Cohen's κ | pairs both tools found | corrects for chance on a small label set (recommends / contraindicates / associated) |
| evidence-locator agreement | matched claims | same section and overlapping pages; a match that cites different passages is suspect |
| coverage | claims only one tool made, by type | a tool's blind spots, tracked over time; not adjudicated |

Thresholds are **not** proposed here. They need a baseline over real outputs
and are the owner's to set (section 12, Q7).

### Outcomes

The caller calls `Process_Adjudication` and declares its own codes
(`<cat-harness.processes:adjudication codes="x-right y-right both-wrong both-defensible undecidable"/>`).

| outcome | effect on gold |
|---|---|
| `x-right` / `y-right` | the winning claim is promoted to `adjudicated`; the other is kept and marked `rejected` with the ruling |
| `both-wrong` | both kept, marked `rejected`; a bean opens if it repeats for one tool |
| `both-defensible` | both kept: the text supports two readings. This is common where a guideline is ambiguous, and it is a finding for the L1 editor |
| `undecidable` | escalated to the human reviewer lane |

**Who adjudicates.** An untainted agent adjudicates first. Claims of type
`recommendation`, and any claim about a contraindication, **always** go to a
human reviewer (SME or editor), the same lane as `ingest-l1-completeness-gate`
`Task_FlagDrift`. The agent's ruling is kept beside the human's, never
overwritten (`human_adjudicated` alongside `assessed_by`). **Sampling:** every
adjudicable recommendation-class claim is ruled on. Other types are sampled with
OptimusKG's evaluation plan (stratified by node type, true and false
neighbours, sample size from a power analysis), so cost is bounded per night.

## 8. The L1 editor's scope of interest

**The owner wrote "see examples below", but no examples were attached.** The
examples here are illustrative only and must be replaced with the owner's
(section 12, Q8).

### What the editor writes

A new document kind, `l1-scope-of-interest/v1`. It is authored once per L1
document as the first step of the L1 guideline-development process, and it
belongs with the L1 document (section 10):

```yaml
scope: measles-l1                       # one per L1 document
l1Document: <the L1 document's id>
question: >-
  What WHO guidance and evidence governs measles vaccination schedules,
  outbreak response and case management?
pico:
  population: [infants, children under 5, pregnant women]
  intervention: [measles-containing vaccine (MCV1, MCV2), vitamin A]
  comparator: [no vaccination, alternative schedule]
  outcomes: [incidence, mortality, seroconversion, adverse events]
grounding:                              # WHO schemes first
  icd11: ["1F03"]                       # Measles
  mesh: ["Measles", "Measles Vaccine", "Vitamin A"]
  atc: ["J07BD"]                        # measles vaccines
evidenceTypes:                          # what counts as evidence for this L1
  include: [guideline, position paper, systematic review, GRADE evidence profile, technical document]
  exclude: [meeting report, press material, newsletter]
guidelineOfInterest:                    # what makes an item a "guideline of interest"
  - GRC-approved WHO guideline, or WHO position paper published in the WER
  - contains at least one recommendation on the PICO above
  - current: not superseded (dc.relation.isreplacedby, if IRIS fills it)
dates: { from: 2009-01-01 }
languages: [en, fr, es, ar, ru, zh]
regions: [global, AFRO, EMRO, SEARO]    # regional offices' collections
seeds: ["10665/…"]                      # items the editor already knows are in
exclusions: ["10665/…"]
```

### What is generated from it

1. **IRIS DSpace 7 Discovery queries.** These use the endpoint and patterns
   that [`iris-rest-feed`](../skills/iris-rest-feed.md) already uses against
   live IRIS. For example:

   ```
   GET /server/api/discover/search/objects?dsoType=ITEM
       &query=(dc.subject.mesh:"Measles Vaccine" OR dc.subject.mesh:"Measles")
              AND dc.date.issued:[2009 TO *]
       &sort=dc.date.accessioned,DESC&page=N&size=100
   ```

   Add one query per evidence type on `dc.type`, and a `scope={collectionUuid}`
   query per regional collection. The `dc.type` values and facet names
   (`f.subject`, `f.dateIssued`, `f.itemtype`) that IRIS exposes are **not
   verified**. The generator must read `/server/api/discover/facets` first and
   refuse a field IRIS does not index rather than send a query that silently
   matches nothing.
2. **OAI-PMH harvest**, if IRIS exposes it:
   `verb=ListRecords&metadataPrefix=oai_dc|qdc&set=<collection set>&from=<date>`.
   IRIS's OAI endpoint is **not verified**; REST stays the primary route.
3. **A SPARQL query over the who-iris Oxigraph partitions**, for items already
   catalogued (`dcterms:subject`, `dcterms:type`, `dcterms:issued`). It is the
   same query in the browser and at build time
   ([`iris-oxigraph`](../skills/iris-oxigraph.md)).
4. **The selection predicate** that section 5, step 5 applies to each nightly
   record. It is the same filter run locally over `records/<handle>.json`, so a
   new item that matches an active scope is picked up the next night.
5. **Guidance for agentic review of a library KG** (who-iris or external). This
   is a generated checklist that the `deep-document-research` process
   (folio-assistant-core) runs, with the scope as the Planner's filter:
   - for each candidate, rule `include`, `exclude` or `uncertain` against the
     PICO, evidence type and *guideline of interest* criteria, citing the
     location (handle + section + page) for every ruling;
   - say what was **not** found: a PICO element with no evidence is a finding
     for the editor, not an empty result;
   - for an **external** library KG (OptimusKG via option D, PubMed, another
     catalogue), map its records to the comparison form of section 6 first, so
     the same rulings apply. Never import it to review it; review by reference;
   - the reviewer is untainted with respect to the scope's author. It sees the
     scope and the candidate, not the editor's expected answer;
   - its rulings feed back as `seeds` and `exclusions`, through the editor and
     never automatically.

A second illustrative scope, kept short: **contraceptive use**. Its
`guidelineOfInterest` is "WHO Medical eligibility criteria or Selected practice
recommendations, any edition, with the edition superseding chain resolved",
and its evidence types are `[guideline, systematic review]`. It shows why
a supersession field such as `dc.relation.isreplacedby` matters; whether IRIS
fills that field is **not verified**.

## 9. The processes, as the harness expects them

Processes in this repository are BPMN files in [`processes/`](../processes/).
Each activity names its skill (`<bootstrap.processes:skill>`), with a generated
checklist (`bun run cat bpmn:checklist`) and SVG (`bun run cat render:bpmn`).
**The `.bpmn` files are not drafted in this change.** Every activity must name a
skill that resolves, and the skills below do not exist yet, so drafting them
now would fail `check:workflow-refs` and the checklist generator. Each process
is specified here at the level the BPMN will encode, with activity ids, lanes
and skills. Writing the BPMN is the first task of the matching bean.

**Lanes used across all three:** `build-pipeline` (the scripts, unattended),
`optimus-kg-agent` (plans, reviews, opens beans; holds no keys), `extractor`
(Tool B, external, pinned), `adjudicator` (agent, untainted), `reviewer`
(SME/editor, human), `l1-editor` (human).

### `optimus-kg-nightly` (who-iris)

| id | lane | skill | what |
|---|---|---|---|
| `Start_AfterExport` | — | — | message: the exporter's `End_Done`; timer fallback |
| `Task_VerifyRelease` | build-pipeline | `iris-cdn-signing` | verify the tag-manifest JWS through did:web; an unverified release ends the run as `refused` |
| `Task_Diff` | build-pipeline | `optimus-kg-feed` | diff payload manifests since `state/optimus-cursor.json` |
| `GW_Kind` | — | — | metadata-only / bitstream / withdrawn |
| `Task_Reground` | build-pipeline | `optimus-kg-feed` | metadata-only: re-ground the publication node |
| `Task_Withdraw` | build-pipeline | `optimus-kg-feed` | mark derived claims withdrawn, keep them addressable |
| `Task_SelectByScope` | build-pipeline | `l1-scope-of-interest` | apply every active scope's selection predicate |
| `Task_Gates` | optimus-kg-agent | `materialize-remote` | the five gates per bitstream; `unknown` is not `permitted` |
| `Call_Extract` | extractor | `optimus-kg-extract` | Tool B: landing → bronze, keyed by (bitstream sha, tool version) |
| `Task_Ground` | build-pipeline | `optimus-kg-extract` | bronze → silver: ground to WHO schemes |
| `Task_Align` | build-pipeline | `kg-crosswalk` | silver → gold through the versioned crosswalk; reject edges without a locator |
| `Call_Partition` | build-pipeline | `nquads-distribution` | project gold to its named-graph partition (platform process, called) |
| `Call_Adjudicate` | — | `kg-tool-adjudication` | the process below, for documents with an L1 KG |
| `Task_AdvanceCursor` | build-pipeline | `optimus-kg-feed` | only after a complete run |
| `Task_Review` | optimus-kg-agent | `optimus-kg-feed` | run report; beans for anomalies (yield far from median, adjudication rate jump, gate `unknown` spike) |

### `kg-tool-adjudication` (folio-assistant-core; generic over any two extractors)

| id | lane | skill | what |
|---|---|---|---|
| `Task_Project` | build-pipeline | `kg-crosswalk` | both outputs → comparison form |
| `Task_Match` | build-pipeline | `kg-tool-adjudication` | match entities, pairs, predicates and locators; compute the metrics in section 7 |
| `GW_State` | — | — | agree / only-one / conflict |
| `Task_Coverage` | build-pipeline | `kg-tool-adjudication` | only-one: record coverage; **not** adjudicated |
| `Call_Adjudication` | adjudicator | `adjudication`, `untainted-verification` | `Process_Adjudication`, codes `x-right y-right both-wrong both-defensible undecidable` |
| `GW_HumanRequired` | — | — | recommendation-class, contraindication, or `undecidable` |
| `Task_HumanRuling` | reviewer | `adjudication` | the human ruling, kept beside the agent's |
| `A_RecordEntry` | build-pipeline | `adjudication` | attestation keyed by content hashes; `relaxable="false"` |
| `Task_PromoteGold` | build-pipeline | `kg-tool-adjudication` | write the adjudicated status onto gold claims |

### `l1-scope-and-review` (L1 guideline development; see section 10 for where)

| id | lane | skill | what |
|---|---|---|---|
| `Task_WriteScope` | l1-editor | `l1-scope-of-interest` | author `l1-scope-of-interest/v1` |
| `Task_ValidateScope` | build-pipeline | `l1-scope-of-interest` | schema check; read IRIS facets; refuse unindexed fields |
| `Task_GenQueries` | build-pipeline | `iris-scope-queries` | Discovery REST, OAI-PMH (if available) and SPARQL; selection predicate |
| `Task_RunQueries` | build-pipeline | `iris-rest-feed` | candidates, by reference only |
| `Call_DeepResearch` | — | `deep-document-research` | agentic review of who-iris or an external library KG, scope as Planner filter |
| `Task_EditorTriage` | l1-editor | `l1-scope-of-interest` | accept rulings into `seeds` / `exclusions`; activate the scope for the nightly path |

## 10. Where each piece lives

This follows the split rules: cat-harness owns the harness (skills, workflows,
roles, tools); the content layer owns "what a folio holds, where it came from";
who-iris is `separation: content` and holds only IRIS-specific code, by the
owner's rulings of 2026-10-01 and 2026-10-09; WHO subject vocabulary does not go
in the platform.

| piece | home | why |
|---|---|---|
| `optimus-kg-nightly.bpmn`, skill `optimus-kg-feed`, feed-consumer script | **who-iris** | IRIS- and CDN-specific |
| skill `iris-scope-queries` (scope → DSpace / DC queries) | **who-iris** | IRIS field names and endpoints |
| crosswalk data `crosswalk/optimus-l1-dak.json` | **who-iris** for the IRIS-specific mappings; WHO-scheme mappings that hold outside IRIS move to **smart-base** later | subject vocabulary stays out of the platform |
| `kg-tool-adjudication.bpmn` + skill, comparison-form schema, `l1-scope-of-interest/v1` schema | **folio-assistant-core** | content vocabulary: what a library KG holds and where it came from; generic over any two extractors and any library |
| matching and metrics code | **cat-harness-tools** | code; the general catalogue tools live with the platform (owner, 2026-10-09) |
| `Process_Adjudication`, `untainted-verification`, attestation storage | **cat-harness** (existing, reused) | no change expected; a new `codes` set is declared by the caller |
| typed entity nodes in `kg/l1` (condition, product, finding); `l1-scope-and-review` in the L1 guideline-development process; DAK logical-model targets | **smart-base** | it owns the L1 ontology and DAK models; proposed here, not changed here |
| Tool B (redacto) and the medallion pipeline | **its own repository**, pinned (option C) | not content, and too large to be tolerated in who-iris |

## 11. Proposed work items (beans)

**Not created.** This checkout's work-plan graph did not mount:
`bun run cat state:mount` reports `cat/cat-harness/beans` missing on this
remote. Creating beans blind would risk duplicates (`beans create` is not
idempotent). A search of the beans that *are* mounted (`cat-harness-tools/beans`,
`folio-assistant-core/beans`) for optimus, redacto, scope of interest and
extractor agreement found nothing. Whoever opens these should first search
the live work plan for the same terms.

| # | title | home | blocked by |
|---|---|---|---|
| 1 | Identify redacto and choose Tool B; record its licence and pin | owner | — |
| 2 | `l1-scope-of-interest/v1` schema + skill; owner's examples as fixtures | folio-assistant-core | Q8 |
| 3 | `iris-scope-queries`: scope → Discovery/OAI/SPARQL; read IRIS facets first | who-iris | 2 |
| 4 | Comparison form + crosswalk v0 (section 6) and proposal to smart-base for typed L1 entity nodes | who-iris + smart-base | Q6 |
| 5 | `optimus-kg-feed`: verified-release diff consumer with its own cursor, tested against a local release | who-iris | CDN contract (exists) |
| 6 | Tool B adapter: landing → bronze → silver → gold, derivation-keyed | Tool B's repository | 1, 4 |
| 7 | `kg-tool-adjudication` process + skill + metrics; codes declared for `Process_Adjudication` | folio-assistant-core + cat-harness-tools | 4 |
| 8 | `optimus-kg-nightly.bpmn` + checklist + SVG; declare `kg-optimus/` in `who-iris.json` | who-iris | 3, 5, 6, 7 |
| 9 | Baseline run on the held library entries with an L1 KG; propose thresholds | who-iris | 8 |
| 10 | (optional) OptimusKG as an external library KG for agentic review | who-iris | licence Q5 |

## 12. Open questions for the owner

1. **What is redacto?** The repository, package or URL, and whether it is an
   extractor or a redaction step. If it redacts, which tool extracts?
2. **What does "adapt OptimusKG" mean here?** Its architecture, schema and
   provenance model (what section 3 assumes), or also its **data**, as an
   external library KG (option D)?
3. **Where may Python/Kedro run?** In a new repository under `litlfred` (option
   C, recommended), or tolerated inside who-iris (option A)?
4. **Volume.** Should the nightly path process only items selected by an
   active scope (recommended, because the gap is the point), or every new IRIS
   item?
5. **Licences.** OptimusKG's data keeps each source's licence, some of them
   academic or non-commercial only. May WHO use it for comparison? Who answers
   the `copyright` gate for IRIS bitstreams fed to an external tool?
6. **DAK targets.** Which smart-base version and logical models are the
   alignment targets? Should the typed entity nodes (condition, product,
   finding) be proposed to smart-base's `kg/l1` ontology?
7. **Adjudication policy.** Who sits in the human reviewer lane, and is
   "every recommendation-class disagreement goes to a human" right? The metric
   thresholds should wait for a baseline (bean 9).
8. **The examples.** The request said "see examples below", but none were
   attached. Please send the scope-of-interest examples you had in mind; the
   measles and contraception scopes in section 8 are placeholders.
9. **Network.** optimuskg.ai and arxiv.org are blocked from these sessions. To
   quote the paper's evaluation figures, allow them in the environment's
   network settings or attach the PDF.
