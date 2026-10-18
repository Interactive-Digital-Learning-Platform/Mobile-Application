import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TouchableOpacity,TextInput,ActivityIndicator,StyleSheet} from 'react-native';
import {scienceCoverageApi} from '@/api/scienceCoverageAPI';
import {ScienceConcept,SavedScienceReview} from '@/schemas/scienceReviewSchemas';
import EnglishCoverageCard from './EnglishCoverageCard';
import {colors} from '@/constants/colors';
import {scienceModelStatus} from '@/utils/scienceModelStatus';

const message=(error:any)=>typeof error?.response?.data?.error==='string'?error.response.data.error:'The Science check is unavailable. Check your connection and try again.';
export default function ScienceConceptCheck({noteId,text,automaticCheck}:{noteId:string;text:string;automaticCheck?:unknown}) {
  const automatic=scienceModelStatus(automaticCheck);
  const initialConceptId=automatic.kind==='ready'?(automatic.check.suggestions[0]?.modelConceptId||automatic.check.suggestions[0]?.conceptId):undefined;
  const [open,setOpen]=useState(false),[picker,setPicker]=useState(false);
  const [concepts,setConcepts]=useState<ScienceConcept[]>([]),[conceptId,setConcept]=useState(initialConceptId||'');
  const [reviewedText,setText]=useState(text),[confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(true),[error,setError]=useState(''),[paused,setPaused]=useState(false);
  const [saved,setSaved]=useState<SavedScienceReview|null>(null),[refresh,setRefresh]=useState(0),[catalogRefresh,setCatalogRefresh]=useState(0);
  const post=useRef<AbortController|null>(null),version=useRef(0);
  const concept=concepts.find(c=>c.id===conceptId);
  useEffect(()=>{
    setText(text);setConcept(initialConceptId||'');setConfirmed(false);setSaved(null);
    return()=>{version.current++;post.current?.abort();};
  },[noteId,text,initialConceptId]);
  useEffect(()=>{
    const controller=new AbortController();let stopped=false,timer:ReturnType<typeof setTimeout>|undefined;
    const until=Date.now()+125000;setBusy(true);setPaused(false);
    async function load(){try{
      const state=await scienceCoverageApi.saved(noteId,controller.signal);if(stopped)return;
      setSaved(state);setBusy(state.state==='running');
      if(state.input){setText(state.input.text);setConcept(state.input.conceptId);setConfirmed(true);setOpen(true);}
      if(state.state==='ready')setError('');
      if(state.state==='failed')setError(state.error||'This check could not finish. Try again.');
      if(state.state==='stale')setError('Your source note changed. Review its current text and check again.');
      if(state.state==='running'){if(Date.now()<until)timer=setTimeout(load,2000);else{setBusy(false);setPaused(true);}}
    }catch(e){if(!stopped){setBusy(false);setPaused(true);setError(message(e));}}}
    void load();return()=>{stopped=true;controller.abort();if(timer)clearTimeout(timer);};
  },[noteId,text,refresh]);
  useEffect(()=>{
    if(!open)return;const controller=new AbortController();
    scienceCoverageApi.catalog(controller.signal).then(c=>{if(!controller.signal.aborted)setConcepts(c.concepts);})
      .catch(e=>{if(!controller.signal.aborted)setError(message(e));});
    return()=>controller.abort();
  },[open,catalogRefresh]);
  function invalidate(){setSaved(null);setConfirmed(false);setError('');}
  async function check(){
    if(busy||!confirmed||!concept||!reviewedText.trim())return;
    const current=++version.current,controller=new AbortController();post.current=controller;
    setBusy(true);setError('');setSaved(null);
    try{await scienceCoverageApi.start(noteId,{text:reviewedText,conceptId,language:'English',scopeConfirmed:true},controller.signal);
      if(current===version.current)setRefresh(n=>n+1);
    }catch(e){if(current===version.current&&!controller.signal.aborted){setBusy(false);setPaused(true);setError(message(e));}}
  }
  return <View style={s.card}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setOpen(v=>!v)}>
      <Text style={s.title}>Live trained-model check</Text>
      <Text style={s.body}>Review the text and check one of our 10 supported Science concepts.</Text>
      <Text style={s.link}>{open?'Hide concept checker':'Choose a concept and try it'}</Text>
    </TouchableOpacity>
    {open&&<>
      <Text style={s.body}>This focused check uses your reviewed text. It saves separately from the automatic upload result and does not change your lesson score.</Text>
      <Text style={s.label}>Expected concept</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose Science concept" disabled={busy} style={s.choice} onPress={()=>setPicker(v=>!v)}><Text>{concept?.name||'Choose a supported concept'}</Text></TouchableOpacity>
      {picker&&concepts.map(c=><TouchableOpacity key={c.id} disabled={busy} accessibilityRole="button" style={s.choice} onPress={()=>{invalidate();setConcept(c.id);setPicker(false);}}><Text>Grade {c.id.includes('-g10-')?'10':'11'} · {c.name}</Text></TouchableOpacity>)}
      {!concepts.length&&<TouchableOpacity accessibilityRole="button" onPress={()=>setCatalogRefresh(n=>n+1)}><Text style={s.link}>Load supported concepts</Text></TouchableOpacity>}
      {concept&&<View style={s.criteria}>{concept.points.map(p=><Text key={p.id} style={s.body}>• {p.text}</Text>)}</View>}
      <Text style={s.label}>Review and correct the extracted text</Text>
      <TextInput accessibilityLabel="Science reviewed note text" value={reviewedText} multiline maxLength={20000} editable={!busy} style={s.input} onChangeText={v=>{invalidate();setText(v);}}/>
      <Text style={s.small}>Your original photos and OCR stay unchanged. Added text is checked only as part of this reviewed version.</Text>
      {reviewedText!==text&&<TouchableOpacity accessibilityRole="button" disabled={busy} onPress={()=>{invalidate();setText(text);}}><Text style={s.link}>Use original extracted text</Text></TouchableOpacity>}
      <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:confirmed}} aria-checked={confirmed} disabled={busy} onPress={()=>{setConfirmed(!confirmed);setSaved(null);}} style={s.confirm}><Text style={s.body}>{confirmed?'☑':'☐'} I reviewed this English text and confirm the selected concept is expected in this note.</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" disabled={busy||!confirmed||!concept||!reviewedText.trim()} onPress={check} style={[s.primary,(busy||!confirmed||!concept||!reviewedText.trim())&&s.disabled]}>
        {busy?<ActivityIndicator color="#fff"/>:<Text style={s.primaryText}>Run trained Science model</Text>}
      </TouchableOpacity>
      {busy&&<Text accessibilityLiveRegion="polite" style={s.small}>Loading or checking your saved result. You can leave this screen and return.</Text>}
      {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {paused&&<TouchableOpacity accessibilityRole="button" onPress={()=>{setError('');setRefresh(n=>n+1);}}><Text style={s.link}>Check saved Science result again</Text></TouchableOpacity>}
      {saved?.state==='ready'&&saved.result&&<><EnglishCoverageCard check={saved.result.check}/><Text style={s.small}>Saved with this note · Result for the reviewed text above.</Text></>}
    </>}
  </View>;
}
const s=StyleSheet.create({
  card:{marginHorizontal:16,marginTop:12,padding:18,borderWidth:1,borderColor:'#FED7AA',borderRadius:20,backgroundColor:'#fff'},
  title:{fontSize:16,fontWeight:'700',color:'#1E293B',marginBottom:7},body:{fontSize:13,lineHeight:21,color:'#475569'},
  link:{color:colors.primary,fontSize:13,fontWeight:'600',paddingVertical:10},label:{fontSize:14,fontWeight:'600',color:'#334155',marginTop:15,marginBottom:7},
  choice:{borderWidth:1,borderColor:'#CBD5E1',padding:12,borderRadius:9,marginBottom:6},criteria:{backgroundColor:'#F8FAFC',padding:12,borderRadius:9},
  input:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:9,padding:12,minHeight:160,textAlignVertical:'top',fontSize:14,lineHeight:22,color:'#334155'},
  small:{fontSize:12,lineHeight:19,color:'#64748B',marginTop:8},confirm:{paddingVertical:14},primary:{backgroundColor:colors.primary,padding:15,borderRadius:10,alignItems:'center'},
  primaryText:{color:'#fff',fontWeight:'700'},disabled:{opacity:.45},error:{color:'#B91C1C',lineHeight:21,marginTop:10},
});
