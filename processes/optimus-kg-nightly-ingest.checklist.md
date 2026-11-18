<!-- GENERATED from who-iris/processes/optimus-kg-nightly-ingest.bpmn by cat-harness-tools/scripts/bpmn-checklist.ts. Do not edit: change the diagram and regenerate (bun run cat bpmn:checklist). -->

# Checklist — GuidelineKG nightly path: verify and adjudicate the result

> **Generated, and not the authority.** This is `who-iris/processes/optimus-kg-nightly-ingest.bpmn` (process `Process_OptimusKgNightlyIngest`) walked as a state machine. The diagram and the workflow engine decide; this list only reads them. Follow the `next:` line of each step rather than the order on the page, and record each step with the call it names, so the engine's committed state — not this list — says which edge was taken.

Verify the Zitnik lab's result release, project its claims through the crosswalk into their own graph partition, adjudicate them against the L1 KG, and only then advance the cursor and review the run.

## Begin — Result to ingest (`Start_Ingest`)

- Begin here.
- Call `workflow_start` with `process: "Process_OptimusKgNightlyIngest"` and the subject this run is about; keep the instance id it returns.
- next: → `Task_VerifyResult` (Verify the result release)

### 1. Verify the result release (`Task_VerifyResult`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill optimus-kg-feed not written yet): Its digests, the pinned GuidelineKG commit, and that it names tonight's work order and CDN release.
- Record it: `workflow_complete` with `node: "Task_VerifyResult"`.
- next: → `GW_ResultOk` (Result verified?)

### Decide — Result verified? (`GW_ResultOk`)

- Call `workflow_complete` with `node: "GW_ResultOk"` and `outcome` set to the label that holds:
  - «no» → `End_Awaiting` (Awaiting the lab)
  - «yes» → `Task_Crosswalk` (Project through the crosswalk)

## Done — Awaiting the lab (`End_Awaiting`)

- The instance completes here: awaiting-extractor, or a result release that did not verify. `workflow_next` then reports nothing enabled — that, not this line, is the record of completion.

### 2. Project through the crosswalk (`Task_Crosswalk`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill kg-crosswalk not written yet): Ground OptimusKG CURIEs to WHO schemes through their xrefs (MONDO to ICD-10 to ICD-11; DrugBank to ATC/INN; CTD MeSH to dc.subject.mesh), then silver to gold through crosswalk/optimus-l1-dak.json.
- Record it: `workflow_complete` with `node: "Task_Crosswalk"`.
- next: → `Call_Partition` (Write the graph partition)

### 3. Write the graph partition (`Call_Partition`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- Skill: `iris-oxigraph`, `nquads-distribution`.
- What: Gold claims to N-Quads in their own named-graph partition, graph/guidelinekg/<handle>, beside the existing partitions.
- A subprocess (`Process_NQuadsDistribution`): `workflow_next` reports its own steps; complete those — this call activity itself is not completable.
- next: → `Call_Adjudicate` (Adjudicate against the L1 KG)

### 4. Adjudicate against the L1 KG (`Call_Adjudicate`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill kg-tool-adjudication not written yet): For every document that also has an L1 KG, same language version on both sides.
- A subprocess (`Process_KgToolAdjudication`): `workflow_next` reports its own steps; complete those — this call activity itself is not completable.
- next: → `Task_AdvanceCursor` (Advance the cursor)

### 5. Advance the cursor (`Task_AdvanceCursor`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill optimus-kg-feed not written yet): state/optimus-cursor.json: the release commit and tag-manifest digest this path finished.
- Record it: `workflow_complete` with `node: "Task_AdvanceCursor"`.
- next: → `Task_Review` (Review the run report)

### 6. Review the run report (`Task_Review`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill optimus-kg-feed not written yet): Open beans for anomalies: a claim yield far from the recent median, a jump in the adjudication rate, a spike of gate results that are unknown.
- Record it: `workflow_complete` with `node: "Task_Review"`.
- next: → `End_Ingested` (Result ingested and reviewed)

## Done — Result ingested and reviewed (`End_Ingested`)

- The instance completes here. `workflow_next` then reports nothing enabled — that, not this line, is the record of completion.
