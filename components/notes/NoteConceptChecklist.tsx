import React, {useState} from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/AppText";
import {ArrowUpRight,Check,ChevronRight,ClipboardCheck,Info,Plus,X} from "lucide-react-native";
import {colors} from "@/constants/colors";
import {ChecklistConcept,checklistNextSteps} from "@/utils/noteConceptChecklist";
import {savedScienceVersion} from "@/utils/scienceModelStatus";

const statuses={
  present:{label:"Complete",color:"#15803D",background:"#F0FDF4"},
  partial:{label:"Partial",color:"#A16207",background:"#FFFBEB"},
  missing:{label:"Missing",color:"#C2410C",background:"#FFF7ED"},
  review:{label:"Check needed",color:"#A16207",background:"#FFFBEB"},
};

export default function NoteConceptChecklist({concepts,pending,onStudy,studyLabel,onReviewText,totalConcepts}: {
  concepts:ChecklistConcept[];pending:boolean;onStudy:(concept:ChecklistConcept)=>void;
  studyLabel:(concept:ChecklistConcept)=>string;onReviewText:()=>void;totalConcepts:number;
}) {
  const [selected,setSelected]=useState<string|null>(null),[all,setAll]=useState(false),[about,setAbout]=useState(false);
  const concept=concepts.find(c=>c.id===selected);
  if (!concepts.length && !pending) return null;
  const shown=all?concepts:concepts.slice(0,3);
  return <View style={s.card}>
    <View style={s.header}>
      <View style={s.headingIcon}><ClipboardCheck size={20} color={colors.primary}/></View>
      <View style={s.heading}><Text style={s.title}>Concept checklist</Text><Text style={s.subtitle}>What’s covered, and what to add next</Text></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="About concept checks" onPress={()=>setAbout(true)} style={s.iconButton}><Info size={19} color="#64748B"/></TouchableOpacity>
    </View>
    {pending&&<View style={s.pending}><ActivityIndicator size="small" color={colors.primary}/><Text style={s.caption}>A saved check is finishing. You can keep using your notes.</Text></View>}
    {shown.map(item=>{
      const status=statuses[item.status],next=checklistNextSteps(item);
      return <View key={item.id} style={s.item}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${item.name}: ${status.label}. View details`} onPress={()=>setSelected(item.id)} style={s.itemHeading}>
          <View style={s.itemNameWrap}><Text style={s.itemName}>{item.name}</Text></View>
          <View style={[s.badge,{backgroundColor:status.background}]}><Text style={[s.badgeText,{color:status.color}]}>{status.label}</Text></View>
        </TouchableOpacity>
        {next.kind==="complete"?<Text style={s.description}>The required points were found. Keep this topic fresh with revision.</Text>:<>
          <Text style={s.nextTitle}>{next.title}</Text>
          {next.points.slice(0,2).map((text,i)=><View key={i} style={s.todo}><View style={s.todoDot}/><Text style={s.todoText} numberOfLines={2}>{text}</Text></View>)}
        </>}
        <View style={s.actions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${item.name} checklist`} onPress={()=>setSelected(item.id)} style={s.detailButton}><Text style={s.detailText}>{item.status==="present"?"See what was found":"View checklist"}</Text><ChevronRight size={15} color="#64748B"/></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${studyLabel(item)}: ${item.name}`} onPress={()=>onStudy(item)} style={s.studyButton}><Text style={s.studyText}>{studyLabel(item)}</Text><ArrowUpRight size={14} color={colors.primary}/></TouchableOpacity>
        </View>
      </View>;
    })}
    {concepts.length>3&&<TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:all}} onPress={()=>setAll(v=>!v)} style={s.more}><Text style={s.studyText}>{all?"Show fewer concepts":`See all ${concepts.length} checked concepts`}</Text></TouchableOpacity>}
    {!!concepts.length&&<Text style={s.scope}>{concepts.length} detailed {concepts.length===1?"concept check":"concept checks"}{totalConcepts>concepts.length?` · Your lesson overview includes ${totalConcepts} concepts`:""}</Text>}

    <Modal visible={!!concept} transparent animationType="slide" onRequestClose={()=>setSelected(null)}>
      <View style={s.overlay}><View style={s.sheet}>
        <View style={s.sheetHeader}><Text style={s.sheetTitle}>{concept?.name}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close concept checklist" onPress={()=>setSelected(null)} style={s.iconButton}><X size={22} color="#475569"/></TouchableOpacity></View>
        {concept&&<><ScrollView style={{flexShrink:1}} contentContainerStyle={s.sheetBody}>
          <View style={[s.badge,{backgroundColor:statuses[concept.status].background,alignSelf:"flex-start"}]}><Text style={[s.badgeText,{color:statuses[concept.status].color}]}>{statuses[concept.status].label}</Text></View>
          <Text style={s.description}>{concept.status==="present"?"These passages support the concept in your upload. Check them against your original notes.":"Use these ideas to improve your notes, then review the topic with your study tools."}</Text>
          {concept.concerns.map((text,i)=><View key={i} style={s.concern}><Text style={s.nextTitle}>Check this explanation</Text><Text selectable style={s.todoText}>{text}</Text></View>)}
          {concept.points.map(point=><View key={point.id} style={s.point}>
            <View style={s.pointHeading}><View style={[s.pointIcon,{backgroundColor:point.state==="found"?"#F0FDF4":"#FFF7ED"}]}>{point.state==="found"?<Check size={14} color="#15803D"/>:<Plus size={14} color={colors.primary}/>}</View><Text style={s.pointText}>{point.text}</Text></View>
            <Text style={s.pointLabel}>{point.state==="found"?"Found in your notes":point.state==="add"?"Add or clarify this point":"Review this point"}</Text>
            {point.quote?<Text selectable style={s.quote}>{point.quote}</Text>:<Text style={s.caption}>No supporting passage was found. Check the original photo before adding more detail.</Text>}
          </View>)}
          <TouchableOpacity accessibilityRole="button" onPress={()=>{setSelected(null);setTimeout(onReviewText,200);}} style={s.more}><Text style={s.studyText}>View text read from your photos</Text></TouchableOpacity>
          <Text style={s.scope}>This describes your uploaded notes, not everything you know.</Text>
        </ScrollView><View style={s.sheetFooter}><TouchableOpacity accessibilityRole="button" onPress={()=>{setSelected(null);setTimeout(()=>onStudy(concept),200);}} style={s.primary}><Text style={s.primaryText}>{studyLabel(concept)}</Text><ArrowUpRight size={17} color="#FFFFFF"/></TouchableOpacity></View></>}
      </View></View>
    </Modal>
    <Modal visible={about} transparent animationType="fade" onRequestClose={()=>setAbout(false)}>
      <View style={s.overlay}><View style={[s.sheet,{maxWidth:480}]}><View style={s.sheetHeader}><Text style={s.sheetTitle}>About this checklist</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close checklist information" onPress={()=>setAbout(false)} style={s.iconButton}><X size={22} color="#475569"/></TouchableOpacity></View><ScrollView style={{flexShrink:1}} contentContainerStyle={s.sheetBody}>
        <Text style={s.description}>Our trained concept checker compares the text in this upload with a short list of required ideas. Check its suggestions against your notes; matching words can still need a correction.</Text>
        <Text style={s.description}>It covers a limited set of English Science and History concepts. Your lesson score includes other concepts and is kept separately. A check made on edited practice text is not used as the result for your original upload.</Text>
        {concepts.map(c=><View key={c.id} style={s.point}><Text style={s.pointText}>{c.name}</Text><Text style={s.caption}>Saved check · {savedScienceVersion(c.version)}</Text></View>)}
      </ScrollView></View></View>
    </Modal>
  </View>;
}

const s=StyleSheet.create({
  card:{backgroundColor:"#FFFFFF",borderRadius:22,borderWidth:1,borderColor:"#EAEFF4",marginHorizontal:20,marginTop:16,padding:18},
  header:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:4},headingIcon:{width:39,height:39,borderRadius:13,backgroundColor:"#FFF4EB",alignItems:"center",justifyContent:"center"},
  heading:{flex:1},title:{fontSize:16,fontWeight:"800",color:"#0F172A"},subtitle:{fontSize:12,lineHeight:18,color:"#64748B",marginTop:3},iconButton:{padding:10,alignItems:"center",justifyContent:"center",minWidth:42,minHeight:42},
  item:{paddingTop:16,marginTop:12,borderTopWidth:1,borderColor:"#F1F5F9"},itemHeading:{flexDirection:"row",alignItems:"flex-start",gap:10},itemNameWrap:{flex:1},itemName:{fontSize:15,fontWeight:"700",lineHeight:22,color:"#1E293B"},
  badge:{borderRadius:7,paddingHorizontal:9,paddingVertical:5},badgeText:{fontSize:11,fontWeight:"700"},description:{fontSize:13,lineHeight:21,color:"#64748B",marginTop:10},nextTitle:{fontSize:12,fontWeight:"700",color:"#9A3412",marginTop:10,marginBottom:5},
  todo:{flexDirection:"row",gap:8,alignItems:"flex-start",marginTop:5},todoDot:{width:4,height:4,borderRadius:2,backgroundColor:colors.primary,marginTop:8},todoText:{flexShrink:1,color:"#475569",fontSize:12,lineHeight:19},
  actions:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:12},detailButton:{flexDirection:"row",gap:3,alignItems:"center",paddingVertical:9},detailText:{fontSize:12,fontWeight:"600",color:"#64748B"},studyButton:{flexDirection:"row",gap:5,alignItems:"center",backgroundColor:"#FFF4EB",paddingHorizontal:12,paddingVertical:10,borderRadius:10},studyText:{fontSize:12,fontWeight:"700",color:colors.primary},
  scope:{fontSize:11,lineHeight:18,color:"#94A3B8",marginTop:14},pending:{flexDirection:"row",alignItems:"center",gap:9,marginVertical:12},caption:{flexShrink:1,fontSize:12,lineHeight:19,color:"#64748B"},more:{paddingVertical:14,alignItems:"center"},
  overlay:{flex:1,backgroundColor:"rgba(15,23,42,.38)",justifyContent:"flex-end",alignItems:"center"},sheet:{backgroundColor:"#FFFFFF",width:"100%",maxWidth:620,maxHeight:"88%",borderTopLeftRadius:24,borderTopRightRadius:24,overflow:"hidden"},sheetHeader:{flexDirection:"row",alignItems:"center",gap:10,paddingLeft:22,paddingRight:10,paddingVertical:12,borderBottomWidth:1,borderColor:"#F1F5F9"},sheetTitle:{flex:1,fontSize:18,fontWeight:"800",lineHeight:25,color:"#0F172A"},sheetBody:{padding:22,paddingBottom:28},sheetFooter:{padding:18,borderTopWidth:1,borderColor:"#F1F5F9"},
  point:{paddingVertical:15,borderBottomWidth:1,borderColor:"#F1F5F9"},pointHeading:{flexDirection:"row",alignItems:"flex-start",gap:9},pointIcon:{width:25,height:25,borderRadius:8,alignItems:"center",justifyContent:"center"},pointText:{flex:1,fontSize:13,lineHeight:21,fontWeight:"600",color:"#334155"},pointLabel:{fontSize:11,color:"#64748B",marginTop:8,marginBottom:6},quote:{fontSize:13,lineHeight:21,color:"#475569",backgroundColor:"#F8FAFC",borderRadius:10,padding:12},concern:{padding:12,backgroundColor:"#FFFBEB",borderRadius:12,marginTop:14},primary:{backgroundColor:colors.primary,borderRadius:13,padding:15,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},primaryText:{fontSize:14,fontWeight:"700",color:"#FFFFFF"},
});
