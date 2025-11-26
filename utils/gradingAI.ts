// FILE: utils/gradingAI.ts
import { GoogleGenAI, Type } from "@google/genai";

export interface GradingResult {
  grade: number;
  feedback: string;
}

/**
 * Uses Gemini AI to grade a text answer.
 */
export async function generateFeedbackAndGrade(
  question: string,
  studentAnswer: string,
  maxPoints: number
): Promise<GradingResult> {
  // Ensure API Key is present (handled by env var replacement in build or runtime)
  // @ts-ignore
  const apiKey = process.env.API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("API Key de IA não configurada.");
  }

  if (!studentAnswer || studentAnswer.trim() === "") {
      return { grade: 0, feedback: "Não houve resposta para esta questão." };
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Atue como um professor de História experiente. Avalie a resposta do aluno para a questão abaixo.

    ---
    Enunciado: "${question}"
    Resposta do Aluno: "${studentAnswer}"
    Valor da Questão: ${maxPoints} pontos
    ---

    Instruções de Avaliação:
    Avalie a resposta do estudante com rigor acadêmico, mas mantenha proporcionalidade na atribuição da nota. Reconheça claramente todos os acertos, mesmo que parciais, e diferencie entre erros conceituais, informações incompletas e pontos omitidos. A crítica deve explicar o que está correto, o que está incorreto e o que falta para uma resposta plenamente adequada ao nível de exigência da pergunta. Evite penalizar de maneira excessiva por um único erro quando houver demonstração geral de compreensão do tema. Considere sempre a dificuldade da questão, o contexto da disciplina e o nível esperado do estudante. Ao final, apresente uma justificativa clara da avaliação e atribua uma nota coerente com o desempenho global demonstrado.

    Retorne um JSON com:
    - "grade": Nota sugerida (número flutuante entre 0 e ${maxPoints}).
    - "feedback": Um comentário construtivo e didático para o aluno, justificando a nota com base nas instruções acima.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grade: { type: Type.NUMBER, description: "Nota atribuída ao aluno, respeitando o máximo." },
            feedback: { type: Type.STRING, description: "Feedback pedagógico para o aluno." },
          },
          required: ["grade", "feedback"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

    const result = JSON.parse(text);
    
    // Sanity check
    let grade = typeof result.grade === 'number' ? result.grade : 0;
    grade = Math.max(0, Math.min(grade, maxPoints)); // Clamp grade

    return {
        grade,
        feedback: result.feedback || "Sem feedback gerado."
    };

  } catch (error) {
    console.error("Erro na correção com IA:", error);
    throw new Error("Falha ao conectar com o serviço de Inteligência Artificial.");
  }
}