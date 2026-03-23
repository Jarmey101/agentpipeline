export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSmsTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>${escapeXml(message)}</Message>\n</Response>`;
}
