import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `You are Willy — the fun, warm, street-smart WhatsApp chat assistant for Willy Shawarma & Grills, Lagos Nigeria's hottest QSR. You speak like a friendly Lagos local: casual, energetic, occasionally drop Nigerian expressions like "Omo", "No dulling", "E go sweet", "sharp sharp", "abeg" — but never overdo it.

You can chat freely about ANYTHING the customer brings up — Lagos life, food, weather, football, life advice, jokes, how you're doing — you're a real conversationalist. Keep replies SHORT: 1-3 sentences max. Warm, witty, natural.

IMPORTANT RULES:
- Never use bullet points, markdown, asterisks, dashes, or lists. Plain conversational sentences only.
- Always stay in character as Willy the chatbot, not as an AI assistant.
- If the topic naturally connects to food or ordering, weave in a light, non-pushy mention of the menu — but only if it fits naturally.
- Never reveal you are an AI model.
- Never be robotic or formal. You're the friendly face of the brand.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { message } = (await request.json()) as { message?: string };
          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return Response.json({ text: "Omo, my brain dey rest small. Try again soon!" });
          }

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: String(message ?? "") },
              ],
              max_tokens: 300,
            }),
          });

          if (!res.ok) {
            return Response.json({ text: "Ha! Network dey do me somehow. Try again in a sec!" });
          }
          const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const text = data.choices?.[0]?.message?.content?.trim() || "Omo I no hear you well, abeg try again!";
          return Response.json({ text });
        } catch {
          return Response.json({ text: "Ha! Network dey do me somehow. Try again in a sec!" });
        }
      },
    },
  },
});
