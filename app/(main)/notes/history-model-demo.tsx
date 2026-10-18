import React, {useState} from 'react';
import {ScrollView, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import HistoryCoverageCard from '@/components/notes/HistoryCoverageCard';
import examples from '@/assets/data/historyCoverageDemoExamples.json';

export default function HistoryModelDemo() {
  const router = useRouter(); const [index, setIndex] = useState(0);
  const [sampleVersion, setSampleVersion] = useState(0);
  const sample = examples.samples[index];
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <TouchableOpacity accessibilityRole="button" onPress={() => router.back()}><Text style={s.back}>‹ Back</Text></TouchableOpacity>
    <Text style={s.title}>History model in the app</Text>
    <Text style={s.body}>These synthetic English notes use the same review card as uploaded History notes. Each check calls our trained model through the note service. These examples do not test handwriting recognition.</Text>
    <View style={s.row}>{examples.samples.map((item, i) => <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityState={{selected: i === index}} onPress={() => {setIndex(i); setSampleVersion(n => n + 1);}} style={[s.choice, i === index && s.selected]}><Text>{item.title}</Text></TouchableOpacity>)}</View>
    <HistoryCoverageCard key={sampleVersion} text={sample.text} grade={sample.grade as 10 | 11} initialConceptId={sample.conceptId}/>
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({safe: {flex: 1, backgroundColor: '#F8FAFC'}, content: {padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center'},
  back: {color: '#4F46E5', fontSize: 16, marginBottom: 20}, title: {fontSize: 26, fontWeight: '700', color: '#0F172A', marginBottom: 12},
  body: {fontSize: 14, lineHeight: 22, color: '#64748B'}, row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 20},
  choice: {padding: 11, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 9, backgroundColor: '#fff'}, selected: {backgroundColor: '#E0E7FF', borderColor: '#6366F1'}});
