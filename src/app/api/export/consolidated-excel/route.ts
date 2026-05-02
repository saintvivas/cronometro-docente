import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { QUESTIONNAIRE_SCHEMA } from "@/lib/questionnaire-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMER_PARENT_COLUMNS: Record<string, string> = {
  q30: "Promedio de horas invertidas a la semana en planificación y diseño del curso:",
  q31: "Promedio de horas invertidas a la semana en el desarrollo de materiales y recursos educativos:",
  q32: "Promedio de horas invertidas a la semana en implementación (subida de materiales, configuración, pruebas, etc.):",
  q33: "Promedio de horas invertidas a la semana en evaluación:",
  q34: "Promedio de horas invertidas a la semana en comunicación con estudiantes (mensajes, foros, correos, tutorías, retroalimentación, etc.):",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function removeAccents(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeTextValue(value: unknown) {
  if (value === null || value === undefined) return "";

  return removeAccents(String(value))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeCategory(value: unknown) {
  if (value === null || value === undefined) return "";

  return removeAccents(String(value))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return "";

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) return "";

  return numericValue;
}

function normalizeInteger(value: unknown) {
  if (value === "" || value === null || value === undefined) return "";

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) return "";

  return Math.round(numericValue);
}

function getNormalizedAnswer(question: any, value: unknown) {
  if (question.type === "number") {
    const numericValue = normalizeNumber(value);

    if (
      question.id.includes("porcentaje") &&
      typeof numericValue === "number"
    ) {
      return numericValue / 100;
    }

    return numericValue;
  }

  if (question.type === "scale") {
    return normalizeInteger(value);
  }

  if (question.type === "single") {
    return normalizeCategory(value);
  }

  if (question.type === "text") {
    return normalizeTextValue(value);
  }

  return value ?? "";
}

function getNumber(value: unknown, fallback = 0) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return fallback;
  }

  return numericValue;
}

function getWeeklyAverageByParent(
  details: any[],
  parentCode: string,
  durationWeeks: number
) {
  const validWeeks = durationWeeks > 0 ? durationWeeks : 1;

  const totalSeconds = details
    .filter((detail) => String(detail.question_code || "").startsWith(`${parentCode}_`))
    .reduce((acc, detail) => acc + getNumber(detail.measured_seconds), 0);

  const totalHours = totalSeconds / 3600;

  return Number((totalHours / validWeeks).toFixed(2));
}

function getTotalHoursByParent(details: any[], parentCode: string) {
  const totalSeconds = details
    .filter((detail) => String(detail.question_code || "").startsWith(`${parentCode}_`))
    .reduce((acc, detail) => acc + getNumber(detail.measured_seconds), 0);

  return Number((totalSeconds / 3600).toFixed(2));
}

function normalizeAnswers(rawAnswers: unknown) {
  if (!rawAnswers || typeof rawAnswers !== "object") {
    return {};
  }

  return rawAnswers as Record<string, any>;
}

function buildDatasetRow({
  response,
  answers,
  details,
}: {
  response: any;
  answers: Record<string, any>;
  details: any[];
}) {
  const durationWeeks = getNumber(answers.q16_duracion_curso_semanas, 1);

  const row: Record<string, any> = {
    fecha_registro: response.created_at,
  };

  for (const question of QUESTIONNAIRE_SCHEMA) {
    const value = answers[question.id];

    if (question.type === "multiple") {
      const selectedValues = Array.isArray(value) ? value : [];

      for (const option of question.options || []) {
        const columnName = `${question.id}_${slugify(option)}`;
        row[columnName] = selectedValues.includes(option) ? 1 : 0;
      }

      if (question.otherField) {
        const legacyOtra = `${question.id}_otra`;
        const legacyOtro = `${question.id}_otro`;
        const legacyOtros = `${question.id}_otros`;

        row[question.otherField] = normalizeTextValue(
        answers[question.otherField] ||
            answers[legacyOtra] ||
            answers[legacyOtro] ||
            answers[legacyOtros] ||
            ""
        );
        }

      continue;
    }

    row[question.id] = getNormalizedAnswer(question, value);

    if (question.otherField) {
    const legacyOtra = `${question.id}_otra`;
    const legacyOtro = `${question.id}_otro`;
    const legacyOtros = `${question.id}_otros`;

    row[question.otherField] = normalizeTextValue(
    answers[question.otherField] ||
        answers[legacyOtra] ||
        answers[legacyOtro] ||
        answers[legacyOtros] ||
        ""
    );
    }
  }

  for (const parentCode of Object.keys(TIMER_PARENT_COLUMNS)) {
    row[`${parentCode}_promedio_semanal_medido`] = getWeeklyAverageByParent(
        details,
        parentCode,
        durationWeeks
    );
    }

    const q24Metodologias = Array.isArray(answers.q24_metodologia_principal)
        ? answers.q24_metodologia_principal
        : [];

    const q41Factores = Array.isArray(answers.q41_factores_aumentaron_esfuerzo)
        ? answers.q41_factores_aumentaron_esfuerzo
        : [];

    const q42UsosIa = Array.isArray(answers.q42_uso_ia_generativa)
        ? answers.q42_uso_ia_generativa
        : [];

    row["n_metodologias"] = q24Metodologias.length;
    row["n_factores_esfuerzo"] = q41Factores.length;
    row["n_usos_ia"] = q42UsosIa.length;

  return row;
}

function getDatasetHeaders() {
  const headers: string[] = [
    "fecha_registro",
  ];

  for (const question of QUESTIONNAIRE_SCHEMA) {
    if (question.number === 35) {
      headers.push(
        "q30_promedio_semanal_medido",
        "q31_promedio_semanal_medido",
        "q32_promedio_semanal_medido",
        "q33_promedio_semanal_medido",
        "q34_promedio_semanal_medido"
      );
    }

    if (question.type === "multiple") {
    for (const option of question.options || []) {
        headers.push(`${question.id}_${slugify(option)}`);
    }

    if (question.otherField) {
        headers.push(question.otherField);
    }

    if (question.id === "q24_metodologia_principal") {
        headers.push("n_metodologias");
    }

    if (question.id === "q41_factores_aumentaron_esfuerzo") {
        headers.push("n_factores_esfuerzo");
    }

    if (question.id === "q42_uso_ia_generativa") {
        headers.push("n_usos_ia");
    }

    continue;
    }

    headers.push(question.id);

    if (question.otherField) {
      headers.push(question.otherField);
    }
  }

  return headers;
}

function getValidRange(question: any) {
  if (question.type === "scale") {
    return "1 a 5";
  }

  if (question.type === "number") {
    if (question.min !== undefined && question.max !== undefined) {
      return `${question.min} a ${question.max}`;
    }

    if (question.min !== undefined) {
      return `Mayor o igual a ${question.min}`;
    }

    if (question.max !== undefined) {
      return `Menor o igual a ${question.max}`;
    }

    return "Numérico";
  }

  if (question.type === "single") {
    return question.options?.join(" | ") || "Selección única";
  }

  if (question.type === "multiple") {
    return "0 = No seleccionada; 1 = Seleccionada";
  }

  if (question.type === "text") {
    return "Texto libre";
  }

  return "";
}

function getReadableType(questionType: string) {
  const types: Record<string, string> = {
    text: "Texto",
    number: "Numérica",
    single: "Categórica",
    multiple: "Binaria / selección múltiple",
    scale: "Ordinal",
  };

  return types[questionType] || questionType;
}

function buildDictionaryRows() {
  const rows: any[] = [];

  for (const question of QUESTIONNAIRE_SCHEMA) {
    // Insertar P30-P34 antes de P35
    if (question.number === 35) {
      for (const [parentCode, excelColumn] of Object.entries(TIMER_PARENT_COLUMNS)) {
        const questionNumber = parentCode.replace("q", "");

        rows.push({
          "Nombre original (pregunta)": `${questionNumber}. ${excelColumn}`,
          "Nombre normalizado (columna final)": `${parentCode}_promedio_semanal_medido`,
          "Tipo": "Numérica",
          "Rango válido":
            "Mayor o igual a 0. Calculado como suma de subactividades medidas con cronómetro dividida entre la duración del curso en semanas",
        });
      }
    }

    if (question.type === "multiple") {
      for (const option of question.options || []) {
        rows.push({
          "Nombre original (pregunta)": `${question.number}. ${question.label}`,
          "Nombre normalizado (columna final)": `${question.id}_${slugify(option)}`,
          "Tipo": "Binaria",
          "Rango válido": "0 = No seleccionada; 1 = Seleccionada",
        });
      }

      if (question.otherField) {
        rows.push({
          "Nombre original (pregunta)": `${question.number}. ${question.label} - Otro`,
          "Nombre normalizado (columna final)": question.otherField,
          "Tipo": "Texto",
          "Rango válido": "Texto libre",
        });
      }

      continue;
    }

    rows.push({
      "Nombre original (pregunta)": `${question.number}. ${question.label}`,
      "Nombre normalizado (columna final)": question.id,
      "Tipo": getReadableType(question.type),
      "Rango válido": getValidRange(question),
    });

    if (question.otherField) {
      rows.push({
        "Nombre original (pregunta)": `${question.number}. ${question.label} - Otro`,
        "Nombre normalizado (columna final)": question.otherField,
        "Tipo": "Texto",
        "Rango válido": "Texto libre",
      });
    }
  }

  rows.push(
    {
        "Nombre original (pregunta)": "Conteo de metodologías seleccionadas en la pregunta 24",
        "Nombre normalizado (columna final)": "n_metodologias",
        "Tipo": "Numérica",
        "Rango válido": "Mayor o igual a 0. Conteo de opciones seleccionadas",
    },
    {
        "Nombre original (pregunta)": "Conteo de factores que aumentaron el esfuerzo docente en la pregunta 41",
        "Nombre normalizado (columna final)": "n_factores_esfuerzo",
        "Tipo": "Numérica",
        "Rango válido": "0 a 3. Conteo de opciones seleccionadas",
    },
    {
        "Nombre original (pregunta)": "Conteo de usos de inteligencia artificial generativa en la pregunta 42",
        "Nombre normalizado (columna final)": "n_usos_ia",
        "Tipo": "Numérica",
        "Rango válido": "Mayor o igual a 0. Conteo de opciones seleccionadas",
    }
    );

  return rows;
}

function applyDatasetFormats(worksheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");

  for (let col = range.s.c; col <= range.e.c; col++) {
    const headerCellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const headerCell = worksheet[headerCellAddress];

    if (!headerCell) continue;

    const header = String(headerCell.v || "").toLowerCase();

    for (let row = 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];

      if (!cell) continue;

      const isNumber = typeof cell.v === "number";

      // No forzar celdas vacías
      if (cell.v === "" || cell.v === null || cell.v === undefined) {
        continue;
      }

      // Porcentajes guardados como 0 a 100
      if (header.includes("porcentaje") && isNumber) {
        cell.z = "0%";
        continue;
      }

      // Escalas ordinales 1-5
      if (
        (
          header.includes("competencias_digitales") ||
          header.includes("complejidad_multimedia") ||
          header.includes("apoyo_tecnico") ||
          header.includes("complejidad_contenido") ||
          header.includes("esfuerzo_percibido") ||
          header.includes("satisfaccion_resultados")
        ) &&
        isNumber
      ) {
        cell.z = "0";
        continue;
      }

      // Variables binarias 0/1
      if (
        (
          header.includes("q24_metodologia") ||
          header.includes("q41_factores") ||
          header.includes("q42_uso_ia")
        ) &&
        isNumber
      ) {
        cell.z = "0";
        continue;
      }

      // Conteos resumen
      if (
        (
          header === "n_metodologias" ||
          header === "n_factores_esfuerzo" ||
          header === "n_usos_ia"
        ) &&
        isNumber
      ) {
        cell.z = "0";
        continue;
      }

      // Horas
      if (
        (
          header.includes("promedio_semanal_medido") ||
          header.includes("total_horas") ||
          header.includes("tiempo_horas")
        ) &&
        isNumber
      ) {
        cell.z = "0.00";
        continue;
      }

      // Segundos y enteros
      if (
        (
          header.includes("segundos") ||
          header.includes("tiempo_segundos") ||
          header.includes("anios") ||
          header.includes("semanas") ||
          header.includes("estudiantes") ||
          header.includes("modulos") ||
          header.includes("actividades") ||
          header.includes("asistentes")
        ) &&
        isNumber
      ) {
        cell.z = "0";
        continue;
      }
    }
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Sesión inválida." },
      { status: 401 }
    );
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((email) =>
    email.trim().toLowerCase()
  );

  if (!adminEmails?.includes(user.email?.toLowerCase() || "")) {
    return NextResponse.json(
      { error: "No tienes permisos para exportar todos los registros." },
      { status: 403 }
    );
  }

  const { data: responses, error: responsesError } = await supabaseAdmin
    .from("questionnaire_responses")
    .select("id, user_id, created_at, updated_at, status")
    .order("created_at", { ascending: false });

  if (responsesError) {
    return NextResponse.json(
      { error: "No fue posible consultar los cuestionarios." },
      { status: 500 }
    );
  }

  const { data: answersRows, error: answersError } = await supabaseAdmin
    .from("questionnaire_answers")
    .select("response_id, answers");

  if (answersError) {
    return NextResponse.json(
      { error: "No fue posible consultar las respuestas." },
      { status: 500 }
    );
  }

  const { data: measurements, error: measurementsError } = await supabaseAdmin
    .from("mediciones_docentes")
    .select(
      `
      id,
      response_id,
      user_id,
      created_at,
      teacher_name,
      teacher_email,
      course_name,
      total_measured_seconds,
      total_measured_hours,
      medicion_detalle (
        id,
        question_code,
        question_text,
        measured_seconds,
        measured_hours
      )
    `
    )
    .not("response_id", "is", null)
    .order("created_at", { ascending: false });

  if (measurementsError) {
    return NextResponse.json(
      { error: "No fue posible consultar las mediciones." },
      { status: 500 }
    );
  }

  const answersByResponseId = new Map<string, Record<string, any>>();

  for (const row of answersRows || []) {
    answersByResponseId.set(row.response_id, normalizeAnswers(row.answers));
  }

  const measurementsByResponseId = new Map<string, any[]>();

  for (const measurement of measurements || []) {
    if (!measurement.response_id) continue;

    const current = measurementsByResponseId.get(measurement.response_id) || [];
    current.push(measurement);
    measurementsByResponseId.set(measurement.response_id, current);
  }

  const datasetRows = (responses || []).map((response) => {
    const answers = answersByResponseId.get(response.id) || {};
    const responseMeasurements = measurementsByResponseId.get(response.id) || [];
    const details = responseMeasurements.flatMap(
      (measurement) => measurement.medicion_detalle || []
    );

    return buildDatasetRow({
      response,
      answers,
      details,
    });
  });

  const measurementDetailRows = (measurements || []).flatMap((measurement: any) =>
    (measurement.medicion_detalle || []).map((detail: any) => ({
      id_cuestionario: measurement.response_id,
      id_medicion: measurement.id,
      user_id: measurement.user_id,
      fecha_medicion: measurement.created_at,
      docente: measurement.teacher_name || "",
      correo_docente: measurement.teacher_email || "",
      curso: measurement.course_name || "",
      categoria_principal: detail.question_code?.split("_")[0]?.toUpperCase(),
      subcategoria: detail.question_code?.toUpperCase(),
      descripcion: detail.question_text,
      tiempo_segundos: detail.measured_seconds,
      tiempo_horas: detail.measured_hours,
      total_medicion_horas: measurement.total_measured_hours,
    }))
  );

  const measurementSummaryRows = (responses || []).map((response) => {
    const answers = answersByResponseId.get(response.id) || {};
    const durationWeeks = getNumber(answers.q16_duracion_curso_semanas, 1);
    const responseMeasurements = measurementsByResponseId.get(response.id) || [];
    const details = responseMeasurements.flatMap(
      (measurement) => measurement.medicion_detalle || []
    );

    return {
      id_cuestionario: response.id,
      user_id: response.user_id,
      duracion_curso_semanas: durationWeeks,
      q30_total_horas: getTotalHoursByParent(details, "q30"),
      q30_promedio_semanal: getWeeklyAverageByParent(details, "q30", durationWeeks),
      q31_total_horas: getTotalHoursByParent(details, "q31"),
      q31_promedio_semanal: getWeeklyAverageByParent(details, "q31", durationWeeks),
      q32_total_horas: getTotalHoursByParent(details, "q32"),
      q32_promedio_semanal: getWeeklyAverageByParent(details, "q32", durationWeeks),
      q33_total_horas: getTotalHoursByParent(details, "q33"),
      q33_promedio_semanal: getWeeklyAverageByParent(details, "q33", durationWeeks),
      q34_total_horas: getTotalHoursByParent(details, "q34"),
      q34_promedio_semanal: getWeeklyAverageByParent(details, "q34", durationWeeks),
    };
  });

  const dictionaryRows = buildDictionaryRows();

  const workbook = XLSX.utils.book_new();

  const datasetSheet = XLSX.utils.json_to_sheet(datasetRows, {
  header: getDatasetHeaders(),
});

  applyDatasetFormats(datasetSheet);

  const measurementDetailSheet = XLSX.utils.json_to_sheet(measurementDetailRows);
  const measurementSummarySheet = XLSX.utils.json_to_sheet(measurementSummaryRows);
  const dictionarySheet = XLSX.utils.json_to_sheet(dictionaryRows);

  XLSX.utils.book_append_sheet(workbook, datasetSheet, "Dataset");
  XLSX.utils.book_append_sheet(workbook, measurementSummarySheet, "Resumen_Medicion");
  XLSX.utils.book_append_sheet(workbook, measurementDetailSheet, "Detalle_Medicion");
  XLSX.utils.book_append_sheet(workbook, dictionarySheet, "Diccionario");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="dataset_consolidado_esfuerzo_docente.xlsx"',
    },
  });
}