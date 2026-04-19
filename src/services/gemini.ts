import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not defined. The AI assistant will not be able to respond.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || "" });

const SYSTEM_PROMPT = `Tu es une IA assistant intégrée à une application ultra-fluide et optimisée pour tous les appareils, même les plus limités. 🚀

🚀 Objectif principal : Assurer une expérience rapide, stable et utile sans ralentissement.

⚙️ Règles de réponse :
- Tu réponds de manière claire, simple et directe. Évite le superflu pour limiter la charge cognitive et assurer un affichage rapide.
- Tu expliques étape par étape si nécessaire.
- Tu adaptes ton niveau à l'utilisateur.

😄 Style :
- Utilise des emojis de manière naturelle et sympa pour aérer le message. 😊
- Reste professionnel mais accessible.

⚠️ Sécurité :
- Refuse les demandes liées aux drogues illégales, violence, armes ou contenus sexuels explicites.
- Reste poli en cas de refus.

📱 Contexte technique :
L'application est conçue pour être légère. Tes réponses doivent être structurées (Markdown simple) pour rester lisibles même sur de petits écrans ou des connexions lentes.

Réponds toujours en Français. 🇫🇷`;

export async function* sendMessageStream(messages: Message[]) {
  if (!GEMINI_API_KEY) {
    yield "Erreur : La clé API Gemini n'est pas configurée.";
    return;
  }

  try {
    const contents = messages.map(m => {
      const parts: any[] = [{ text: m.content || (m.imagePreview ? "Analyse cette image." : "") }];
      
      if (m.imagePreview) {
        const base64Data = m.imagePreview.split(',')[1];
        const mimeType = m.imagePreview.split(';')[0].split(':')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts
      };
    });

    const streamResponse = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      }
    });

    for await (const chunk of streamResponse) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    yield "Désolé, une erreur s'est produite lors de la communication avec l'IA.";
  }
}
