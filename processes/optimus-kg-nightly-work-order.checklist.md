<!-- GENERATED from who-iris/processes/optimus-kg-nightly-work-order.bpmn by cat-harness-tools/scripts/bpmn-checklist.ts. Do not edit: change the diagram and regenerate (bun run cat bpmn:checklist). -->

# Checklist — GuidelineKG nightly path: prepare the work order

> **Generated, and not the authority.** This is `who-iris/processes/optimus-kg-nightly-work-order.bpmn` (process `Process_OptimusKgNightlyWorkOrder`) walked as a state machine. The diagram and the workflow engine decide; this list only reads them. Follow the `next:` line of each step rather than the order on the page, and record each step with the call it names, so the engine's committed state — not this list — says which edge was taken.

Verify the night's CDN release, find what changed since this path last finished, and publish a work order listing the scope-selected items the Zitnik lab should run GuidelineKG over.

## Begin — Release to prepare (`Start_Prepare`)

- Begin here.
- Call `workflow_start` with `process: "Process_OptimusKgNightlyWorkOrder"` and the subject this run is about; keep the instance id it returns.
- next: → `Task_VerifyRelease` (Verify the release signature)

### 1. Verify the release signature (`Task_VerifyRelease`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- Skill: `iris-cdn-signing`.
- What: Resolve the key from the did:web DID document, never from the package, and verify tagmanifest-sha256.txt.jws.
- Record it: `workflow_complete` with `node: "Task_VerifyRelease"`.
- next: → `GW_Verified` (Release verified?)

### Decide — Release verified? (`GW_Verified`)

- Call `workflow_complete` with `node: "GW_Verified"` and `outcome` set to the label that holds:
  - «no» → `End_Refused` (Release refused)
  - «yes» → `Task_Diff` (Diff the release since the cursor)

## Done — Release refused (`End_Refused`)

- The instance completes here. `workflow_next` then reports nothing enabled — that, not this line, is the record of completion.

### 2. Diff the release since the cursor (`Task_Diff`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill optimus-kg-feed not written yet): diffManifests (scripts/iris-cdn/bag.ts) against state/optimus-cursor.json, this path's own cursor: added, changed and removed paths.
- Record it: `workflow_complete` with `node: "Task_Diff"`.
- next: → `Task_ApplyMetadata` (Apply edits and withdrawals)

### 3. Apply edits and withdrawals (`Task_ApplyMetadata`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill optimus-kg-feed not written yet): Only records/<handle>.json changed: re-ground the publication node, do not re-extract (the PDF digest did not change).
- Record it: `workflow_complete` with `node: "Task_ApplyMetadata"`.
- next: → `Task_SelectByScope` (Select items by scope)

### 4. Select items by scope (`Task_SelectByScope`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill l1-scope-of-interest not written yet): Level 1 (summary and keywords) for every changed item; then each record is tested against every active scope of interest.
- Record it: `workflow_complete` with `node: "Task_SelectByScope"`.
- next: → `Task_Gates` (Check the five gates)

### 5. Check the five gates (`Task_Gates`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- Skill: `materialize-remote`.
- What: size, restrictions, retention, sourceLoss, copyright for each selected bitstream.
- Record it: `workflow_complete` with `node: "Task_Gates"`.
- next: → `Task_WorkOrder` (Publish the work order)

### 6. Publish the work order (`Task_WorkOrder`)

- Who: the `who-iris` lane (role `guidelinekg-path`).
- What: Unbuilt (skill optimus-kg-feed not written yet): Write state/guidelinekg/work-order.json beside state/cursor.json in the release history: handles, bitstream digests, dc.language.iso.
- Record it: `workflow_complete` with `node: "Task_WorkOrder"`.
- next: → `End_Published` (Work order published)

## Done — Work order published (`End_Published`)

- The instance completes here. `workflow_next` then reports nothing enabled — that, not this line, is the record of completion.
