<!-- GENERATED from who-iris/processes/kg-tool-adjudication.bpmn by cat-harness-tools/scripts/bpmn-checklist.ts. Do not edit: change the diagram and regenerate (bun run cat bpmn:checklist). -->

# Checklist — Adjudicate two KG extractors

> **Generated, and not the authority.** This is `who-iris/processes/kg-tool-adjudication.bpmn` (process `Process_KgToolAdjudication`) walked as a state machine. The diagram and the workflow engine decide; this list only reads them. Follow the `next:` line of each step rather than the order on the page, and record each step with the call it names, so the engine's committed state — not this list — says which edge was taken.

Compare the claims two KG extractors made from the same language version of a publication, record what only one of them found as coverage, settle each single-claim disagreement through untainted adjudication with a human ruling where required, and annotate the derived graph without changing either s

## Begin — Two graphs to compare (`Start_Compare`)

- Begin here.
- Call `workflow_start` with `process: "Process_KgToolAdjudication"` and the subject this run is about; keep the instance id it returns.
- next: → `Task_Project` (Project both graphs)

### 1. Project both graphs (`Task_Project`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill kg-crosswalk not written yet): Both outputs into the comparison form (section 6): the L1 KG's recommendation nodes, and GuidelineKG's Claims and assertion edges.
- Record it: `workflow_complete` with `node: "Task_Project"`.
- next: → `Task_Match` (Match claims; record agreement)

### 2. Match claims; record agreement (`Task_Match`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill kg-tool-adjudication not written yet): Match on publication UUID, section by heading and page, grounded subject, grounded object and population.
- Record it: `workflow_complete` with `node: "Task_Match"`.
- next: → `Task_Coverage` (Record the coverage)

### 3. Record the coverage (`Task_Coverage`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill kg-tool-adjudication not written yet): A claim only one tool made is not a disagreement: a coverage finding, reported and tracked over time by type, never adjudicated.
- Record it: `workflow_complete` with `node: "Task_Coverage"`.
- next: → `GW_Conflict` (Any claim in conflict?)

### Decide — Any claim in conflict? (`GW_Conflict`)

- Adjudicable: the two tools disagree on one claim.
- Call `workflow_complete` with `node: "GW_Conflict"` and `outcome` set to the label that holds:
  - «yes» → `Call_Adjudication` (Adjudicate X against Y)
  - «no» → `End_NoConflict` (Agreement and coverage recorded)

### 4. Adjudicate X against Y (`Call_Adjudication`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- Skill: `adjudication`, `untainted-verification`.
- What: Once per claim in conflict.
- A subprocess (`Process_Adjudication`): `workflow_next` reports its own steps; complete those — this call activity itself is not completable.
- next: → `GW_Human` (Human ruling required?)

## Done — Agreement and coverage recorded (`End_NoConflict`)

- The instance completes here. `workflow_next` then reports nothing enabled — that, not this line, is the record of completion.

### Decide — Human ruling required? (`GW_Human`)

- Yes for every recommendation-class claim, any claim about a contraindication, and every undecidable.
- Call `workflow_complete` with `node: "GW_Human"` and `outcome` set to the label that holds:
  - «yes» → `Task_HumanRuling` (Rule on the claim)
  - «no» → `A_RecordEntry` (Record the ruling)

### 5. Rule on the claim (`Task_HumanRuling`)

- Who: the `Human reviewer` lane (role `guidelinekg-reviewer`).
- Skill: `adjudication`.
- What: The human ruling, recorded as human_adjudicated beside the agent's assessed_by, never over it.
- Record it: `workflow_complete` with `node: "Task_HumanRuling"`.
- next: → `A_RecordEntry` (Record the ruling)

### 6. Record the ruling (`A_RecordEntry`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- Skill: `adjudication`.
- What: An attestation keyed by the hashes of the two claims and the source passage, on cat/who-iris/attestations under kg-adjudication/.
- Record it: `workflow_complete` with `node: "A_RecordEntry"`.
- next: → `Task_Annotate` (Annotate the derived graph)

### 7. Annotate the derived graph (`Task_Annotate`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill kg-tool-adjudication not written yet): Write the ruling onto the derived graph: x-right or y-right marks one claim adjudicated and the other not-supported; both-wrong marks both not-supported; both-defensible keeps both.
- Record it: `workflow_complete` with `node: "Task_Annotate"`.
- next: → `End_Annotated` (Rulings annotated)

## Done — Rulings annotated (`End_Annotated`)

- The instance completes here. `workflow_next` then reports nothing enabled — that, not this line, is the record of completion.
