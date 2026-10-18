import React, {useEffect, useRef, useState} from 'react';
import {View, Text, TouchableOpacity, TextInput, Modal, ScrollView, ActivityIndicator, StyleSheet} from 'react-native';
import {ictCoverageApi} from '@/api/ictCoverageAPI';
import {ICTConcept, ICTReview, ICTReference} from '@/schemas/ictCoverageSchemas';

const labels = {present: 'Suggested complete', partial: 'Suggested partial', missing: 'Not found in this text'};
const concerns: Record<string, string> = {
  possible_ict_role_conflict: 'This passage may describe the wrong role. Compare it with the required points and textbook.',
  prompt_or_heading_only: 'A heading or unanswered question does not establish coverage.',
  unanswered_instruction_block: 'These appear to be unanswered instructions rather than an explanation.',
};
const errorMessage = (error: any) => typeof error?.response?.data?.error === 'string'
  ? error.response.data.error : 'The ICT check is unavailable. Check your connection and try again.';

/** Student-requested check of edited text. No automatic note score/profile changes. */
export default function ICTCoverageCard({text, grade = 10, initialConceptId}: {
  text: string; grade?: 10 | 11; initialConceptId?: string;
}) {
  const [concepts, setConcepts] = useState<ICTConcept[]>([]);
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
  const [reference, setReference] = useState<ICTReference | null>(null);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceError, setReferenceError] = useState('');
  const referenceActive = useRef<AbortController | null>(null);
  const [result, setResult] = useState<ICTReview | null>(null);
  const active = useRef<AbortController | null>(null);
  const version = useRef(0);
  const concept = concepts.find(c => c.id === conceptId);

  const invalidate = () => {
    version.current++; active.current?.abort(); active.current = null;
    referenceActive.current?.abort(); setReference(null); setReferenceBusy(false); setReferenceError('');
    setBusy(false); setResult(null); setConfirmed(false); setError('');
  };
  useEffect(() => {
    invalidate(); setText(text); setGrade(grade); setConcept(initialConceptId || '');
    return () => {version.current++; active.current?.abort(); referenceActive.current?.abort();};
    // Props identify a different OCR snapshot or demo sample.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, grade, initialConceptId]);
  useEffect(() => {
    const controller = new AbortController(); setCatalogLoading(true); setError('');
    ictCoverageApi.catalog(controller.signal).then(data => {if (!controller.signal.aborted) setConcepts(data.concepts);})
      .catch(e => {if (!controller.signal.aborted) setError(errorMessage(e));})
      .finally(() => {if (!controller.signal.aborted) setCatalogLoading(false);});
    return () => controller.abort();
  }, [reload]);

  async function check() {
    if (!confirmed || !concept || !noteText.trim() || busy) return;
    referenceActive.current?.abort(); referenceActive.current = null; setReferenceBusy(false);
    const request = ++version.current; const controller = new AbortController(); active.current = controller;
    setBusy(true); setResult(null); setError('');
    try {
      const prediction = await ictCoverageApi.suggest({text: noteText, conceptId, language: 'English', scopeConfirmed: true}, controller.signal);
      if (version.current === request) setResult(prediction);
    } catch (e) {if (version.current === request && !controller.signal.aborted) setError(errorMessage(e));}
    finally {if (version.current === request) {setBusy(false); active.current = null;}}
  }

  async function loadReference() {
    if (!concept || referenceBusy) return;
    const request = version.current; const controller = new AbortController(); referenceActive.current = controller;
    setReferenceBusy(true); setReferenceError('');
    try {const data = await ictCoverageApi.reference(concept, controller.signal); if (version.current === request) setReference(data);}
    catch (e) {if (version.current === request && !controller.signal.aborted) setReferenceError(errorMessage(e));}
    finally {if (version.current === request) {setReferenceBusy(false); referenceActive.current = null;}}
  }

  return <View style={s.card}>
    <Text style={s.eyebrow}>ICT · EXPERIMENTAL · ENGLISH</Text>
    <Text style={s.title}>Check an ICT concept in this note</Text>
    <Text style={s.body}>Choose an expected concept, correct the note text, then request a coverage suggestion. This check does not change your lesson score or learning profile.</Text>
    {catalogLoading ? <ActivityIndicator accessibilityLabel="Loading ICT concepts"/> : <>
      {!concepts.length ? <TouchableOpacity onPress={() => setReload(n => n + 1)} accessibilityRole="button" style={s.button}><Text>Retry loading concepts</Text></TouchableOpacity> : <>
        <Text style={s.label}>Grade</Text><View style={s.row}>{([10, 11] as const).map(g => <TouchableOpacity key={g} disabled={busy} accessibilityRole="button" accessibilityState={{selected: selectedGrade === g}} onPress={() => {invalidate(); setGrade(g); setConcept('');}} style={[s.button, selectedGrade === g && s.selected]}><Text>Grade {g}</Text></TouchableOpacity>)}</View>
        <Text style={s.label}>Expected concept</Text><TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityLabel="Choose ICT concept" onPress={() => {setQuery(''); setPicker(true);}} style={s.button}><Text>{concept?.name || 'Choose a concept'}</Text></TouchableOpacity>
        {concept && <View style={s.criteria}><Text style={s.label}>Proposed required points</Text>{concept.points.map(p => <Text key={p.id} style={s.body}>• {p.text}</Text>)}</View>}
        {concept && <View><Text style={s.small}>Textbook: Grade {concept.grade} ICT · PDF pages {concept.textbook.pdfPages.join(', ')}</Text>
          <TouchableOpacity disabled={referenceBusy || busy} onPress={() => reference ? setReference(null) : loadReference()} accessibilityRole="button" style={s.button}><Text>{referenceBusy ? 'Loading reference…' : reference ? 'Hide textbook reference' : 'View textbook reference'}</Text></TouchableOpacity>
          {!!referenceError && <Text accessibilityRole="alert" style={s.error}>{referenceError}</Text>}
          {reference && <View style={s.criteria}><Text style={s.label}>Textbook reference</Text><ScrollView nestedScrollEnabled style={{maxHeight: 260}}>{reference.passages.map((p,i) => <View key={i}><Text style={s.small}>PDF pages {p.pdfPages.join(', ')}</Text><Text selectable style={s.body}>{p.text}</Text></View>)}</ScrollView></View>}
        </View>}
        <Text style={s.label}>Review and correct the English note text</Text>
        <TextInput accessibilityLabel="ICT note text" multiline maxLength={20000} editable={!busy} value={noteText} onChangeText={value => {invalidate(); setText(value);}} style={s.input}/>
        <Text style={s.small}>Edits apply only to this check. The saved OCR and original image stay available in the note.</Text>
        <TouchableOpacity disabled={busy} accessibilityRole="checkbox" accessibilityState={{checked: confirmed}} aria-checked={confirmed} onPress={() => {setConfirmed(!confirmed); setResult(null);}} style={s.confirm}><Text style={s.body}>{confirmed ? '☑' : '☐'} I checked this English text and confirm that the selected concept is expected here.</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy || !confirmed || !concept || !noteText.trim()} accessibilityRole="button" accessibilityState={{disabled: busy || !confirmed || !concept || !noteText.trim()}} onPress={check} style={[s.primary, (busy || !confirmed || !concept || !noteText.trim()) && s.disabled]}><Text style={s.primaryText}>{busy ? 'Checking…' : 'Check ICT coverage'}</Text></TouchableOpacity>
        {busy && <Text accessibilityLiveRegion="polite" style={s.small}>The first check loads the model and may take up to 90 seconds. Keep this screen open.</Text>}
      </>}
    </>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {result && <View accessibilityLiveRegion="polite" style={s.result}>
      <Text style={s.title}>{result.prediction.suggestedStatus ? labels[result.prediction.suggestedStatus] : 'Suggestion withheld — review needed'}</Text>
      <Text style={s.notice}>Review required. These are candidate passages, not proof of correctness or student understanding. The ICT model has not been validated on real student handwriting.</Text>
      {result.prediction.evidence.points.map(p => <View key={p.pointId} style={s.point}><Text style={s.label}>{p.requirement}</Text><Text style={s.small}>Candidate passage — check its meaning</Text><Text selectable style={s.quote}>{p.semanticCandidateEvidence}</Text></View>)}
      {result.prediction.evidence.concerns.map((c, i) => <View key={i}><Text style={s.notice}>{c.reason || concerns[c.kind] || 'Review the meaning of this passage against the required points.'}</Text><Text selectable style={s.quote}>{c.quote}</Text></View>)}
      <Text style={s.small}>ICT V3.1 · On-demand review · This suggestion is not saved as a grade.</Text>
    </View>}
    <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
      <View style={s.overlay}><View style={s.sheet}><Text style={s.title}>Grade {selectedGrade} ICT concepts</Text><TextInput accessibilityLabel="Search ICT concepts" placeholder="Search concepts" value={query} onChangeText={setQuery} style={s.search}/><ScrollView keyboardShouldPersistTaps="handled">{concepts.filter(c => c.grade === selectedGrade && c.name.toLowerCase().includes(query.toLowerCase())).map(c => <TouchableOpacity key={c.id} accessibilityRole="button" onPress={() => {invalidate(); setConcept(c.id); setPicker(false);}} style={s.option}><Text style={s.body}>{c.name}</Text></TouchableOpacity>)}</ScrollView><TouchableOpacity onPress={() => setPicker(false)} accessibilityRole="button" style={s.button}><Text>Close</Text></TouchableOpacity></View></View>
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
