import {notesClient} from './notesClients';
import {historyCatalogSchema, historySavedCheckSchema, parseHistoryReviewResponse} from '@/schemas/historyCoverageSchemas';

export const historyCoverageApi = {
  saved:async(noteId:string,signal?:AbortSignal)=>{
    const response=await notesClient.get(`/history-coverage/notes/${noteId}/check`,{signal,timeout:15000});
    if(response.data.success!==true)throw Error('Could not load the saved History check');
    return historySavedCheckSchema.parse(response.data.data);
  },
  startSaved:async(noteId:string,input:{text:string;conceptId:string;language:'English';scopeConfirmed:true},signal?:AbortSignal)=>{
    const response=await notesClient.post(`/history-coverage/notes/${noteId}/check`,input,{signal,timeout:15000});
    if(response.data.success!==true)throw Error('Could not start the History check');
    return historySavedCheckSchema.parse(response.data.data);
  },
  catalog: async (signal?: AbortSignal) => {
    const response = await notesClient.get('/history-coverage/concepts', {signal, timeout: 10000});
    if (response.data.success !== true) throw new Error('History concepts are unavailable');
    return historyCatalogSchema.parse(response.data.data);
  },
  suggest: async (input: {text: string; conceptId: string; language: 'English'; scopeConfirmed: true}, signal?: AbortSignal) => {
    const response = await notesClient.post('/history-coverage/suggestions', input, {signal, timeout: 100000});
    return parseHistoryReviewResponse(response.data, input);
  },
};
