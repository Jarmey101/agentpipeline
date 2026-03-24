import { NextResponse } from "next/server";
import { insertMessage } from "@/lib/messages";
import { generateReply } from "@/lib/reply-engine";
import { buildSmsTwiml } from "@/lib/twiml";
import { enqueueMemoryJob } from "@/lib/jobs";
import { checkAndMarkInboundMessage } from "@/lib/inbound-message-dedupe";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);

    const message = params.get("Body") || "";
    const phone = params.get("From") || "unknown";
    const messageSid = params.get("MessageSid") || "";

    console.log("[incoming-sms] inbound received", {
      phone,
      messageSid,
    });

    const dedupe = await checkAndMarkInboundMessage({
      messageSid,
      phone,
      rawBody: message,
    });

    if (!dedupe.ok) {
      console.error("[incoming-sms] dedupe check failed", {
        phone,
        messageSid,
        error: dedupe.error,
      });
    }

    if (dedupe.ok && dedupe.isDuplicate) {
      console.warn("[incoming-sms] duplicate inbound ignored", {
        phone,
        messageSid,
      });

      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: {
          "Content-Type": "text/xml",
        },
      });
    }

    console.log("[incoming-sms] dedupe passed", {
      phone,
      messageSid,
    });

    await insertMessage({
      phone,
      role: "user",
      content: message,
    });

    console.log("[incoming-sms] generating reply", { phone });

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

    console.log("[incoming-sms] twiml response ready", { phone });

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
