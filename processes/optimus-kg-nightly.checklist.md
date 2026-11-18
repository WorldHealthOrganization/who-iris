<!-- GENERATED from who-iris/processes/optimus-kg-nightly.bpmn by cat-harness-tools/scripts/bpmn-checklist.ts. Do not edit: change the diagram and regenerate (bun run cat bpmn:checklist). -->

# Checklist — GuidelineKG nightly path

> **Generated, and not the authority.** This is `who-iris/processes/optimus-kg-nightly.bpmn` (process `Process_OptimusKgNightly`) walked as a state machine. The diagram and the workflow engine decide; this list only reads them. Follow the `next:` line of each step rather than the order on the page, and record each step with the call it names, so the engine's committed state — not this list — says which edge was taken.

Every night after the IRIS CDN release is published: select the changed items an editor's scope of interest asks for, publish a work order for the Zitnik lab, which runs GuidelineKG on its own keys, then verify the lab's result release, project it through the crosswalk and adjudicate it against the 

## Begin — CDN release published (`Start_AfterExport`)

- Begin here: Message: the IRIS CDN nightly process reached End_Done (Process_IrisCdnNightly).
- Call `workflow_start` with `process: "Process_OptimusKgNightly"` and the subject this run is about; keep the instance id it returns.
- next: → `Call_PrepareWorkOrder` (Prepare the work order)

### 1. Prepare the work order (`Call_PrepareWorkOrder`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- Skill: `iris-cdn-signing`.
- What: Phase: verify the release, diff it against this path's own cursor, apply metadata edits and withdrawals, select by scope, check the gates, and publish the work order.
- A subprocess (`Process_OptimusKgNightlyWorkOrder`): `workflow_next` reports its own steps; complete those — this call activity itself is not completable.
- next: → `GW_Published` (Work order published?)

### Decide — Work order published? (`GW_Published`)

- Call `workflow_complete` with `node: "GW_Published"` and `outcome` set to the label that holds:
  - «no» → `End_Refused` (Release refused)
  - «yes» → `Task_Classify` (Classify the candidates)

## Done — Release refused (`End_Refused`)

- The instance completes here: The CDN release did not verify against WHO's did:web key. `workflow_next` then reports nothing enabled — that, not this line, is the record of completion.

### 2. Classify the candidates (`Task_Classify`)

- Who: the `Zitnik lab (GuidelineKG)` lane (role `guidelinekg-lab`).
- What: Unbuilt (skill guidelinekg-run not written yet): GuidelineKG classifier classify (Reducto Classify) on the work order's documents, after the lab verifies the CDN release JWS against WHO's did:web key and each byte range against its digest.
- Record it: `workflow_complete` with `node: "Task_Classify"`.
- next: → `GW_Keep` (Guideline of interest?)

### Decide — Guideline of interest? (`GW_Keep`)

- The class is in the scope's keep_categories.
- Call `workflow_complete` with `node: "GW_Keep"` and `outcome` set to the label that holds:
  - «yes» → `Task_Extract` (Parse and extract claims)
  - «no» → `Task_PublishResult` (Publish the result release)

### 3. Parse and extract claims (`Task_Extract`)

- Who: the `Zitnik lab (GuidelineKG)` lane (role `guidelinekg-lab`).
- What: Unbuilt (skill guidelinekg-run not written yet): GuidelineKG parser parse, then integration build: recommendation claims linked to OptimusKG nodes.
- Record it: `workflow_complete` with `node: "Task_Extract"`.
- next: → `Task_PublishResult` (Publish the result release)

### 4. Publish the result release (`Task_PublishResult`)

- Who: the `Zitnik lab (GuidelineKG)` lane (role `guidelinekg-lab`).
- What: Unbuilt (skill guidelinekg-run not written yet): guideline_kg.jsonl and its SHA-256 manifest, naming the work order, the CDN release and the GuidelineKG commit.
- Record it: `workflow_complete` with `node: "Task_PublishResult"`.
- next: → `Call_IngestResult` (Verify and adjudicate the result)

### 5. Verify and adjudicate the result (`Call_IngestResult`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Phase: verify the result release, project it through the crosswalk into its own graph partition, adjudicate it against the L1 KG, advance the cursor and review the run report.
- A subprocess (`Process_OptimusKgNightlyIngest`): `workflow_next` reports its own steps; complete those — this call activity itself is not completable.
- next: → `End_Done` (Night finished)

## Done — Night finished (`End_Done`)

- The instance completes here. `workflow_next` then reports nothing enabled — that, not this line, is the record of completion.
