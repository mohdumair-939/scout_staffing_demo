import type { SampleJob } from "./types";
import controller from "@/data/samples/controller-dallas.json";
import seniorAccountant from "@/data/samples/senior-accountant-chicago.json";
import taxManager from "@/data/samples/tax-manager-houston.json";
import paralegal from "@/data/samples/paralegal-atlanta.json";
import attorney from "@/data/samples/attorney-charlotte.json";
import estimator from "@/data/samples/estimator-phoenix.json";
import nurse from "@/data/samples/rn-icu-houston.json";
import electrician from "@/data/samples/electrician-denver.json";
import hvac from "@/data/samples/hvac-austin.json";
import cdl from "@/data/samples/cdl-san-antonio.json";
import backend from "@/data/samples/backend-austin.json";

/** The 11 one-click sample jobs, each with a hand-checked cached extraction. */
export const SAMPLE_JOBS = [controller, seniorAccountant, taxManager, paralegal, attorney, estimator, nurse, electrician, hvac, cdl, backend] as unknown as SampleJob[];

export function getSample(id: string | undefined): SampleJob | undefined {
  return id ? SAMPLE_JOBS.find((s) => s.sampleId === id) : undefined;
}
