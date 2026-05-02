"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  QUESTIONNAIRE_SCHEMA,
  QUESTIONNAIRE_SECTIONS,
  Question,
} from "@/lib/questionnaire-schema";

type Answers = Record<string, string | number | string[] | null>;

function getInitialAnswers(): Answers {
  const answers: Answers = {};

  for (const question of QUESTIONNAIRE_SCHEMA) {
    if (question.type === "multiple") {
      answers[question.id] = [];
    } else {
      answers[question.id] = "";
    }

    if (question.otherField) {
      answers[question.otherField] = "";
    }
  }

  return answers;
}

function getQuestionnaireDraftKey(userId: string, responseId?: string, mode?: string) {
  const formId = mode === "edit" && responseId ? responseId : "new";
  return `questionnaire_draft_${userId}_${formId}`;
}

export default function CourseQuestionnaireForm({
  responseId,
  mode = "create",
}: {
  responseId?: string;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(getInitialAnswers);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function loadUserAndDraft() {
        const {
        data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        setUserId(user.id);

        const draftKey = getQuestionnaireDraftKey(user.id, responseId, mode);
        const savedDraft = localStorage.getItem(draftKey);

        if (savedDraft && mode !== "edit") {
        try {
            const parsedDraft = JSON.parse(savedDraft);

            setAnswers({
            ...getInitialAnswers(),
            ...(parsedDraft.answers || {}),
            });

            setStatus("Se recuperó un borrador del formulario guardado en este navegador.");
        } catch {
            localStorage.removeItem(draftKey);
        }
        }
    }

    loadUserAndDraft();
    }, [responseId, mode]);

    useEffect(() => {
        async function loadExistingAnswers() {
            if (mode !== "edit" || !responseId) return;

            setStatus("Cargando información del curso...");

            const {
            data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
            setStatus("No hay usuario autenticado.");
            return;
            }

            setUserId(user.id);

            const draftKey = getQuestionnaireDraftKey(user.id, responseId, mode);
            const savedDraft = localStorage.getItem(draftKey);

            if (savedDraft) {
            try {
                const parsedDraft = JSON.parse(savedDraft);

                setAnswers({
                ...getInitialAnswers(),
                ...(parsedDraft.answers || {}),
                });

                setStatus("Se recuperó un borrador de edición guardado en este navegador.");
                return;
            } catch {
                localStorage.removeItem(draftKey);
            }
            }

            const { data, error } = await supabase
            .from("questionnaire_answers")
            .select("answers")
            .eq("response_id", responseId)
            .maybeSingle();

            if (error) {
            setStatus(`Error cargando curso: ${error.message}`);
            return;
            }

            if (!data) {
            setStatus("No se encontraron respuestas para este curso.");
            return;
            }

            setAnswers({
            ...getInitialAnswers(),
            ...(data.answers || {}),
            });

            setStatus("");
        }

        loadExistingAnswers();
    }, [mode, responseId]);

  const groupedQuestions = useMemo(() => {
    return QUESTIONNAIRE_SECTIONS.map((section) => ({
      ...section,
      questions: QUESTIONNAIRE_SCHEMA.filter(
        (question) => question.section === section.id
      ),
    }));
  }, []);

  useEffect(() => {
    if (!userId) return;

    const hasAnyAnswer = Object.values(answers).some((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== "" && value !== null && value !== undefined;
    });

    if (!hasAnyAnswer) return;

    const draftKey = getQuestionnaireDraftKey(userId, responseId, mode);

    localStorage.setItem(
        draftKey,
        JSON.stringify({
        answers,
        updatedAt: new Date().toISOString(),
        })
    );
    }, [answers, userId, responseId, mode]);

  function updateAnswer(questionId: string, value: string | number | string[]) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  function toggleMultiple(question: Question, option: string) {
    const currentValues = Array.isArray(answers[question.id])
      ? (answers[question.id] as string[])
      : [];

    const exists = currentValues.includes(option);

    const nextValues = exists
      ? currentValues.filter((item) => item !== option)
      : [...currentValues, option];

    updateAnswer(question.id, nextValues);
  }

  function validateForm() {
    for (const question of QUESTIONNAIRE_SCHEMA) {
      const value = answers[question.id];

      if (question.required) {
        if (question.type === "multiple") {
          if (!Array.isArray(value) || value.length === 0) {
            return `La pregunta ${question.number} es obligatoria.`;
          }
        } else if (value === "" || value === null || value === undefined) {
          return `La pregunta ${question.number} es obligatoria.`;
        }
      }

      if (question.type === "number" && value !== "") {
        const numericValue = Number(value);

        if (Number.isNaN(numericValue)) {
          return `La pregunta ${question.number} debe ser numérica.`;
        }

        if (question.min !== undefined && numericValue < question.min) {
          return `La pregunta ${question.number} no puede ser menor que ${question.min}.`;
        }

        if (question.max !== undefined && numericValue > question.max) {
          return `La pregunta ${question.number} no puede ser mayor que ${question.max}.`;
        }
      }
    }

    const q41 = answers.q41_factores_aumentaron_esfuerzo;

    if (Array.isArray(q41) && q41.length > 3) {
      return "En la pregunta 41 solo puede seleccionar hasta 3 alternativas.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");

    const validationError = validateForm();

    if (validationError) {
        setStatus(validationError);
        return;
    }

    setSaving(true);

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        setSaving(false);
        setStatus("No hay usuario autenticado.");
        return;
    }

    if (mode === "edit" && responseId) {
        const { error: updateError } = await supabase
        .from("questionnaire_answers")
        .update({
            answers,
            updated_at: new Date().toISOString(),
        })
        .eq("response_id", responseId);

        if (updateError) {
        setSaving(false);
        setStatus("No fue posible actualizar la información del curso.");
        return;
        }

        await supabase
        .from("questionnaire_responses")
        .update({
            updated_at: new Date().toISOString(),
        })
        .eq("id", responseId)
        .eq("user_id", user.id);

        setSaving(false);
        setStatus("Curso actualizado correctamente.");

        if (userId) {
            localStorage.removeItem(getQuestionnaireDraftKey(userId, responseId, mode));
        }

        router.push("/");
        return;
    }

    const { data: response, error: responseError } = await supabase
        .from("questionnaire_responses")
        .insert({
        user_id: user.id,
        status: "completed",
        })
        .select()
        .single();

    if (responseError || !response) {
        setSaving(false);
        setStatus("No fue posible crear el registro del cuestionario.");
        return;
    }

    const { error: answersError } = await supabase
        .from("questionnaire_answers")
        .insert({
        response_id: response.id,
        answers,
        });

    if (answersError) {
        setSaving(false);
        setStatus("No fue posible guardar las respuestas del cuestionario.");
        return;
    }

    setSaving(false);
    setStatus("Cuestionario guardado correctamente.");

    if (userId) {
        localStorage.removeItem(getQuestionnaireDraftKey(user.id, response.id, "create"));
        localStorage.removeItem(getQuestionnaireDraftKey(user.id, undefined, "create"));
    }

    router.push("/");
    }

  function renderQuestion(question: Question) {
    const value = answers[question.id];

    if (question.type === "text") {
      return (
        <input
          value={String(value || "")}
          onChange={(e) => updateAnswer(question.id, e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
        />
      );
    }

    if (question.type === "number") {
      return (
        <input
          type="number"
          min={question.min}
          max={question.max}
          value={String(value || "")}
          onChange={(e) => updateAnswer(question.id, e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
        />
      );
    }

    if (question.type === "scale") {
      return (
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((number) => (
            <label
              key={number}
              className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-sm ${
                Number(value) === number
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={number}
                checked={Number(value) === number}
                onChange={() => updateAnswer(question.id, number)}
                className="hidden"
              />
              {number}
            </label>
          ))}
        </div>
      );
    }

    if (question.type === "single") {
      return (
        <div className="space-y-2">
          {question.options?.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm hover:bg-slate-50"
            >
              <input
                type="radio"
                name={question.id}
                checked={value === option}
                onChange={() => updateAnswer(question.id, option)}
              />
              <span>{option}</span>
            </label>
          ))}

          {question.otherField &&
            (value === "Otro" || value === "Otra" || value === "Otros") && (
              <input
                placeholder="Especifique"
                value={String(answers[question.otherField] || "")}
                onChange={(e) =>
                  updateAnswer(question.otherField!, e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            )}
        </div>
      );
    }

    if (question.type === "multiple") {
      const selectedValues = Array.isArray(value) ? value : [];

      return (
        <div className="space-y-2">
            {question.id === "q41_factores_aumentaron_esfuerzo" && (
            <p className="mb-2 text-sm text-slate-500">
                Puede seleccionar máximo 3 opciones.
            </p>
            )}

          {question.options?.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option)}
                onChange={() => toggleMultiple(question, option)}
              />
              <span>{option}</span>
            </label>
          ))}

          {question.otherField &&
            selectedValues.some((item) =>
              ["Otro", "Otra", "Otros"].includes(item)
            ) && (
              <input
                placeholder="Especifique"
                value={String(answers[question.otherField] || "")}
                onChange={(e) =>
                  updateAnswer(question.otherField!, e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            )}
        </div>
      );
    }

    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {groupedQuestions.map((section) => (
        <section
          key={section.id}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold text-slate-900">
            {section.title}
          </h2>

          <div className="mt-6 grid gap-6">
            {section.questions.map((question) => (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <label className="block text-sm font-medium text-slate-900">
                  {question.number}. {question.label}
                  {question.required && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </label>

                <div className="mt-3">{renderQuestion(question)}</div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {status && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          {status}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-slate-900 px-5 py-2 text-white disabled:opacity-60"
        >
          {saving ? "Guardando..." : mode === "edit" ? "Actualizar curso" : "Guardar cuestionario"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-2xl border border-slate-300 px-5 py-2 text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}