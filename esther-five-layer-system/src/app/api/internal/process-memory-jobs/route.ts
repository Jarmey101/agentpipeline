import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { claimPendingJobs, markJobStatus } from "@/lib/jobs";
import { processCrmExtraction, processSummaryUpdate } from "@/lib/memory-processor";

function isAuthorized(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${env.internalJobSecret()}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await claimPendingJobs(10);

    for (const job of jobs) {
      await markJobStatus(job.id, "processing");

      try {
        if (job.job_type === "summary_update") {
          await processSummaryUpdate(job.phone);
        } else if (job.job_type === "crm_extract") {
          await processCrmExtraction(job.phone);
        }

        await markJobStatus(job.id, "done");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown memory processor error";
        await markJobStatus(job.id, "failed", message);
      }
    }

    return NextResponse.json({ processed: jobs.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
