import {notesClient} from './notesClients';
import {scienceCatalogSchema,scienceSavedCheckSchema} from '@/schemas/scienceReviewSchemas';
export const scienceCoverageApi={
  catalog:async(signal?:AbortSignal)=>{
    const response=await notesClient.get('/science-coverage/concepts',{signal,timeout:15000});
    if(response.data.success!==true)throw Error('Science concepts are unavailable');
    return scienceCatalogSchema.parse(response.data.data);
  },
  saved:async(noteId:string,signal?:AbortSignal)=>{
    const response=await notesClient.get(`/science-coverage/notes/${noteId}/check`,{signal,timeout:15000});
    if(response.data.success!==true)throw Error('The saved Science check is unavailable');
    return scienceSavedCheckSchema.parse(response.data.data);
  },
  start:async(noteId:string,input:{text:string;conceptId:string;language:'English';scopeConfirmed:true},signal?:AbortSignal)=>{
    const response=await notesClient.post(`/science-coverage/notes/${noteId}/check`,input,{signal,timeout:15000});
    if(response.data.success!==true)throw Error('Could not start the Science check');
    return scienceSavedCheckSchema.parse(response.data.data);
  },
};
