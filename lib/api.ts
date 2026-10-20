import type { AiMode } from "@/lib/data/types";

/** Every AI route answers with the result plus which engine produced it. */
export interface AiResponse<T> {
  mode: AiMode;
  /** why the fallback ran, shown in the chip tooltip */
  note?: string;
  data: T;
}
