import "server-only";
import type { Candidate, RegistryRecord } from "./types";
import candidatesJson from "@/data/candidates.json";
import registryJson from "@/data/registry.json";

export const CANDIDATES = candidatesJson as unknown as Candidate[];
export const REGISTRY = registryJson as unknown as RegistryRecord[];
