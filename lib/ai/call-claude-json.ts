/**
 * Nama file tetap "call-claude-json.ts" agar file lain yang sudah
 * mengimpor fungsi ini (check-terstruktur.ts, check-narasi-fallback.ts,
 * import-narasi/route.ts) TIDAK PERLU diubah sama sekali — cukup file ini
 * yang ditimpa. Implementasinya sekarang memanggil Gemini, bukan Claude.
 */
export async function callClaudeJSON(params: {
  system: string;
  userMessage: string;
  model?: string;
}): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum diatur di environment variable");
  }

  const model = params.model || process.env.GEMINI_MODEL || "gemini-3.6-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: params.system }] },
        contents: [{ role: "user", parts: [{ text: params.userMessage }] }],
        generationConfig: {
          temperature: 0, // dikunci ke 0 agar hasil konsisten antar pemanggilan
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    return JSON.parse(rawText);
  } catch (e) {
    throw new Error(`Gagal parse JSON dari AI: ${rawText}`);
  }
}
