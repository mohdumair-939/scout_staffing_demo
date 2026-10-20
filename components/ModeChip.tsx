import { Cpu, Database, Sparkles } from "lucide-react";
import type { AiMode } from "@/lib/data/types";
import { Badge, Tip } from "./ui";

const INFO: Record<AiMode, { label: string; tone: "violet" | "slate" | "blue"; text: string; icon: typeof Sparkles }> = {
  ai: { label: "AI", tone: "violet", text: "Generated live by Claude and checked against a schema.", icon: Sparkles },
  rules: { label: "Rules", tone: "slate", text: "Deterministic keyword rules / templates (no AI call).", icon: Cpu },
  cached: { label: "Cached", tone: "blue", text: "Hand-checked cached result for this sample JD.", icon: Database },
};

export function ModeChip({ mode, note }: { mode: AiMode; note?: string }) {
  const i = INFO[mode];
  const Icon = i.icon;
  return (
    <Tip text={note ? `${i.text} ${note}.` : i.text}>
      <Badge tone={i.tone}>
        <Icon size={12} /> {i.label}
      </Badge>
    </Tip>
  );
}
