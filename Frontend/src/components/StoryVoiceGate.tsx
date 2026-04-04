import { ConversationProvider } from "@elevenlabs/react";
import type { InsightNarrative } from "@/lib/gitloreApi";
import { StoryVoiceModal } from "./StoryVoiceModal";

type Props = {
  open: boolean;
  onClose: () => void;
  narrative: InsightNarrative;
  line: number | null;
  repoFull: string;
  filePath: string;
};

/** Keeps @elevenlabs/react (and its dependency graph) out of the main bundle until voice UI is used. */
export default function StoryVoiceGate(props: Props) {
  return (
    <ConversationProvider>
      <StoryVoiceModal {...props} />
    </ConversationProvider>
  );
}
