import Groq from "groq-sdk";

export async function POST(req) {
  try {
    console.log("=== /api/ai REQUEST RECEIVED ===");

    const body = await req.json();
    const prompt = body.prompt || "";

    const apiKey = process.env.GROQ_API_KEY;
    console.log("API KEY LOADED:", !!apiKey);

    if (!apiKey) {
      console.log("API KEY NOT FOUND");
      return Response.json({ error: "API Key missing" }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    console.log("Calling Groq API...");

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile", // Fast and free model
      temperature: 0.7,
      max_tokens: 1024,
    });

    const text = completion.choices[0]?.message?.content || "";

    console.log("=== SUCCESS ===");
    console.log("Response preview:", text.substring(0, 100) + "...");

    return Response.json({ text });
  } catch (error) {
    console.log("=== GROQ API ERROR ===");
    console.error(error);
    return Response.json(
      { error: error.message, details: error.toString() },
      { status: 500 }
    );
  }
}