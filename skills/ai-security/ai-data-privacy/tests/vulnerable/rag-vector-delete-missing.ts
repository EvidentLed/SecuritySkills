async function deleteDocument(documentId: string, tenantId: string) {
  await sourceDocuments.delete({ where: { id: documentId, tenantId } });
  // Missing: chunk manifest, vector rows, prompt cache, and retrieval metadata
  // remain queryable for this source document.
}

async function retrieveContext(queryEmbedding: number[]) {
  const matches = await vectorStore.query({ vector: queryEmbedding, topK: 8 });
  return matches.map((match) => match.metadata.text);
}
