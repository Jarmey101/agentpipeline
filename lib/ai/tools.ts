export const tools = [
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Schedule a consultation with a client",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          date: { type: "string" },
          time: { type: "string" }
        },
        required: ["phone"]
      }
    },
    strict: true
  },
  {
    type: "function",
    function: {
      name: "notify_marie",
      description: "Send lead details to Marie",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" }
        },
        required: ["summary"]
      }
    },
    strict: true
  }
];
