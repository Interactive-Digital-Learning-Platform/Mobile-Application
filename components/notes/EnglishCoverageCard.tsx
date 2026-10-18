import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Brain, ChevronDown, ChevronUp } from "lucide-react-native";
import { scienceModelStatus, savedScienceVersion, ScienceCheckAction } from "@/utils/scienceModelStatus";
import { colors } from "@/constants/colors";

const labels={present:"Suggested complete",partial:"Partial coverage",missing:"Not found in this text"};

/** Read-only model suggestions; no score is presented as a correctness probability. */
export default function EnglishCoverageCard({check, actions = {}}:{check:unknown; actions?:Partial<Record<ScienceCheckAction,()=>void>>}) {
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const presentation=scienceModelStatus(check);
  if(presentation.kind==="notice") {
    const actionKey=actions[presentation.action]?presentation.action:actions.coverage?"coverage":undefined;
    const action=actionKey?actions[actionKey]:undefined;
    const actionLabels={lesson:"Check lesson details",photos:"Review note photos",text:"Review extracted text",coverage:"View note coverage"};
    return <View style={styles.card}>
      <View style={styles.heading}><Brain size={21} color={colors.primary}/><Text style={styles.title}>Trained Science model</Text></View>
      <Text style={styles.noticeTitle}>{presentation.title}</Text>
      <Text style={styles.body}>{presentation.message}</Text>
      <Text style={styles.footer}>The coverage score below comes from the lesson checker. Trained-model suggestions are separate.</Text>
      {action&&<TouchableOpacity accessibilityRole="button" onPress={action} style={styles.toggle}>
        <Text style={styles.toggleText}>{actionLabels[actionKey!]}</Text>
      </TouchableOpacity>}
    </View>;
  }
  const data=presentation.check;
  return <View style={styles.card}>
    <View style={styles.heading}><Brain size={21} color={colors.primary}/><Text style={styles.title}>Trained model suggestions</Text></View>
      <Text style={styles.body}>These describe coverage in the submitted text. Check each explanation: incorrect statements can still match.</Text>
      {data.suggestions.map(({conceptId,conceptName,prediction})=>{
        const open=!!expanded[conceptId];
        const label=prediction.suggestedStatus?labels[prediction.suggestedStatus]:"Needs review";
        return <View key={conceptId} style={styles.concept}>
          <Text style={styles.conceptName}>{conceptName}</Text>
          <View style={[styles.badge,prediction.suggestedStatus==="present"?styles.complete:styles.attention]}><Text style={styles.badgeText}>{label}</Text></View>
          {prediction.completeSuggestionWithheld&&<Text style={styles.body}>The complete suggestion was withheld because required evidence was incomplete or a conflict was flagged.</Text>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${open?"Hide":"Show"} evidence for ${conceptName}`} accessibilityState={{expanded:open}} onPress={()=>setExpanded(p=>({...p,[conceptId]:!open}))} style={styles.toggle}>
            <Text style={styles.toggleText}>{open?"Hide evidence":"Check evidence"}</Text>{open?<ChevronUp size={17} color={colors.primary}/>:<ChevronDown size={17} color={colors.primary}/>}
          </TouchableOpacity>
          {open&&<View>{prediction.evidence.points.map(point=><View key={point.pointId} style={styles.point}>
            <Text style={styles.requirement}>{point.requirement}</Text>
            <Text style={styles.muted}>{point.lexicalCoverage===1?"Candidate evidence — check its meaning":"Evidence incomplete"}</Text>
            <Text style={styles.quote}>{point.candidateEvidence||"No matching passage found. Check the original note before concluding the idea is absent."}</Text>
          </View>)}
          {prediction.evidence.concerns.map((concern,i)=><Text key={i} style={styles.concern}>Check possible conflict: {concern.quote}</Text>)}
          </View>}
        </View>;
      })}
      <Text style={styles.footer}>English Science · Model {savedScienceVersion(data.modelVersion)} · Review required</Text>
    <Text style={styles.footer}>Completeness describes each concept above. Your overall note score checks the whole lesson.</Text>
  </View>;
}
const styles=StyleSheet.create({
  card:{backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#FED7AA",borderRadius:20,padding:18,marginHorizontal:16,marginTop:12},
  heading:{flexDirection:"row",alignItems:"center",gap:9,marginBottom:10},title:{fontSize:16,fontWeight:"700",color:"#1E293B",flex:1},
  noticeTitle:{fontSize:14,fontWeight:"700",color:"#9A3412",marginBottom:6},
  body:{fontSize:13,color:"#64748B",lineHeight:20},concept:{borderTopWidth:1,borderTopColor:"#EEF0F6",paddingTop:14,marginTop:14},
  conceptName:{fontSize:15,fontWeight:"600",color:"#1E293B",marginBottom:8},badge:{alignSelf:"flex-start",borderRadius:7,paddingHorizontal:10,paddingVertical:5,marginBottom:8},
  complete:{backgroundColor:"#DCFCE7"},attention:{backgroundColor:"#FEF3C7"},badgeText:{fontSize:12,fontWeight:"600",color:"#334155"},
  toggle:{flexDirection:"row",alignItems:"center",gap:6,paddingVertical:8},toggleText:{fontSize:13,fontWeight:"600",color:colors.primary},
  point:{paddingVertical:10},requirement:{fontSize:13,fontWeight:"600",color:"#334155",lineHeight:19},muted:{fontSize:11,color:"#64748B",marginTop:5},
  quote:{fontSize:13,lineHeight:20,color:"#475569",backgroundColor:"#F8FAFC",padding:11,marginTop:7,borderRadius:7},
  concern:{fontSize:13,lineHeight:20,color:"#92400E",backgroundColor:"#FFFBEB",padding:10,marginTop:8,borderRadius:7},
  footer:{fontSize:11,color:"#64748B",marginTop:14},
});
