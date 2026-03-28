import { END, START, StateGraph } from "@langchain/langgraph";
import { getNexusCheckpointer } from "./checkpointer";
import { diagnoseOllamaNode } from "./nodes/diagnose-ollama";
import { humanGateNode } from "./nodes/human-gate";
import { ingestContextNode } from "./nodes/ingest-context";
import { mcpGithubPrepareNode } from "./nodes/mcp-github-prepare";
import { mcpGithubPrNode } from "./nodes/mcp-github-pr";
import { planFixNode } from "./nodes/plan-fix";
import { NexusStateAnnotation } from "./state";

async function buildCompiledGraph() {
  const checkpointer = await getNexusCheckpointer();
  return new StateGraph(NexusStateAnnotation)
    .addNode("ingest_context", ingestContextNode)
    .addNode("diagnose_ollama", diagnoseOllamaNode)
    .addNode("plan_fix", planFixNode)
    .addNode("mcp_github_prepare", mcpGithubPrepareNode)
    .addNode("mcp_github_pr", mcpGithubPrNode)
    .addNode("human_gate", humanGateNode)
    .addEdge(START, "ingest_context")
    .addEdge("ingest_context", "diagnose_ollama")
    .addEdge("diagnose_ollama", "plan_fix")
    .addEdge("plan_fix", "mcp_github_prepare")
    .addEdge("mcp_github_prepare", "mcp_github_pr")
    .addEdge("mcp_github_pr", "human_gate")
    .addEdge("human_gate", END)
    .compile({ checkpointer });
}

/** Bump when graph topology changes so dev HMR / long-running servers pick up new nodes. */
const GRAPH_BUILD_ID = 2;

let cachedBuildId: number | null = null;
let compiledPromise: ReturnType<typeof buildCompiledGraph> | null = null;

/** Compiled graph with Postgres checkpointer (`thread_id` = automation run id). */
export async function getCompiledNexusGraph() {
  if (cachedBuildId !== GRAPH_BUILD_ID) {
    compiledPromise = null;
    cachedBuildId = GRAPH_BUILD_ID;
  }
  compiledPromise ??= buildCompiledGraph();
  return compiledPromise;
}
