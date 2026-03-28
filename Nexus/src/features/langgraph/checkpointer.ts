import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { getServerEnv } from "@/lib/env";

let setupPromise: Promise<PostgresSaver> | null = null;

/**
 * LangGraph Postgres checkpointer (schema `langgraph`). Call `setup()` once per process.
 */
export async function getNexusCheckpointer(): Promise<PostgresSaver> {
  if (!setupPromise) {
    const { DATABASE_URL } = getServerEnv();
    const saver = PostgresSaver.fromConnString(DATABASE_URL, {
      schema: "langgraph",
    });
    setupPromise = saver.setup().then(() => saver);
  }
  return setupPromise;
}
