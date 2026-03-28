"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { approveRun, rejectRun } from "./actions";

export function RunActions({
  runId,
  canAct,
}: {
  runId: string;
  canAct: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!canAct) {
    return null;
  }

  return (
    <div className="run-actions">
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          start(async () => {
            const r = await approveRun(runId);
            if ("error" in r) {
              setMessage(r.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        Approve &amp; merge
      </button>
      <button
        type="button"
        className="btn btn-danger"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          start(async () => {
            const r = await rejectRun(runId);
            if ("error" in r) {
              setMessage(r.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        Reject
      </button>
      {message ? <p className="run-actions-error">{message}</p> : null}
    </div>
  );
}
