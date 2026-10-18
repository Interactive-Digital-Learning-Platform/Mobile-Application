import React, {useEffect, useRef, useState} from 'react';
import {View, Text, TouchableOpacity, TextInput, Modal, ScrollView, ActivityIndicator, StyleSheet} from 'react-native';
import {historyCoverageApi} from '@/api/historyCoverageAPI';
import {HistoryConcept, HistoryReview} from '@/schemas/historyCoverageSchemas';

const labels = {present: 'Suggested complete', partial: 'Suggested partial', missing: 'Not found in this text'};
const errorMessage = (error: any) => typeof error?.response?.data?.error === 'string'
  ? error.response.data.error : 'The History check is unavailable. Check your connection and try again.';

/** Student-requested check of edited text. No automatic note score/profile changes. */
export default function HistoryCoverageCard({text, grade = 10, initialConceptId, noteId}: {
  text: string; grade?: 10 | 11; initialConceptId?: string; noteId?:string;
}) {
  const [concepts, setConcepts] = useState<HistoryConcept[]>([]);
  const [selectedGrade, setGrade] = useState<10 | 11>(grade);
  const [conceptId, setConcept] = useState(initialConceptId || '');
  const [noteText, setText] = useState(text);
  const [confirmed, setConfirmed] = useState(false);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<HistoryReview | null>(null);
  const [savedReload,setSavedReload]=useState(0);
  const [savedState,setSavedState]=useState('');
  const [pollPaused,setPollPaused]=useState(false);
  const active = useRef<AbortController | null>(null);
  const version = useRef(0);
  const concept = concepts.find(c => c.id === conceptId);

  const invalidate = () => {
    version.current++; active.current?.abort(); active.current = null;
    setBusy(false); setResult(null); setConfirmed(false); setError('');setSavedState('');
  };
  useEffect(() => {
    invalidate(); setText(text); setGrade(grade); setConcept(initialConceptId || '');
    return () => {version.current++; active.current?.abort();};
    // Props identify a different OCR snapshot or demo sample.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, grade, initialConceptId,noteId]);
  useEffect(()=>{
    if(!noteId)return;
    const controller=new AbortController();let stopped=false;let timer:ReturnType<typeof setTimeout>|undefined;
    const until=Date.now()+125000;
    setPollPaused(false);setBusy(true);
    async function loadSaved(){
      try{
        const saved=await historyCoverageApi.saved(noteId!,controller.signal);
        if(stopped)return;
        setSavedState(saved.state);setBusy(saved.state==='running');
        if(saved.input){setText(saved.input.text);setConcept(saved.input.conceptId);setGrade(saved.input.conceptId.includes('-g10-')?10:11);setConfirmed(true);}
        if(saved.result){setResult(saved.result);setGrade(saved.result.concept.grade);setError('');}
        else setResult(null);
        if(saved.state==='failed')setError(saved.error||'This check could not finish. Please try again.');
        if(saved.state==='stale')setError('Your note changed. Review the current text and check again.');
        if(saved.state==='running'){
          if(Date.now()<until)timer=setTimeout(loadSaved,2500);
          else {setPollPaused(true);setBusy(false);}
        }
      }catch(error){if(!stopped){setError(errorMessage(error));setPollPaused(true);setBusy(false);}}
    }
    void loadSaved();return()=>{stopped=true;controller.abort();if(timer)clearTimeout(timer);};
  },[noteId,text,savedReload]);
  useEffect(() => {
    const controller = new AbortController(); setCatalogLoading(true); setError('');
    historyCoverageApi.catalog(controller.signal).then(data => {if (!controller.signal.aborted) setConcepts(data.concepts);})
      .catch(e => {if (!controller.signal.aborted) setError(errorMessage(e));})
      .finally(() => {if (!controller.signal.aborted) setCatalogLoading(false);});
    return () => controller.abort();
  }, [reload]);

  async function check() {
    if (!confirmed || !concept || !noteText.trim() || busy) return;
    const request = ++version.current; const controller = new AbortController(); active.current = controller;
    setBusy(true); setResult(null); setError('');
    try {
      if(noteId){
        await historyCoverageApi.startSaved(noteId,{text:noteText,conceptId,language:'English',scopeConfirmed:true},controller.signal);
        if(version.current===request){setSavedState('running');setSavedReload(n=>n+1);}
      }else{
        const prediction = await historyCoverageApi.suggest({text: noteText, conceptId, language: 'English', scopeConfirmed: true}, controller.signal);
        if (version.current === request) setResult(prediction);
      }
    } catch (e) {if (version.current === request && !controller.signal.aborted) {setError(errorMessage(e));setBusy(false);if(noteId)setPollPaused(true);}}
    finally {if (version.current === request) {if(!noteId)setBusy(false);active.current = null;}}
  }

  return <View style={s.card}>
    <Text style={s.eyebrow}>HISTORY · EXPERIMENTAL · ENGLISH</Text>
    <Text style={s.title}>Check a concept in this note</Text>
    <Text style={s.body}>Choose an expected concept, correct the note text, then request a coverage suggestion. This check does not change your lesson score or learning profile.</Text>
    {catalogLoading ? <ActivityIndicator accessibilityLabel="Loading History concepts"/> : <>
      {!concepts.length ? <TouchableOpacity onPress={() => setReload(n => n + 1)} accessibilityRole="button" style={s.button}><Text>Retry loading concepts</Text></TouchableOpacity> : <>
        <Text style={s.label}>Grade</Text><View style={s.row}>{([10, 11] as const).map(g => <TouchableOpacity key={g} disabled={busy} accessibilityRole="button" accessibilityState={{selected: selectedGrade === g}} onPress={() => {invalidate(); setGrade(g); setConcept('');}} style={[s.button, selectedGrade === g && s.selected]}><Text>Grade {g}</Text></TouchableOpacity>)}</View>
        <Text style={s.label}>Expected concept</Text><TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityLabel="Choose History concept" onPress={() => {setQuery(''); setPicker(true);}} style={s.button}><Text>{concept?.name || 'Choose a concept'}</Text></TouchableOpacity>
        {concept && <View style={s.criteria}><Text style={s.label}>Proposed required points</Text>{concept.points.map(p => <Text key={p.id} style={s.body}>• {p.text}</Text>)}</View>}
        <Text style={s.label}>Review and correct the English note text</Text>
        <TextInput accessibilityLabel="History note text" multiline maxLength={20000} editable={!busy} value={noteText} onChangeText={value => {invalidate(); setText(value);}} style={s.input}/>
        <Text style={s.small}>{noteId?'Your reviewed text and result are saved with this note. Your original OCR and photos stay unchanged.':'Edits apply only to this demo check.'}</Text>
        <TouchableOpacity disabled={busy} accessibilityRole="checkbox" accessibilityState={{checked: confirmed}} aria-checked={confirmed} onPress={() => {setConfirmed(!confirmed); setResult(null);}} style={s.confirm}><Text style={s.body}>{confirmed ? '☑' : '☐'} I checked this English text and confirm that the selected concept is expected here.</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy || !confirmed || !concept || !noteText.trim()} accessibilityRole="button" accessibilityState={{disabled: busy || !confirmed || !concept || !noteText.trim()}} onPress={check} style={[s.primary, (busy || !confirmed || !concept || !noteText.trim()) && s.disabled]}><Text style={s.primaryText}>{busy ? 'Checking…' : 'Check History coverage'}</Text></TouchableOpacity>
        {busy && <Text accessibilityLiveRegion="polite" style={s.small}>{noteId?'Your check is saved and running. You can leave this screen and open the note again for the result.':'The first demo check loads the model and may take up to 90 seconds.'}</Text>}
        {pollPaused&&noteId&&<TouchableOpacity accessibilityRole="button" onPress={()=>{setError('');setSavedReload(n=>n+1);}} style={s.button}><Text>Check saved result again</Text></TouchableOpacity>}
      </>}
    </>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {result && <View accessibilityLiveRegion="polite" style={s.result}>
      <Text style={s.title}>{result.prediction.suggestedStatus ? labels[result.prediction.suggestedStatus] : 'Suggestion withheld — review needed'}</Text>
      <Text style={s.notice}>Review required. These are candidate passages, not proof of correctness or student understanding. The History model has not been validated on real student handwriting.</Text>
      {result.prediction.evidence.points.map(p => <View key={p.pointId} style={s.point}><Text style={s.label}>{p.requirement}</Text><Text style={s.small}>Candidate passage — check its meaning</Text><Text selectable style={s.quote}>{p.semanticCandidateEvidence}</Text></View>)}
      {result.prediction.evidence.concerns.map((c, i) => <View key={i}><Text style={s.notice}>{c.reason || c.kind.replace(/_/g, ' ')}</Text><Text selectable style={s.quote}>{c.quote}</Text></View>)}
      <Text style={s.small}>History V5.1 · {noteId&&savedState==='ready'?'Saved with this note':'On-demand review'} · This suggestion is not a grade.</Text>
    </View>}
    <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
      <View style={s.overlay}><View style={s.sheet}><Text style={s.title}>Grade {selectedGrade} History concepts</Text><TextInput accessibilityLabel="Search History concepts" placeholder="Search concepts" value={query} onChangeText={setQuery} style={s.search}/><ScrollView keyboardShouldPersistTaps="handled">{concepts.filter(c => c.grade === selectedGrade && c.name.toLowerCase().includes(query.toLowerCase())).map(c => <TouchableOpacity key={c.id} accessibilityRole="button" onPress={() => {invalidate(); setConcept(c.id); setPicker(false);}} style={s.option}><Text style={s.body}>{c.name}</Text></TouchableOpacity>)}</ScrollView><TouchableOpacity onPress={() => setPicker(false)} accessibilityRole="button" style={s.button}><Text>Close</Text></TouchableOpacity></View></View>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  card: {backgroundColor: '#fff', borderColor: '#D5DEEF', borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 20},
  eyebrow: {fontSize: 11, fontWeight: '700', color: '#4F46E5', marginBottom: 8}, title: {fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 10},
  body: {fontSize: 14, lineHeight: 22, color: '#475569'}, small: {fontSize: 12, lineHeight: 19, color: '#64748B', marginTop: 8},
  label: {fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 14, marginBottom: 7}, row: {flexDirection: 'row', gap: 8},
  button: {padding: 12, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, marginVertical: 5}, selected: {backgroundColor: '#E0E7FF', borderColor: '#6366F1'},
  criteria: {backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8}, input: {borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, minHeight: 150, textAlignVertical: 'top', fontSize: 14, lineHeight: 22, color: '#334155'},
  confirm: {paddingVertical: 16}, primary: {padding: 14, backgroundColor: '#4F46E5', borderRadius: 9, alignItems: 'center'}, primaryText: {color: '#fff', fontWeight: '700'}, disabled: {opacity: .45},
  error: {color: '#B91C1C', lineHeight: 21, marginTop: 12}, result: {borderTopWidth: 1, borderColor: '#E2E8F0', paddingTop: 18, marginTop: 20},
  notice: {backgroundColor: '#FFFBEB', color: '#92400E', fontSize: 13, lineHeight: 21, padding: 12, borderRadius: 8}, point: {marginTop: 10},
  quote: {backgroundColor: '#F1F5F9', color: '#334155', fontSize: 14, lineHeight: 22, padding: 12, marginVertical: 8, borderRadius: 8},
  overlay: {flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 20}, sheet: {backgroundColor: '#fff', padding: 20, borderRadius: 16, maxHeight: '85%', maxWidth: 650, width: '100%', alignSelf: 'center'},
  search: {borderWidth: 1, borderColor: '#CBD5E1', padding: 12, borderRadius: 8, marginBottom: 10}, option: {paddingVertical: 13, borderBottomWidth: 1, borderColor: '#E2E8F0'},
});
