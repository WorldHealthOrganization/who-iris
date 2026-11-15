import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import oxigraph from 'oxigraph';
import { GRAPH_IRIS_METADATA, GRAPH_IRIS_SPINE, REFERENCE_BASE, handleOfLibraryPath, libraryHandles, referenceQuads } from '../build-iris-oxigraph.ts';
import { bound, selectRows } from '../iris-oxigraph-search.ts';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-refs-'));
const refs = path.join(tmp, 'references');
const nodes = path.join(tmp, 'nodes');
fs.mkdirSync(refs);
fs.mkdirSync(nodes);
const put = (dir: string, name: string, v: unknown) => fs.writeFileSync(path.join(dir, name), JSON.stringify(v));
put(nodes, 'item-guide.json', { libraryId: '9789241549912-eng', handle: '10665/250796' });
put(refs, 'guide.sec-009.1.json', {
  id: '9789241549912-eng.sec-009.1',
  provenance: 'extracted',
  derivedFrom: 'library/9789241549912-eng/sections/sec-009.md',
  printed: 'WHO. Malaria report. Geneva: WHO; 2004.',
  issued: { 'date-parts': [[2004]] },
  heldAt: 'library/10665-117378',
});
put(refs, 'other.page-011.1.json', {
  id: '10665-117378.page-011.1',
  provenance: 'extracted',
  derivedFrom: 'library/10665-117378/sections/page-011.md',
  title: 'A review',
  DOI: '10.1000/x',
  URL: 'https://example.org/a',
});

describe('reference lists in the Oxigraph graphs', () => {
  test('handlesFromCatalogueOrSlug', () => {
    const by = libraryHandles(nodes);
    expect(handleOfLibraryPath('library/9789241549912-eng/sections/x.md', by)).toBe('10665/250796');
    expect(handleOfLibraryPath('library/10665-117378', by)).toBe('10665/117378');
    expect(handleOfLibraryPath('library/who-pub-tps-931/x', by)).toBeUndefined();
  });

  test('spineHoldsCitationEdgesAndMetadataTheReferences', () => {
    const rq = referenceQuads(refs, { '10665/250796': 'c1' }, libraryHandles(nodes));
    const store = new oxigraph.Store();
    store.load([...rq.spine, ...Object.values(rq.byGraph).flat()].join('\n') + '\n', { format: 'application/n-quads' });
    // What the guideline cites, and the IRIS item the library holds of it.
    const cited = selectRows(
      store,
      `SELECT ?x WHERE { GRAPH <${GRAPH_IRIS_SPINE}> { <https://hdl.handle.net/10665/250796> <http://purl.org/spar/cito/cites> ?x } } ORDER BY ?x`,
    ).map((r) => bound(r, 'x'));
    expect(cited).toEqual(['https://hdl.handle.net/10665/117378', `${REFERENCE_BASE}9789241549912-eng.sec-009.1`]);
    // The reference, in the metadata graph and in its citing document's community.
    for (const g of [GRAPH_IRIS_METADATA, 'https://iris.who.int/graph/community/c1']) {
      const row = selectRows(
        store,
        `SELECT ?c ?y WHERE { GRAPH <${g}> { <${REFERENCE_BASE}9789241549912-eng.sec-009.1> <http://purl.org/dc/terms/bibliographicCitation> ?c ; <http://purl.org/dc/terms/issued> ?y } }`,
      );
      expect(row.map((r) => [bound(r, 'c'), bound(r, 'y')])).toEqual([['WHO. Malaria report. Geneva: WHO; 2004.', '2004']]);
    }
    // A document with no community: its references are in the metadata graph only.
    const doi = selectRows(store, `SELECT ?g ?d WHERE { GRAPH ?g { ?r <http://purl.org/ontology/bibo/doi> ?d } }`);
    expect(doi.map((r) => [bound(r, 'g'), bound(r, 'd')])).toEqual([[GRAPH_IRIS_METADATA, '10.1000/x']]);
  });
});
