export async function executeTool(tool: any) {
  if (tool.name === "book_appointment") {
    // placeholder for real calendar integration
    return {
      success: true,
      message: "Appointment scheduled"
    };
  }

  if (tool.name === "notify_marie") {
    // placeholder for notification (SMS/email)
    return {
      success: true,
      message: "Marie notified"
    };
  }

  return { success: false };
}
