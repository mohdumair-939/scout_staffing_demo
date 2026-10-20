import type { Candidate, Criterion } from "@/lib/data/types";

export const TODAY = "2026-10-20";

export function cand(over: Partial<Candidate> = {}): Candidate {
  return {
    id: "t1",
    name: "Test Person",
    family: "accounting",
    poolType: "active",
    sources: [{ source: "job_board", externalId: "JB-1", retrieved: TODAY }],
    lastActivity: TODAY,
    currentTitle: { value: "Controller", status: "self_reported", source: "job_board" },
    currentEmployer: { value: "Acme", status: "self_reported", source: "job_board" },
    location: { value: { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.797 }, status: "self_reported", source: "job_board" },
    workHistory: [],
    skills: [],
    credentials: [],
    education: [],
    languages: [{ value: "English", status: "self_reported", source: "job_board" }],
    applications: [],
    signals: [],
    complete: { skills: true, credentials: true, education: true, languages: true },
    contact: { email: "t@example.com", phone: "(555) 010-0000" },
    ...over,
  };
}

export function crit(id: string, category: Criterion["category"], text: string, value = "", mandatory = true): Criterion {
  return { id, category, text, value, mandatory, quote: "" };
}

export const DALLAS = { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.797 };
