import { SERVICE_URLS } from "@/api/apiClients";
import { battleWsInboundEventSchema } from "@/schemas/battleWsSchemas";
import { BattleWsInboundEvent, BattleWsOutboundMessage } from "@/types/battleWsTypes";

// Native WS, unlike chatAPI.ts's streamMessage (SSE, one-directional,
// resolve-once): a battle match socket is long-lived and bidirectional, so
// this returns a live handle immediately instead of a Promise that settles
// once. The caller (hooks/use-battle-match.ts) owns the connection's
// lifecycle and reconnection policy.

export interface BattleSocketCallbacks {
  onEvent: (event: BattleWsInboundEvent) => void;
  onOpen?: () => void;
  onError?: (error: unknown) => void;
  onClose?: (code: number, reason: string) => void;
}

export interface BattleSocketHandle {
  // Returns whether the message was actually written to the socket (i.e.
  // the socket was open) -- not a server ack. Callers that need to detect
  // an immediate "couldn't send" failure (e.g. queue.tsx's ready button)
  // use this; queued server-side confirmation still arrives as its own
  // inbound event (e.g. "player_ready").
  sendReady: () => boolean;
  sendAnswer: (questionId: number, selectedOption: string) => boolean;
  sendForfeit: () => void;
  close: () => void;
}

function buildBattleWsUrl(matchId: number, token: string): string {
  // SERVICE_URLS.battle is http(s)://<gateway>/api/battle — swap scheme to
  // ws(s) and append the same /api/v1 prefix battleClient uses, since nginx
  // proxies the WS upgrade through the identical gateway path.
  const wsBase = SERVICE_URLS.battle.replace(/^http/, "ws");
  return `${wsBase}/api/v1/battle/match/${matchId}/ws?token=${encodeURIComponent(token)}`;
}

export function connectBattleSocket(
  matchId: number,
  token: string,
  callbacks: BattleSocketCallbacks
): BattleSocketHandle {
  const ws = new WebSocket(buildBattleWsUrl(matchId, token));

  const send = (message: BattleWsOutboundMessage): boolean => {
    if (ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(message));
    return true;
  };

  ws.onopen = () => {
    callbacks.onOpen?.();
  };

  ws.onmessage = (event) => {
    try {
      const parsed = battleWsInboundEventSchema.parse(JSON.parse(event.data as string));
      callbacks.onEvent(parsed as BattleWsInboundEvent);
    } catch (error) {
      console.warn("[BattleWS] Parse error", error, "raw:", event.data);
    }
  };

  ws.onerror = (event) => {
    callbacks.onError?.(event);
  };

  ws.onclose = (event) => {
    callbacks.onClose?.(event.code, event.reason);
  };

  return {
    sendReady: () => send({ type: "ready" }),
    sendAnswer: (questionId, selectedOption) =>
      send({ type: "answer", question_id: questionId, selected_option: selectedOption }),
    sendForfeit: () => send({ type: "forfeit" }),
    close: () => ws.close(),
  };
}
