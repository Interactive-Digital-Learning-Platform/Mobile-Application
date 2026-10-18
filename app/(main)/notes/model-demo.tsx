import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import EnglishCoverageCard from "@/components/notes/EnglishCoverageCard";
import demo from "@/assets/data/englishCoverageDemo.json";

/** Public synthetic examples rendered by the same card used on uploaded notes. */
export default function EnglishModelDemo(){
 const [index,setIndex]=useState(0);const router=useRouter();const sample=demo.samples[index];
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
  <TouchableOpacity style={styles.back} onPress={()=>router.back()} accessibilityRole="button"><ChevronLeft size={19} color="#334155"/><Text style={styles.backText}>Back</Text></TouchableOpacity>
  <Text style={styles.eyebrow}>ENGLISH NOTE MODEL · DEMO</Text><Text style={styles.title}>See the trained model in use</Text>
  <Text style={styles.subtitle}>Saved synthetic examples generated with Science v3.1 on {demo.generatedAt.slice(0,10)}. Selecting an example shows its saved result. Handwriting recognition is not tested here.</Text>
  <View style={styles.choices}>{demo.samples.map((s,i)=><TouchableOpacity key={s.title} style={[styles.choice,i===index&&styles.selected]} onPress={()=>setIndex(i)} accessibilityRole="button" accessibilityState={{selected:i===index}}><Text style={[styles.choiceText,i===index&&styles.selectedText]}>{s.title}</Text></TouchableOpacity>)}</View>
  <View style={styles.note}><Text style={styles.noteTitle}>Submitted text</Text><Text style={styles.noteText}>{sample.noteText}</Text></View>
  <EnglishCoverageCard key={index} check={sample.check}/>
  <Text style={styles.footer}>The same model check runs automatically on new supported English uploads after OCR and lesson identification.</Text>
 </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#F8F9FB"},content:{padding:20,paddingBottom:45,maxWidth:800,width:"100%",alignSelf:"center"},
 back:{flexDirection:"row",alignItems:"center",gap:5,paddingVertical:10,marginBottom:15},backText:{fontSize:14,color:"#334155"},
 eyebrow:{fontSize:11,fontWeight:"700",letterSpacing:1.3,color:"#4F46E5"},title:{fontSize:27,fontWeight:"700",color:"#0F172A",marginTop:10},
 subtitle:{fontSize:14,lineHeight:22,color:"#64748B",marginTop:12},choices:{flexDirection:"row",flexWrap:"wrap",gap:8,marginVertical:20},
 choice:{borderWidth:1,borderColor:"#CBD5E1",borderRadius:10,padding:11,backgroundColor:"#FFFFFF"},selected:{backgroundColor:"#4F46E5",borderColor:"#4F46E5"},
 choiceText:{fontSize:12,color:"#475569",fontWeight:"600"},selectedText:{color:"#FFFFFF"},
 note:{backgroundColor:"#EEF2FF",borderRadius:15,padding:17,marginBottom:20},noteTitle:{fontSize:14,fontWeight:"600",color:"#334155",marginBottom:8},
 noteText:{fontSize:14,lineHeight:23,color:"#334155"},footer:{fontSize:12,lineHeight:19,color:"#64748B"},
});
