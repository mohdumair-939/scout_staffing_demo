"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import type { AiMode, Candidate, Criterion, Extraction, JobInput, SourceId } from "@/lib/data/types";
import type { CandidateOverride } from "@/lib/matching/pipeline";
import type { PlannedSource } from "@/lib/matching/sources";

export const STEPS = [
  { id: "intake", label: "Intake" },
  { id: "requirements", label: "Requirements" },
  { id: "sources", label: "Source plan" },
  { id: "candidates", label: "Candidates" },
  { id: "shortlist", label: "Shortlist" },
] as const;
export type StepId = (typeof STEPS)[number]["id"] | "dashboard";

export interface Tagged<T> {
  data: T;
  mode: AiMode;
  note?: string;
}

export interface CriteriaVersion {
  version: number;
  approvedAt: string;
  criteria: Criterion[];
}

export interface DemoState {
  step: StepId;
  job: JobInput;
  extraction?: Tagged<Extraction>;
  /** working copy being edited on the Requirements screen */
  criteria: Criterion[];
  answers: Record<string, { answer: string; summary: string; mode: AiMode }>;
  versions: CriteriaVersion[];
  sourcePlan?: Tagged<PlannedSource[]>;
  enabledSources: SourceId[];
  discoveryDone: boolean;
  overrides: Record<string, CandidateOverride>;
  /** true once localStorage has been read (never persisted) */
  hydrated?: boolean;
}

export const EMPTY_JOB: JobInput = { client: "", title: "", location: "", employmentType: "Full-time", payRange: "", jd: "" };

const INITIAL: DemoState = {
  step: "intake",
  job: EMPTY_JOB,
  criteria: [],
  answers: {},
  versions: [],
  enabledSources: [],
  discoveryDone: false,
  overrides: {},
};

type Action =
  | { type: "goto"; step: StepId }
  | { type: "setJob"; job: JobInput }
  | { type: "extracted"; extraction: Tagged<Extraction> }
  | { type: "setCriteria"; criteria: Criterion[] }
  | { type: "answer"; questionId: string; answer: string; summary: string; mode: AiMode; criteria: Criterion[] }
  | { type: "approve" }
  | { type: "sourcePlan"; plan: Tagged<PlannedSource[]> }
  | { type: "toggleSource"; id: SourceId }
  | { type: "startDiscovery" }
  | { type: "discovered" }
  | { type: "override"; candidateId: string; patch: Partial<CandidateOverride> }
  | { type: "reset" }
  | { type: "hydrate"; state: DemoState | null };

function reducer(s: DemoState, a: Action): DemoState {
  switch (a.type) {
    case "goto":
      return { ...s, step: a.step };
    case "setJob":
      return { ...s, job: a.job };
    case "extracted":
      // a new extraction starts a fresh requirements → shortlist flow
      return {
        ...INITIAL,
        hydrated: s.hydrated,
        job: s.job,
        step: "requirements",
        extraction: a.extraction,
        criteria: a.extraction.data.criteria,
      };
    case "setCriteria":
      return { ...s, criteria: a.criteria };
    case "answer":
      return { ...s, criteria: a.criteria, answers: { ...s.answers, [a.questionId]: { answer: a.answer, summary: a.summary, mode: a.mode } } };
    case "approve": {
      const version = (s.versions.at(-1)?.version ?? 0) + 1;
      return { ...s, versions: [...s.versions, { version, approvedAt: new Date().toISOString(), criteria: s.criteria }] };
    }
    case "sourcePlan": {
      const keepToggles = s.sourcePlan && s.enabledSources.length;
      return {
        ...s,
        sourcePlan: a.plan,
        enabledSources: keepToggles ? s.enabledSources : a.plan.data.filter((p) => p.recommended).map((p) => p.id),
      };
    }
    case "toggleSource": {
      const on = s.enabledSources.includes(a.id);
      return { ...s, enabledSources: on ? s.enabledSources.filter((x) => x !== a.id) : [...s.enabledSources, a.id], discoveryDone: false };
    }
    case "startDiscovery":
      return { ...s, discoveryDone: false };
    case "discovered":
      return { ...s, discoveryDone: true };
    case "override":
      return { ...s, overrides: { ...s.overrides, [a.candidateId]: { ...s.overrides[a.candidateId], ...a.patch } } };
    case "reset":
      return { ...INITIAL, hydrated: true };
    case "hydrate":
      return { ...(a.state ?? s), hydrated: true };
  }
}

const STORAGE_KEY = "staffing-demo:v1";

function load(): DemoState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoState;
    return parsed && typeof parsed === "object" && "step" in parsed ? { ...INITIAL, ...parsed } : null;
  } catch {
    return null;
  }
}

function save({ hydrated: _h, ...s }: DemoState) {
  void _h;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable (private mode / quota): the demo keeps working in memory */
  }
}

function clear() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

interface Ctx {
  state: DemoState;
  dispatch: (a: Action) => void;
  hydrated: boolean;
  candidates: Candidate[] | null;
  candidatesError: boolean;
  reloadCandidates: () => void;
  /** criteria used for matching: the latest approved version */
  approvedCriteria: Criterion[] | null;
  /** working copy differs from the latest approved version */
  hasDraftChanges: boolean;
  /** session cache for AI text (explanations, screening), keyed by candidate + state */
  aiResults: Record<string, unknown>;
  setAiResult: (key: string, value: unknown) => void;
  reset: () => void;
}

const DemoContext = createContext<Ctx | null>(null);

function fetchCandidates(): Promise<Candidate[]> {
  return fetch("/api/candidates").then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [candidatesError, setCandidatesError] = useState(false);
  const [aiResults, setAiResults] = useState<Record<string, unknown>>({});
  const setAiResult = useCallback((key: string, value: unknown) => setAiResults((r) => {
    const next = { ...r };
    if (value === undefined) delete next[key];
    else next[key] = value;
    return next;
  }), []);

  const hydrated = Boolean(state.hydrated);

  useEffect(() => {
    dispatch({ type: "hydrate", state: load() });
  }, []);

  useEffect(() => {
    if (hydrated) save(state);
  }, [state, hydrated]);

  useEffect(() => {
    fetchCandidates()
      .then(setCandidates)
      .catch(() => setCandidatesError(true));
  }, []);

  const reloadCandidates = useCallback(() => {
    setCandidatesError(false);
    fetchCandidates()
      .then(setCandidates)
      .catch(() => setCandidatesError(true));
  }, []);

  const reset = useCallback(() => {
    clear();
    setAiResults({});
    dispatch({ type: "reset" });
  }, []);

  const value = useMemo<Ctx>(() => {
    const latest = state.versions.at(-1);
    const hasDraftChanges = latest ? JSON.stringify(latest.criteria) !== JSON.stringify(state.criteria) : state.criteria.length > 0;
    return {
      state,
      dispatch,
      hydrated,
      candidates,
      candidatesError,
      reloadCandidates,
      approvedCriteria: latest?.criteria ?? null,
      hasDraftChanges,
      aiResults,
      setAiResult,
      reset,
    };
  }, [state, hydrated, candidates, candidatesError, reloadCandidates, reset, aiResults, setAiResult]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): Ctx {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}
