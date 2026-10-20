"use client";

import { useMemo } from "react";
import { DEMO_TODAY } from "@/lib/data/constants";
import type { SourceId } from "@/lib/data/types";
import { resolveLocation } from "@/lib/matching/distance";
import { mergeDuplicates, rank, scorePool, inSearchScope, type ScoredCandidate } from "@/lib/matching/pipeline";
import type { MatchContext } from "@/lib/matching/criteria";
import { useDemo } from "@/lib/state";

export function useMatchContext(): MatchContext | null {
  const { state } = useDemo();
  return useMemo(() => {
    if (!state.extraction) return null;
    const city = resolveLocation(state.job.location);
    return { family: state.extraction.data.family, job: city, today: DEMO_TODAY };
  }, [state.extraction, state.job.location]);
}

/** All in-scope candidates for the current job, scored and ranked (fit → readiness → movability). */
export function useScored(): ScoredCandidate[] {
  const { state, candidates, approvedCriteria } = useDemo();
  const ctx = useMatchContext();
  return useMemo(() => {
    if (!candidates || !ctx || !approvedCriteria) return [];
    return rank(scorePool(candidates, approvedCriteria, ctx, new Set(state.enabledSources), state.overrides));
  }, [candidates, ctx, approvedCriteria, state.enabledSources, state.overrides]);
}

/** Records found per source, for the discovery animation and dashboard. */
export function useSourceCounts(sources: SourceId[]): Record<string, number> {
  const { candidates } = useDemo();
  const ctx = useMatchContext();
  return useMemo(() => {
    const out: Record<string, number> = {};
    if (!candidates || !ctx) return out;
    const merged = mergeDuplicates(candidates);
    for (const s of sources) out[s] = merged.filter((c) => inSearchScope(c, ctx.family, ctx, new Set([s])) && c.sources.some((x) => x.source === s)).length;
    return out;
  }, [candidates, ctx, sources]);
}
