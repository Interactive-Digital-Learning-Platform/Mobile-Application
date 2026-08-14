# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Expo Router (React Native) mobile client for an interactive digital learning platform. It talks to a set of backend microservices through a single API gateway (assistant/chat, notes, quiz, PDF processing) and uses Clerk for authentication.

## Commands

- `npm run start` (or `npx expo start`) — start the Metro dev server
- `npm run android` / `npm run ios` / `npm run web` — start for a specific platform
- `npm run lint` — run `expo lint` (ESLint via `eslint.config.js`, extends `eslint-config-expo`)
- `npm run reset-project` — moves the starter `app/` code to `app-example/` and creates a blank `app/` (one-way, from `create-expo-app`; not part of normal day-to-day work)

There is no test runner configured in this project.

### Environment

Requires a `.env` (see `.env.example`) with:
- `EXPO_PUBLIC_API_GATEWAY_URL` — base URL of the backend API gateway. On a physical device/simulator this must be your computer's LAN IP (not `localhost`), or requests will fail with `Network Error`.
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key; `ClerkProviderCom` throws at startup if missing.

## Architecture

### Routing (Expo Router, file-based, `app/`)

- `app/index.tsx` — entry redirect: waits on Clerk's `isLoaded`, then routes to `/(tabs)/ai` if signed in, else `/(auth)/sign-in`.
- `app/(auth)/` — sign-in / sign-up / verify-email stack, unauthenticated.
- `app/(tabs)/` — main authenticated app, a bottom `Tabs` navigator with five screens: `ai` (chat), `quiz`, `notes` (its own nested `Stack` with `[id]`, `upload`, `material/[type]`), `lab`, `profile`.
- `app/(main)/` and `app/(onboarding)/` — currently thin `Slot` wrappers (scaffolded, not yet built out).
- Root `app/_layout.tsx` wraps everything in `KeyboardProvider` → `QueryClientProviderCom` → `ClerkProviderCom`, loads custom fonts (`Author-*`), and holds the global `Toast` host.

### API layer

- `api/apiClients.ts` is the single source of truth for backend base URLs. `EXPO_PUBLIC_API_GATEWAY_URL` is the gateway root; per-service axios clients (`assistantClient`, `notesClient`, `notesAssetsClient`, `quizClient`, `pdfClient`) are built from `SERVICE_URLS`, each service mounted at its own path behind the gateway (e.g. notes service adds its own `/api` prefix on top of the gateway's `/api/notes`). When adding a new backend service, add its URL here rather than constructing URLs ad hoc in feature code.
- Feature API modules (`api/chatAPI.ts`, `api/notesAPI.ts`) wrap the relevant client with typed request functions and parse responses through Zod schemas from `schemas/`.
- Chat streaming (`streamMessage` in `api/chatAPI.ts`) uses `react-native-sse` (`EventSource`) to POST to `/conversations/:id/messages/stream` and consume server-sent `token` / `done` / `error` events, validated per-event against `schemas/chatSchemas.ts`'s `sseEventSchema`. It resolves/rejects exactly once (guarded by a `completed` flag) and supports cancellation via an `AbortSignal`.

### Chat feature (`app/(tabs)/ai`, `hooks/use-chat.ts`, `components/chat/`, `components/AIChat.tsx`, `components/Message.tsx`)

- `hooks/use-chat.ts` (`useChat`) is the central state machine for the assistant chat: owns the message list, creates a conversation lazily on first send, streams the assistant reply token-by-token into an optimistic local message (`local-assistant-<timestamp>` id), and reconciles it with the server message id on `done`. Message history is fetched via React Query (`useQuery(["ai-messages", conversationID])`); pagination uses `has_more`/`next_cursor` from the backend.
- Local vs server identity: chat messages always carry a `localID` (used for React state updates/reconciliation) separate from the eventual `serverID`/`id` returned by the backend — don't conflate them when touching this code.
- `components/chat/` holds conversation-history UI (sidebar, list items) that lists/switches between past conversations, distinct from the live message thread rendered by `components/Message.tsx` / `components/AIChat.tsx`.

### Validation and types

- Request/response shapes for network boundaries are defined as Zod schemas in `schemas/*Schemas.ts` and parsed at the API layer (not just typed) — follow this pattern for new endpoints rather than trusting `response.data` unchecked.
- Shared non-schema types (component props, hook return shapes, etc.) live in `types/chatModuleTypes.ts`.

### Styling

- NativeWind (Tailwind for React Native) via `global.css` + `tailwind.config.js`; custom font families are the `Author-*` weights registered in `app/_layout.tsx` and exposed as Tailwind font families (`alight`, `aregular`, `amedium`, `abold`, `asemibold`, etc.).
- Some components/screens still use `StyleSheet.create` directly (e.g. `app/index.tsx`) alongside NativeWind classes elsewhere — match whichever convention the file you're editing already uses.
- Shared design tokens (icons, images, colors, quick actions) live under `constants/`.

### Path aliases

`@/*` maps to the repo root (`tsconfig.json`), e.g. `@/api/apiClients`, `@/schemas/chatSchemas`, `@/components/...`.
