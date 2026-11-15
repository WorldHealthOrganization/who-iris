Feature: The documents' reference lists in the IRIS Oxigraph graphs
  The references extracted from each IRIS document's reference list are
  built into the graphs: citation edges in the spine, the references
  themselves beside the citing document's metadata.

  @test:scripts/tests/iris-oxigraph-references.test.ts::reference_lists_in_the_Oxigraph_graphs::handlesFromCatalogueOrSlug
  Scenario: a library document's Handle comes from its catalogue node, or from a slug that is a Handle
    Given a catalogue node naming a library slug and its Handle
    Then that slug's documents have that Handle
    And a slug written as a Handle reads as that Handle
    And any other slug has none

  @test:scripts/tests/iris-oxigraph-references.test.ts::reference_lists_in_the_Oxigraph_graphs::spineHoldsCitationEdgesAndMetadataTheReferences
  Scenario: the spine holds the citation edges, and the metadata graph and the community partition the references
    Given two extracted references, one from a document in a community and one cited work the library holds
    When their quads are loaded into Oxigraph
    Then the document cites its reference and the IRIS item the library holds of it, in the spine
    And the reference's citation as printed and its year are in the metadata graph and the community's partition
    And a reference from a document in no community is in the metadata graph only
