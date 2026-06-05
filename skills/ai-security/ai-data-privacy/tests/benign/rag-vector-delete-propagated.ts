async function deleteDocument(documentId: string, tenantId: string) {
  await sourceDocuments.delete({ where: { id: documentId, tenantId } });
  await chunkManifest.deleteMany({ where: { sourceDocumentId: documentId, tenantId } });
  await vectorStore.delete({ filter: { source_document_id: documentId, tenant_id: tenantId } });
  await promptCache.invalidate({ sourceDocumentId: documentId, tenantId });
}

async function retrieveContext(queryEmbedding: number[], userId: string, tenantId: string) {
  const allowedDocumentIds = await authorizationService.allowedDocumentIds(userId, tenantId);

  return vectorStore.query({
    vector: queryEmbedding,
    topK: 8,
    filter: {
      tenant_id: tenantId,
      source_document_id: { $in: allowedDocumentIds },
      deleted_at: null,
    },
  });
}
