import {notesClient} from './notesClients';
import {ictCatalogSchema, parseICTReviewResponse, parseICTReference, ICTConcept} from '@/schemas/ictCoverageSchemas';

export const ictCoverageApi = {
  reference: async (concept: ICTConcept, signal?: AbortSignal) => {
    const response = await notesClient.get(`/ict-coverage/concepts/${encodeURIComponent(concept.id)}/reference`, {signal, timeout: 15000});
    return parseICTReference(response.data, concept);
  },
  catalog: async (signal?: AbortSignal) => {
    const response = await notesClient.get('/ict-coverage/concepts', {signal, timeout: 10000});
    if (response.data.success !== true) throw new Error('ICT concepts are unavailable');
    return ictCatalogSchema.parse(response.data.data);
  },
  suggest: async (input: {text: string; conceptId: string; language: 'English'; scopeConfirmed: true}, signal?: AbortSignal) => {
    const response = await notesClient.post('/ict-coverage/suggestions', input, {signal, timeout: 100000});
    return parseICTReviewResponse(response.data, input);
  },
};
