import { NextResponse } from "next/server";
import { insertMessage } from "@/lib/messages";
import { generateReply } from "@/lib/reply-engine";
import { buildSmsTwiml } from "@/lib/twiml";
import { enqueueMemoryJob } from "@/lib/jobs";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const message = params.get("Body") || "";
    const phone = params.get("From") || "unknown";

    await insertMessage({
      phone,
      role: "user",
      content: message,
    });

    const reply = await generateReply(phone);

    await insertMessage({
      phone,
      role: "assistant",
      content: reply,
    });

    try {
      await Promise.all([
        enqueueMemoryJob({ phone, job_type: "summary_update" }),
        enqueueMemoryJob({ phone, job_type: "crm_extract" }),
      ]);
    } catch (jobError) {
      console.error("MEMORY_JOB_ENQUEUE_ERROR:", jobError);
    }

    return new NextResponse(buildSmsTwiml(reply), {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("INCOMING_SMS_ERROR:", error);
    return new NextResponse("Server error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
