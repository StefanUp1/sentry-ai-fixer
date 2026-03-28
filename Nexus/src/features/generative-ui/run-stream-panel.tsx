"use client";

import { useEffect, useState } from "react";

export function RunStreamPanel({ runId }: { runId: string }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/runs/${runId}/stream`, {
          credentials: "include",
        });
        if (!res.ok) {
          setError(`Stream failed (${res.status})`);
          setLoading(false);
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          setLoading(false);
          return;
        }
        const decoder = new TextDecoder();
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          setText((t) => t + decoder.decode(value, { stream: true }));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Stream error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (error) {
    return <p className="run-stream-error">{error}</p>;
  }

  return (
    <div className="run-stream-wrap">
      {loading ? <p className="muted">Streaming…</p> : null}
      <pre className="run-stream">{text || (loading ? "" : "(empty)")}</pre>
    </div>
  );
}
