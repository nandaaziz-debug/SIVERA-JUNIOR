export async function callClaudeJSON(params: {
  system: string;
  userMessage: string;
  model?: string;
}): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY belum diatur di environment variable");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model ?? "claude-sonnet-5",
      max_tokens: 1200,
      temperature: 0, // dikunci ke 0 agar hasil konsisten antar pemanggilan
      system: `${params.system}\n\nPENTING: keluarkan HANYA JSON valid, tanpa teks pembuka/penutup, tanpa markdown code fence.`,
      messages: [{ role: "user", content: params.userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: any) => block.type === "text");
  const rawText: string = textBlock?.text ?? "{}";
  const clean = rawText.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error(`Gagal parse JSON dari AI: ${clean}`);
  }
}
