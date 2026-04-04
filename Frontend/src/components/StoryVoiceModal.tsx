import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversation, useConversationClientTool } from "@elevenlabs/react";
import type { InsightNarrative } from "@/lib/gitloreApi";
import {
  fetchVoiceStatus,
  postVoiceTts,
  fetchAgentSession,
  postGeminiVoiceReply,
  type VoiceStatusResponse,
  type AgentSessionResponse,
} from "@/lib/gitloreApi";
import { narrativeSpeechBrief, narrativeAgentPrompt, narrativeSummaryText } from "@/lib/storyVoice";

/** Must match the Client tool name configured on the ElevenLabs agent. */
const VOICE_CLIENT_TOOL = "gitlore_code_story_answer" as const;

type Props = {
  open: boolean;
  onClose: () => void;
  narrative: InsightNarrative;
  line: number | null;
  repoFull: string;
  filePath: string;
};

type TtsTransport = "none" | "loading" | "playing" | "paused" | "ended";

function formatTrackTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function StoryVoiceModal({ open, onClose, narrative, line, repoFull, filePath }: Props) {
  const [status, setStatus] = useState<VoiceStatusResponse | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [ttsErr, setTtsErr] = useState<string | null>(null);
  const [agentErr, setAgentErr] = useState<string | null>(null);
  const [agentPhase, setAgentPhase] = useState<"idle" | "connecting" | "live">("idle");
  const [ttsTransport, setTtsTransport] = useState<TtsTransport>("none");
  const [lastLocale, setLastLocale] = useState<"en" | "hi" | null>(null);
  const [spokenTokens, setSpokenTokens] = useState<string[]>([]);
  const [uiTime, setUiTime] = useState(0);
  const [uiDuration, setUiDuration] = useState(0);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const detachAudioUiRef = useRef<(() => void) | null>(null);

  const speechBrief = narrativeSpeechBrief(narrative);
  const agentPromptForVoice = useMemo(
    () =>
      `${narrativeAgentPrompt(narrative, { repoFull, filePath, line })}

## Voice conversation (English only)
You are on a live voice call with a developer about the story above.
- For simple greetings or thanks, reply briefly yourself without tools.
- For questions about this code line, pull requests, review discussion, decision, impact, timeline, or what the change does: you MUST call the client tool "${VOICE_CLIENT_TOOL}" with parameter user_question set to the user's question (their exact words when possible). When the tool returns text, say it out loud in clear spoken English—you may smooth phrasing slightly for speech but must not change facts.
- Never invent PR numbers, authors, or events that are not supported by the story context.
- If the tool returns an error, apologize once and ask them to try again.`,
    [narrative, repoFull, filePath, line]
  );

  const voiceCtxRef = useRef({ narrative, line, repoFull, filePath });
  voiceCtxRef.current = { narrative, line, repoFull, filePath };

  useConversationClientTool<{
    gitlore_code_story_answer: (p: { user_question: string }) => Promise<string>;
  }>(VOICE_CLIENT_TOOL, async ({ user_question }) => {
    const { narrative: n, line: ln, repoFull: rf, filePath: fp } = voiceCtxRef.current;
    const context_text = narrativeSummaryText(n, ln, rf, fp);
    try {
      const { answer } = await postGeminiVoiceReply({ user_question, context_text });
      return answer;
    } catch (e) {
      return e instanceof Error
        ? `Sorry, I could not get an answer: ${e.message}`
        : "Sorry, the answer service failed. Please try again.";
    }
  });

  const highlightCount = useMemo(() => {
    if (!spokenTokens.length || !uiDuration || uiDuration <= 0) return 0;
    const p = Math.min(1, Math.max(0, uiTime / uiDuration));
    return Math.min(spokenTokens.length, Math.ceil(p * spokenTokens.length));
  }, [spokenTokens, uiTime, uiDuration]);

  const disposeTts = useCallback(() => {
    detachAudioUiRef.current?.();
    detachAudioUiRef.current = null;
    const a = audioElRef.current;
    if (a) {
      a.onplay = null;
      a.onpause = null;
      a.onended = null;
      a.pause();
      a.src = "";
      audioElRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setTtsTransport("none");
    setLastLocale(null);
    setSpokenTokens([]);
    setUiTime(0);
    setUiDuration(0);
  }, []);

  const bindAudioUi = useCallback((audio: HTMLAudioElement) => {
    detachAudioUiRef.current?.();
    const onTime = () => setUiTime(audio.currentTime);
    const onMeta = () => {
      const d = audio.duration;
      setUiDuration(Number.isFinite(d) && d > 0 ? d : 0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    detachAudioUiRef.current = () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
    };
  }, []);

  const { startSession, endSession, status: convStatus } = useConversation({
    onConnect: () => {
      setAgentPhase("live");
      setAgentErr(null);
    },
    onDisconnect: () => {
      setAgentPhase("idle");
    },
    onError: (err) => {
      console.error("ElevenLabs conversation:", err);
      setAgentErr(typeof err === "string" ? err : "Voice agent connection failed.");
      setAgentPhase("idle");
    },
  });

  useEffect(() => {
    return () => {
      disposeTts();
      void endSession();
    };
  }, [disposeTts, endSession]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatusErr(null);
    void fetchVoiceStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "";
          if (/not authenticated|unauthorized/i.test(msg)) {
            setStatusErr("Sign in with GitHub to use ElevenLabs voice (session required).");
          } else {
            setStatusErr(msg ? `Voice status: ${msg}` : "Could not load voice configuration. Is the API running and VITE_API_ORIGIN correct?");
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      disposeTts();
      void endSession();
      setAgentPhase("idle");
      setTtsErr(null);
      setAgentErr(null);
    }
  }, [open, disposeTts, endSession]);

  const wirePlaybackState = useCallback((audio: HTMLAudioElement) => {
    audio.onplay = () => setTtsTransport("playing");
    audio.onpause = () => {
      const el = audioElRef.current;
      setTtsTransport(el?.ended ? "ended" : "paused");
    };
    audio.onended = () => setTtsTransport("ended");
  }, []);

  const generateAndPlay = useCallback(
    async (locale: "en" | "hi") => {
      setTtsErr(null);
      disposeTts();
      setTtsTransport("loading");
      setLastLocale(locale);
      try {
        const { blob, displayText } = await postVoiceTts(speechBrief, { locale });
        const tokens = displayText.trim().split(/\s+/).filter(Boolean);
        setSpokenTokens(tokens);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioElRef.current = audio;
        wirePlaybackState(audio);
        bindAudioUi(audio);
        await audio.play();
      } catch (e) {
        disposeTts();
        setTtsErr(e instanceof Error ? e.message : "Playback failed");
      }
    },
    [bindAudioUi, disposeTts, speechBrief, wirePlaybackState]
  );

  const stopTts = useCallback(() => {
    const a = audioElRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setUiTime(0);
    setTtsTransport("paused");
  }, []);

  const toggleMainPlay = useCallback(() => {
    const a = audioElRef.current;
    if (!a) return;
    if (a.ended) a.currentTime = 0;
    if (a.paused) void a.play().catch(() => setTtsErr("Could not play audio."));
    else a.pause();
  }, []);

  const startVoiceAgent = useCallback(async () => {
    setAgentErr(null);
    setAgentPhase("connecting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setAgentErr("Microphone permission is required for voice chat.");
      setAgentPhase("idle");
      return;
    }

    let session: AgentSessionResponse;
    try {
      session = await fetchAgentSession();
    } catch (e) {
      setAgentErr(e instanceof Error ? e.message : "Could not start agent session");
      setAgentPhase("idle");
      return;
    }

    const overrides = {
      agent: {
        prompt: { prompt: agentPromptForVoice },
        firstMessage:
          "Hi — I have the story for this line. Ask me anything about the change, the discussion, or the decision, and I'll pull a precise answer for you.",
        language: "en" as const,
      },
    };

    const region = session.serverLocation ?? status?.elevenlabsServerLocation ?? "us";

    try {
      if (session.mode === "webrtc" && session.conversationToken) {
        startSession({
          conversationToken: session.conversationToken,
          overrides,
          userId: repoFull.replace(/\//g, "_"),
          serverLocation: region,
        });
      } else if (session.mode === "public" && session.agentId) {
        startSession({
          agentId: session.agentId,
          overrides,
          userId: repoFull.replace(/\//g, "_"),
          serverLocation: region,
        });
      } else {
        setAgentErr("Invalid agent session response.");
        setAgentPhase("idle");
      }
    } catch (e) {
      setAgentErr(e instanceof Error ? e.message : "Failed to start voice session");
      setAgentPhase("idle");
    }
  }, [agentPromptForVoice, repoFull, startSession, status?.elevenlabsServerLocation]);

  const stopAgent = useCallback(() => {
    void endSession();
    setAgentPhase("idle");
  }, [endSession]);

  if (!open) return null;

  const ttsOk = status?.ttsReady;
  const ttsHiOk = status?.ttsHindiReady;
  const agentOk = status?.agentReady;
  const voiceChatGeminiOk = status?.voiceChatGeminiReady;
  const live = convStatus === "connected" || agentPhase === "live";

  const hasClip = ttsTransport !== "none" && ttsTransport !== "loading";
  const isPlaying = ttsTransport === "playing";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-voice-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-sm border border-gitlore-border bg-gitlore-surface shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gitlore-border px-5 py-4">
          <div>
            <h2 id="story-voice-title" className="font-heading text-lg font-semibold text-gitlore-text">
              Story &amp; voice
            </h2>
            <p className="mt-1 text-xs text-gitlore-text-secondary">
              Text below follows the audio (approximate sync). Close or Stop to silence playback.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              disposeTts();
              onClose();
            }}
            className="shrink-0 rounded-sm px-2 py-1 text-sm text-gitlore-text-secondary hover:bg-gitlore-border/30 hover:text-gitlore-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {statusErr && <p className="text-sm text-gitlore-error">{statusErr}</p>}

          <div className="min-h-[7rem] rounded-sm border border-gitlore-border bg-gitlore-code/60 p-4">
            {spokenTokens.length === 0 ? (
              <p className="font-body text-sm leading-relaxed text-gitlore-text-secondary">
                Choose <span className="text-gitlore-text">Listen in English</span> or{" "}
                <span className="text-gitlore-text">Listen in Hindi</span> to load narration. Words highlight as playback
                progresses.
              </p>
            ) : (
              <p className="font-body text-[15px] leading-relaxed">
                {spokenTokens.map((w, i) => (
                  <span key={`${i}-${w.slice(0, 8)}`}>
                    {i > 0 ? " " : null}
                    <span
                      className={`transition-colors duration-150 ${
                        i < highlightCount
                          ? "text-gitlore-accent font-medium"
                          : "text-gitlore-text-secondary/45"
                      }`}
                    >
                      {w}
                    </span>
                  </span>
                ))}
              </p>
            )}
          </div>

          {hasClip && (
            <div className="rounded-sm border border-gitlore-border bg-[#12121a] px-3 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleMainPlay}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gitlore-border bg-gitlore-surface text-gitlore-accent transition-colors hover:border-gitlore-accent/50 hover:bg-gitlore-accent/10"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 pl-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <input
                    type="range"
                    min={0}
                    max={uiDuration > 0 ? uiDuration : 1}
                    step={0.05}
                    value={uiDuration > 0 ? Math.min(uiTime, uiDuration) : 0}
                    disabled={!uiDuration}
                    onChange={(e) => {
                      const a = audioElRef.current;
                      const t = parseFloat(e.target.value);
                      if (a && Number.isFinite(t)) {
                        a.currentTime = t;
                        setUiTime(t);
                      }
                    }}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gitlore-border/50 accent-gitlore-accent disabled:cursor-not-allowed disabled:opacity-40 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gitlore-accent"
                  />
                  <div className="mt-1 flex justify-between font-code text-[10px] text-gitlore-text-secondary">
                    <span>{formatTrackTime(uiTime)}</span>
                    <span>{formatTrackTime(uiDuration)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={stopTts}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gitlore-border text-gitlore-text-secondary transition-colors hover:border-gitlore-text hover:text-gitlore-text"
                  aria-label="Stop"
                  title="Stop"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M6 6h12v12H6z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={!ttsOk || ttsTransport === "loading"}
              onClick={() => void generateAndPlay("en")}
              className="flex-1 min-w-[8rem] rounded-sm border border-gitlore-accent/40 bg-gitlore-accent/15 px-3 py-2.5 text-sm font-medium text-gitlore-accent transition-colors hover:bg-gitlore-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ttsTransport === "loading" && lastLocale === "en" ? "Preparing…" : "Listen in English"}
            </button>
            <button
              type="button"
              disabled={!ttsHiOk || ttsTransport === "loading"}
              onClick={() => void generateAndPlay("hi")}
              className="flex-1 min-w-[8rem] rounded-sm border border-gitlore-border px-3 py-2.5 text-sm font-medium text-gitlore-text transition-colors hover:border-gitlore-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
              title={
                !ttsHiOk
                  ? "Set ELEVENLABS_VOICE_ID_HI and GEMINI_API_KEY on the backend"
                  : "Translates the brief to Hindi, then TTS (free premade voice)"
              }
            >
              {ttsTransport === "loading" && lastLocale === "hi" ? "Preparing…" : "Listen in Hindi"}
            </button>
            {!live ? (
              <button
                type="button"
                disabled={!agentOk || agentPhase === "connecting"}
                onClick={() => void startVoiceAgent()}
                className="flex-1 min-w-[8rem] rounded-sm border border-gitlore-border px-3 py-2.5 text-sm font-medium text-gitlore-text transition-colors hover:border-gitlore-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {agentPhase === "connecting" ? "Connecting…" : "Talk to voice agent"}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopAgent}
                className="flex-1 min-w-[8rem] rounded-sm border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
              >
                End voice chat
              </button>
            )}
          </div>

          {ttsTransport === "loading" && (
            <p className="text-center text-[11px] text-gitlore-text-secondary">Generating audio…</p>
          )}

          {ttsErr && <p className="text-xs text-gitlore-error">{ttsErr}</p>}
          {agentErr && <p className="text-xs text-gitlore-error">{agentErr}</p>}

          {live && (
            <p className="text-xs text-gitlore-text-secondary">
              Voice agent uses your microphone (no karaoke for live agent). Use “End voice chat” when finished.
            </p>
          )}

          {agentOk && !live && (
            <p className="text-[11px] leading-relaxed text-gitlore-text-secondary">
              <span className="font-medium text-gitlore-text/80">Voice Q&amp;A:</span> In{" "}
              <a
                href="https://elevenlabs.io/app/agents"
                target="_blank"
                rel="noreferrer"
                className="text-gitlore-accent underline-offset-2 hover:underline"
              >
                ElevenLabs → your agent → Tools
              </a>
              , add a <span className="font-code text-gitlore-text/90">Client</span> tool{" "}
              <span className="font-code">{VOICE_CLIENT_TOOL}</span> with one string field{" "}
              <span className="font-code">user_question</span>. The app calls Gemini on your API (
              <span className="font-code">GEMINI_API_KEY</span>) when that tool runs. JSON schema is in{" "}
              <span className="font-code">GitLore/Backend/.env.example</span>.
            </p>
          )}

          {agentOk && voiceChatGeminiOk === false && (
            <p className="text-xs text-amber-400/90">
              Set <span className="font-code">GEMINI_API_KEY</span> in <span className="font-code">GitLore/Backend/.env</span>{" "}
              so the voice agent can return accurate answers.
            </p>
          )}

          <div className="rounded-sm bg-gitlore-code/50 px-3 py-2 text-[11px] leading-relaxed text-gitlore-text-secondary">
            {status?.envPresent && (
              <p className="mb-2 font-code text-[10px] text-gitlore-text/70">
                Backend env: API_KEY={status.envPresent.apiKey ? "set" : "missing"} · VOICE_EN=
                {status.envPresent.voiceId ? "set" : "missing"} · VOICE_HI=
                {status.envPresent.voiceIdHi ? "set" : "missing"} · GEMINI=
                {status.envPresent.geminiApi ? "set" : "missing"} · AGENT=
                {status.envPresent.agentId ? "set" : "missing"}
                {status.elevenlabsServerLocation != null && (
                  <>
                    {" "}
                    · REGION=<span className="text-gitlore-accent">{status.elevenlabsServerLocation}</span>
                  </>
                )}
              </p>
            )}
            {status && !ttsOk && !agentOk && (
              <p>
                Add <span className="font-code text-gitlore-text/80">ELEVENLABS_API_KEY</span>,{" "}
                <span className="font-code text-gitlore-text/80">ELEVENLABS_VOICE_ID</span>, and{" "}
                <span className="font-code text-gitlore-text/80">ELEVENLABS_AGENT_ID</span> to{" "}
                <span className="font-code">GitLore/Backend/.env</span>, then restart the API.
              </p>
            )}
            {status && ttsOk && !agentOk && (
              <p>
                TTS is ready. For voice chat, set <span className="font-code">ELEVENLABS_AGENT_ID</span> from the
                ElevenLabs Agents dashboard.
              </p>
            )}
            {status && !ttsOk && agentOk && (
              <p>
                Agent is configured; add <span className="font-code">ELEVENLABS_VOICE_ID</span> for read-aloud.
              </p>
            )}
            {status && ttsOk && !ttsHiOk && (
              <p className="mt-1">
                Hindi: set <span className="font-code">ELEVENLABS_VOICE_ID_HI</span> (premade / multilingual) and{" "}
                <span className="font-code">GEMINI_API_KEY</span> for translation.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
