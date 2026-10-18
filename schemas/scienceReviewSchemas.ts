import {z} from 'zod';
import {englishCoverageCheckSchema} from './englishCoverageSchemas';
export const scienceCatalogSchema=z.object({modelVersion:z.string(),modelSha256:z.string().regex(/^[a-f0-9]{64}$/),
  concepts:z.array(z.object({id:z.string(),name:z.string(),points:z.array(z.object({id:z.string(),text:z.string()})).min(1)})).min(1)});
export const scienceSavedCheckSchema=z.object({
  state:z.enum(['not_requested','running','ready','failed','stale']),
  input:z.object({text:z.string(),conceptId:z.string(),language:z.literal('English'),scopeConfirmed:z.literal(true)}).optional(),
  result:z.object({analyzedText:z.string(),check:englishCoverageCheckSchema}).optional(),error:z.string().optional(),
}).superRefine((saved,ctx)=>{
  const invalid=()=>ctx.addIssue({code:'custom',message:'Saved Science evidence does not match its reviewed text and concept'});
  if(['running','ready','failed'].includes(saved.state)&&!saved.input)invalid();
  if(saved.state!=='ready'&&saved.result)invalid();
  if(saved.state==='ready') {
    const {result,input}=saved;
    if(!result||!input||result.analyzedText!==input.text||result.check.state!=='ready'||result.check.suggestions.length!==1||
      result.check.suggestions[0].conceptId!==input.conceptId||!result.check.modelSha256?.match(/^[a-f0-9]{64}$/)) {invalid();return;}
    for(const point of result.check.suggestions[0].prediction.evidence.points){
      if(point.candidateEvidence===null){if(point.start!==null||point.end!==null)invalid();}
      else if(point.start===null||point.end===null||!Number.isInteger(point.start)||!Number.isInteger(point.end)||point.start<0||point.end<point.start||point.end>input.text.length||input.text.slice(point.start,point.end)!==point.candidateEvidence)invalid();
    }
  }
});
export type ScienceConcept=z.infer<typeof scienceCatalogSchema>['concepts'][number];
export type SavedScienceReview=z.infer<typeof scienceSavedCheckSchema>;
