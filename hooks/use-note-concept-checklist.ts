import { useCallback, useEffect, useMemo, useState } from "react";
import { scienceCoverageApi } from "@/api/scienceCoverageAPI";
import { historyCoverageApi } from "@/api/historyCoverageAPI";
import { buildHistoryChecklist, buildScienceChecklist, sortChecklist } from "@/utils/noteConceptChecklist";

/** Read existing note-bound results only. No catalog requests, invented scope,
 * implicit model runs, or changes to the student's text, score or decisions. */
export function useNoteConceptChecklist({noteId,subject,text,automatic,revision}: {
  noteId:string; subject:string; text:string; automatic:unknown; revision:string;
}) {
  const science = /^science$/i.test(subject.trim()), history = /^history$/i.test(subject.trim());
  const [snapshot,setSnapshot] = useState<{key:string;data:unknown}|null>(null);
  const [pending,setPending] = useState(false), [unavailable,setUnavailable] = useState(false);
  const [refresh,setRefresh] = useState(0);
  const key = JSON.stringify([noteId,revision,text,subject]);
  useEffect(() => {
    setSnapshot(null);setUnavailable(false);setPending(false);
    if (!science && !history) return;
    const controller = new AbortController(); let stopped = false;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const until=Date.now()+125000;
    async function load() {
      try {
        const data = science ? await scienceCoverageApi.saved(noteId,controller.signal) : await historyCoverageApi.saved(noteId,controller.signal);
        if (stopped) return;
        setSnapshot({key,data});setPending(data.state === "running");
        if (data.state === "running") {
          if (Date.now()<until) timer=setTimeout(load,2500);
          else {setPending(false);setUnavailable(true);}
        }
      } catch {if (!stopped) {setPending(false);setUnavailable(true);}}
    }
    void load();return () => {stopped=true;controller.abort();if(timer)clearTimeout(timer);};
  },[key,noteId,science,history,refresh]);
  const saved=snapshot?.key===key ? snapshot.data : undefined;
  const concepts=useMemo(() => sortChecklist(science ? buildScienceChecklist(automatic,saved,text) :
    history ? buildHistoryChecklist(saved,text) : []),[science,history,automatic,saved,text]);
  return {concepts,pending,unavailable,refresh:useCallback(() => setRefresh(n=>n+1),[])};
}
