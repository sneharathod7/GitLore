/**
 * Persist Overview knowledge-graph layout and chat transcript per repo in localStorage
 * so refresh / navigation does not clear the UI or force repeat Gemini chat turns.
 */

import type { KnowledgeLayoutResponse, ChatGraphStatusResponse } from "./gitloreApi";

const STORAGE_PREFIX = "gitlore:overview:";
const LAYOUT_VERSION = 1;
const CHAT_VERSION = 1;
const MAX_CACHED_MESSAGES = 100;

function repoStorageId(owner: string, name: string): string {
  return `${owner.trim().toLowerCase()}/${name.trim().toLowerCase()}`;
}

function layoutStorageKey(owner: string, name: string): string {
  return `${STORAGE_PREFIX}layout:v${LAYOUT_VERSION}:${repoStorageId(owner, name)}`;
}

function chatStorageKey(owner: string, name: string): string {
  return `${STORAGE_PREFIX}chat:v${CHAT_VERSION}:${repoStorageId(owner, name)}`;
}

type LayoutEnvelope = {
  savedAt: number;
  layout: KnowledgeLayoutResponse;
};

export function loadKnowledgeLayoutCache(
  owner: string,
  name: string
): KnowledgeLayoutResponse | null {
  try {
    const raw = localStorage.getItem(layoutStorageKey(owner, name));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LayoutEnvelope;
    if (!parsed?.layout?.nodes || !parsed?.layout?.viewBox) return null;
    return parsed.layout;
  } catch {
    return null;
  }
}

export function saveKnowledgeLayoutCache(
  owner: string,
  name: string,
  layout: KnowledgeLayoutResponse
): void {
  try {
    const env: LayoutEnvelope = { savedAt: Date.now(), layout };
    localStorage.setItem(layoutStorageKey(owner, name), JSON.stringify(env));
  } catch {
    /* quota / private mode */
  }
}

export function clearKnowledgeLayoutCache(owner: string, name: string): void {
  try {
    localStorage.removeItem(layoutStorageKey(owner, name));
  } catch {
    /* ignore */
  }
}

export type CachedChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    pr_number: number;
    pr_url: string;
    title: string;
    type: string;
    score?: number;
  }>;
  searchTier?: string;
  nodesUsed?: number;
  synthesis?: "none" | "gemini" | "fallback_no_key" | "fallback_error";
  model?: string;
};

type ChatEnvelope = {
  savedAt: number;
  messages: CachedChatMessage[];
  chatStatus: ChatGraphStatusResponse | null;
};

export function loadChatSessionCache(
  owner: string,
  name: string
): { messages: CachedChatMessage[]; chatStatus: ChatGraphStatusResponse | null } {
  try {
    const raw = localStorage.getItem(chatStorageKey(owner, name));
    if (!raw) return { messages: [], chatStatus: null };
    const parsed = JSON.parse(raw) as ChatEnvelope;
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.slice(-MAX_CACHED_MESSAGES)
      : [];
    return {
      messages,
      chatStatus: parsed.chatStatus ?? null,
    };
  } catch {
    return { messages: [], chatStatus: null };
  }
}

export function saveChatSessionCache(
  owner: string,
  name: string,
  data: { messages: CachedChatMessage[]; chatStatus: ChatGraphStatusResponse | null }
): void {
  try {
    const trimmed = data.messages.slice(-MAX_CACHED_MESSAGES);
    const env: ChatEnvelope = {
      savedAt: Date.now(),
      messages: trimmed,
      chatStatus: data.chatStatus,
    };
    localStorage.setItem(chatStorageKey(owner, name), JSON.stringify(env));
  } catch {
    /* quota */
  }
}

export function clearChatSessionCache(owner: string, name: string): void {
  try {
    localStorage.removeItem(chatStorageKey(owner, name));
  } catch {
    /* ignore */
  }
}
