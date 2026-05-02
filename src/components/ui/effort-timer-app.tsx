"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Play,
  Pause,
  RotateCcw,
  Save,
  Trash2,
  Download,
  Clock3,
  Database,
  CheckCircle2,
  FileSpreadsheet,
  LogOut,
  User,
  Info,
} from "lucide-react";

const TIMER_KEYS = [
  {
    id: "q30_1",
    parent: "q30",
    short: "P30.1",
    title: "Definición de objetivos y estructura general",
    prompt:
      "Tiempo dedicado a definir objetivos del curso, resultados de aprendizaje, competencias, unidades temáticas, secuencia de contenidos y organización general del curso.",
  },
  {
    id: "q30_2",
    parent: "q30",
    short: "P30.2",
    title: "Diseño de actividades de aprendizaje",
    prompt:
      "Tiempo dedicado a planear actividades, talleres, ejercicios, foros, trabajos, dinámicas individuales o colaborativas y estrategias de participación de los estudiantes.",
  },
  {
    id: "q30_3",
    parent: "q30",
    short: "P30.3",
    title: "Selección de estrategias pedagógicas y recursos de apoyo",
    prompt:
      "Tiempo dedicado a decidir metodologías, estrategias didácticas, recursos educativos, herramientas tecnológicas, materiales de apoyo y formas de acompañamiento del proceso de aprendizaje.",
  },
  {
    id: "q30_4",
    parent: "q30",
    short: "P30.4",
    title: "Planeación del cronograma y organización del curso",
    prompt:
      "Tiempo dedicado a organizar fechas, semanas, entregas, distribución de actividades, tiempos estimados para estudiantes, secuencia de trabajo y planeación operativa del curso.",
  },
  {
    id: "q31_1",
    parent: "q31",
    short: "P31.1",
    title: "Planeación del material educativo",
    prompt:
      "Tiempo dedicado a definir materiales necesarios, estructura de contenidos, objetivos, secuencia temática y recursos educativos requeridos.",
  },
  {
    id: "q31_2",
    parent: "q31",
    short: "P31.2",
    title: "Elaboración de contenidos propios",
    prompt:
      "Tiempo dedicado a redactar guías, documentos, presentaciones, lecturas, talleres, ejemplos, ejercicios o materiales diseñados directamente por el docente.",
  },
  {
    id: "q31_3",
    parent: "q31",
    short: "P31.3",
    title: "Producción o edición multimedia",
    prompt:
      "Tiempo dedicado a grabar, editar o adaptar videos, audios, imágenes, infografías, simulaciones, recursos interactivos o material audiovisual.",
  },
  {
    id: "q31_4",
    parent: "q31",
    short: "P31.4",
    title: "Búsqueda, selección y adaptación de recursos externos",
    prompt:
      "Tiempo dedicado a localizar, revisar, curar, adaptar o contextualizar materiales existentes, como artículos, videos, repositorios, objetos virtuales de aprendizaje o recursos abiertos.",
  },
  {
    id: "q32_1",
    parent: "q32",
    short: "P32.1",
    title: "Carga y organización de materiales en la plataforma",
    prompt:
      "Tiempo dedicado a subir archivos, enlaces, videos, documentos, presentaciones o recursos educativos al LMS.",
  },
  {
    id: "q32_2",
    parent: "q32",
    short: "P32.2",
    title: "Configuración del curso en el LMS",
    prompt:
      "Tiempo dedicado a organizar módulos, secciones, fechas, disponibilidad de contenidos, permisos, grupos o estructura general del curso.",
  },
  {
    id: "q32_3",
    parent: "q32",
    short: "P32.3",
    title: "Configuración de actividades y herramientas",
    prompt:
      "Tiempo dedicado a crear tareas, foros, cuestionarios, enlaces de videoconferencia, actividades interactivas, herramientas externas o recursos colaborativos.",
  },
  {
    id: "q32_4",
    parent: "q32",
    short: "P32.4",
    title: "Pruebas y verificación de funcionamiento",
    prompt:
      "Tiempo dedicado a revisar que materiales, enlaces, actividades, permisos, fechas, cuestionarios o recursos funcionen correctamente antes de ser usados por los estudiantes.",
  },
  {
    id: "q33_1",
    parent: "q33",
    short: "P33.1",
    title: "Diseño de la evaluación",
    prompt:
      "Tiempo dedicado al diseño de evaluaciones, rúbricas, criterios de calificación, cuestionarios, talleres, exámenes o actividades evaluativas.",
  },
  {
    id: "q33_2",
    parent: "q33",
    short: "P33.2",
    title: "Configuración de la evaluación",
    prompt:
      "Tiempo dedicado a configurar evaluaciones en la plataforma, incluyendo fechas, intentos, ponderaciones, bancos de preguntas, rúbricas, restricciones o grupos.",
  },
  {
    id: "q33_3",
    parent: "q33",
    short: "P33.3",
    title: "Calificación",
    prompt:
      "Tiempo dedicado a revisar entregas, asignar notas, aplicar rúbricas, corregir respuestas abiertas o validar resultados generados automáticamente.",
  },
  {
    id: "q33_4",
    parent: "q33",
    short: "P33.4",
    title: "Retroalimentación de resultados",
    prompt:
      "Tiempo dedicado a entregar comentarios, observaciones individuales o grupales, explicar resultados, responder dudas sobre calificaciones o hacer devoluciones.",
  },
  {
    id: "q34_1",
    parent: "q34",
    short: "P34.1",
    title: "Respuesta a mensajes, correos y consultas individuales",
    prompt:
      "Tiempo dedicado a responder mensajes privados, correos electrónicos, preguntas individuales o solicitudes específicas de estudiantes.",
  },
  {
    id: "q34_2",
    parent: "q34",
    short: "P34.2",
    title: "Participación y moderación en foros o canales grupales",
    prompt:
      "Tiempo dedicado a responder, moderar, orientar o dinamizar discusiones en foros, chats, grupos o espacios colectivos.",
  },
  {
    id: "q34_3",
    parent: "q34",
    short: "P34.3",
    title: "Tutorías o asesorías sincrónicas",
    prompt:
      "Tiempo dedicado a reuniones, tutorías, videollamadas, asesorías individuales o grupales con estudiantes.",
  },
  {
    id: "q34_4",
    parent: "q34",
    short: "P34.4",
    title: "Comunicación general del curso",
    prompt:
      "Tiempo dedicado a publicar anuncios, recordatorios, instrucciones, aclaraciones generales, novedades o información administrativa del curso.",
  },
] as const;

const TIMER_SECTIONS = [
  {
    id: "q30",
    short: "P30",
    title: "Planificación y diseño del curso",
    description:
      "Medición del tiempo dedicado a estructurar el curso, planear actividades, seleccionar estrategias pedagógicas y organizar el desarrollo semanal del curso.",
  },
  {
    id: "q31",
    short: "P31",
    title: "Desarrollo de materiales y recursos educativos",
    description:
      "Medición del tiempo dedicado a planear, crear, adaptar y producir recursos educativos para el curso.",
  },
  {
    id: "q32",
    short: "P32",
    title: "Implementación",
    description:
      "Medición del tiempo dedicado a cargar, organizar, configurar y verificar el funcionamiento del curso en la plataforma.",
  },
  {
    id: "q33",
    short: "P33 ",
    title: "Evaluación",
    description:
      "Medición del tiempo dedicado al diseño, configuración, calificación y retroalimentación de actividades evaluativas.",
  },
  {
    id: "q34",
    short: "P34",
    title: "Comunicación con estudiantes",
    description:
      "Medición del tiempo dedicado a la comunicación individual, grupal, sincrónica y general con los estudiantes.",
  },
] as const;

const STORAGE_KEY = "esfuerzo_docente_registros_auth_v1";
function getDraftStorageKey(userId: string) {
  return `esfuerzo_docente_borrador_actual_${userId}`;
}

type TimerState = {
  elapsed: number;
  isRunning: boolean;
  startedAt: number | null;
};

type TimerMap = Record<string, TimerState>;

type CourseRecord = {
  responseId: string;
  courseName: string;
  durationWeeks: number;
  answers: Record<string, any>;
};

type RecordItem = {
  id: string;
  createdAt: string;
  teacherName: string | null;
  teacherEmail: string | null;
  courseName: string | null;
  totalMeasuredSeconds: number;
  totalMeasuredHours: number;
  timers: {
    id: string;
    question: string;
    measuredSeconds: number;
    measuredHours: number;
  }[];
};

function formatSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function toHours(seconds: number) {
  return Number((seconds / 3600).toFixed(2));
}

function buildEmptyTimers(): TimerMap {
  return Object.fromEntries(
    TIMER_KEYS.map((item) => [
      item.id,
      { elapsed: 0, isRunning: false, startedAt: null },
    ])
  );
}

function getSavedDraft(currentUserId: string) {
  if (typeof window === "undefined") return null;
  if (!currentUserId) return null;

  const savedDraft = localStorage.getItem(getDraftStorageKey(currentUserId));

  if (!savedDraft) return null;

  try {
    return JSON.parse(savedDraft);
  } catch {
    localStorage.removeItem(getDraftStorageKey(currentUserId));
    return null;
  }
}

type TimerCardProps = {
  item: {
    id: string;
    parent: string;
    short: string;
    title: string;
    prompt: string;
  };
  elapsed: number;
  isRunning: boolean;
  isBlocked: boolean;
  onStartPause: () => void;
  onReset: () => void;
};

function TimerCard({
  item,
  elapsed,
  isRunning,
  isBlocked,
  onStartPause,
  onReset,
}: TimerCardProps) {
  const measuredHours = toHours(elapsed);

  return (
    <Card className="rounded-2xl border-0 bg-white/90 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge className="mb-2 rounded-full">{item.short}</Badge>
            <CardTitle className="text-lg leading-snug">
              {item.title}
            </CardTitle>
            <p className="mt-2 text-sm text-slate-600">{item.prompt}</p>
          </div>
          <Clock3 className="mt-1 h-5 w-5 shrink-0 text-slate-500" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-5 text-center">
          <div className="text-4xl font-semibold tracking-tight">
            {formatSeconds(elapsed)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Tiempo medido directamente
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onStartPause} className="rounded-2xl" disabled={isBlocked}>
            {isRunning ? (
              <Pause className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isRunning ? "Pausar" : isBlocked ? "Bloqueado" : "Iniciar"}
          </Button>

          <Button variant="outline" onClick={onReset} className="rounded-2xl">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reiniciar
          </Button>
        </div>

        {isBlocked && (
          <p className="text-sm text-slate-500">
            Hay otra actividad en medición. Pausa el cronómetro activo para iniciar esta.
          </p>
        )}

        <div className="space-y-2">
          <Label>Horas medidas</Label>
          <Input
            value={String(measuredHours)}
            readOnly
            className="rounded-xl bg-slate-50"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function EffortTimerApp() {
  const [userId, setUserId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [courseName, setCourseName] = useState("");
  const [status, setStatus] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [timers, setTimers] = useState<TimerMap>(buildEmptyTimers);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [selectedResponseId, setSelectedResponseId] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(1);
  const [activeTimerSection, setActiveTimerSection] = useState("q30");
  const [now, setNow] = useState(Date.now());

  function loadDraftForUser(currentUserId: string) {
    const savedDraft = localStorage.getItem(getDraftStorageKey(currentUserId));

    if (!savedDraft) {
      setSelectedResponseId("");
      setCourseName("");
      setDurationWeeks(1);
      setTimers(buildEmptyTimers());
      return;
    }

    try {
      const draft = JSON.parse(savedDraft);

      setSelectedResponseId(draft.selectedResponseId || "");
      setCourseName(draft.courseName || "");
      setDurationWeeks(Number(draft.durationWeeks || 1));

      if (draft.timers) {
        const emptyTimers = buildEmptyTimers();
        const restoredTimers = { ...emptyTimers };

        for (const item of TIMER_KEYS) {
          if (draft.timers[item.id]) {
            restoredTimers[item.id] = {
              elapsed: Number(draft.timers[item.id].elapsed || 0),
              isRunning: false,
              startedAt: null,
            };
          }
        }

        setTimers(restoredTimers);
      }
    } catch {
      localStorage.removeItem(getDraftStorageKey(currentUserId));
    }
  }

useEffect(() => {
  if (!userId) return;

  const hasAnyTime = TIMER_KEYS.some(
    (item) => getTimerElapsed(timers[item.id]) > 0
  );

  if (!courseName && !selectedResponseId && !hasAnyTime) return;

  const timersForDraft = Object.fromEntries(
    TIMER_KEYS.map((item) => [
      item.id,
      {
        elapsed: getTimerElapsed(timers[item.id]),
        isRunning: timers[item.id].isRunning,
        startedAt: timers[item.id].startedAt,
      },
    ])
  );

  const draft = {
    courseName,
    selectedResponseId,
    durationWeeks,
    timers: timersForDraft,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(getDraftStorageKey(userId), JSON.stringify(draft));
}, [userId, courseName, selectedResponseId, durationWeeks, timers, now]);

  useEffect(() => {
    loadAuthenticatedUser();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  function getTimerElapsed(timer: TimerState) {
    if (!timer.isRunning || !timer.startedAt) {
      return timer.elapsed;
    }

    return timer.elapsed + Math.floor((now - timer.startedAt) / 1000);
  }

  const totalMeasuredSeconds = useMemo(
    () =>
      TIMER_KEYS.reduce(
        (acc, item) => acc + getTimerElapsed(timers[item.id]),
        0
      ),
    [timers, now]
  );

  const activeTimerId = useMemo(() => {
  const activeTimer = TIMER_KEYS.find((item) => timers[item.id].isRunning);
  return activeTimer?.id || null;
  }, [timers]);

  async function fetchRegisteredCourses() {
    const { data, error } = await supabase
      .from("questionnaire_responses")
      .select(
        `
        id,
        created_at,
        questionnaire_answers (
          answers
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      setStatus("No fue posible cargar los cursos registrados.");
      return;
    }

    const normalizedCourses: CourseRecord[] = (data || []).map((item: any) => {
      const answers = item.questionnaire_answers?.[0]?.answers || {};

      return {
        responseId: item.id,
        courseName: answers.q11_nombre_curso || "Curso sin nombre",
        durationWeeks: Number(answers.q16_duracion_curso_semanas || 1),
        answers,
      };
    });

    setCourses(normalizedCourses);

    // Si el usuario no tiene cursos registrados, limpiar todo lo relacionado al curso.
    if (normalizedCourses.length === 0) {
      setSelectedResponseId("");
      setCourseName("");
      setDurationWeeks(1);
      return;
    }

    // Verificar si el curso actualmente seleccionado todavía existe
    // dentro de los cursos del usuario autenticado.
    const selectedCourseStillExists = normalizedCourses.find(
      (course) => course.responseId === selectedResponseId
    );

    // Si no hay curso seleccionado, o el seleccionado viene de otro usuario/borrador viejo,
    // seleccionar automáticamente el primer curso disponible del usuario actual.
    if (!selectedResponseId || !selectedCourseStillExists) {
      const firstCourse = normalizedCourses[0];

      setSelectedResponseId(firstCourse.responseId);
      setCourseName(firstCourse.courseName);
      setDurationWeeks(firstCourse.durationWeeks > 0 ? firstCourse.durationWeeks : 1);
      return;
    }

    // Si el curso seleccionado sí existe, refrescar sus datos desde Supabase.
    setCourseName(selectedCourseStillExists.courseName);
    setDurationWeeks(
      selectedCourseStillExists.durationWeeks > 0
        ? selectedCourseStillExists.durationWeeks
        : 1
    );
  }

  async function exportConsolidatedExcel() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setStatus("No hay sesión activa.");
      return;
    }

    const response = await fetch("/api/export/consolidated-excel", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      setStatus(
        errorData?.error || "No fue posible exportar el dataset consolidado."
      );
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "dataset_consolidado_esfuerzo_docente.xlsx";
    link.click();

    URL.revokeObjectURL(url);
  }

  async function loadAuthenticatedUser() {
  setLoadingUser(true);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    setLoadingUser(false);
    setStatus("No fue posible cargar el usuario autenticado.");
    return;
  }

  setUserId(user.id);
  loadDraftForUser(user.id);

  const fallbackName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  const fallbackEmail = user.email || "";

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    setTeacherName(profile.full_name || fallbackName);
    setTeacherEmail(profile.email || fallbackEmail);
  } else {
    setTeacherName(fallbackName);
    setTeacherEmail(fallbackEmail);

    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fallbackName,
      email: fallbackEmail,
    });
  }

  setLoadingUser(false);
  await fetchRemoteRecords();
  await fetchRegisteredCourses();
}

  function handleSelectCourse(responseId: string) {
    setSelectedResponseId(responseId);

    const selectedCourse = courses.find(
      (course) => course.responseId === responseId
    );

    if (!selectedCourse) return;

    setCourseName(selectedCourse.courseName);
    setDurationWeeks(
      selectedCourse.durationWeeks > 0 ? selectedCourse.durationWeeks : 1
    );

    setStatus(
      `Curso seleccionado: ${selectedCourse.courseName}. Duración: ${selectedCourse.durationWeeks} semanas.`
    );
  }

  function handleStartPause(id: string) {
    setTimers((current) => {
      const selectedTimer = current[id];

      if (selectedTimer.isRunning) {
        return {
          ...current,
          [id]: {
            ...selectedTimer,
            elapsed: getTimerElapsed(selectedTimer),
            isRunning: false,
            startedAt: null,
          },
        };
      }

      return {
        ...current,
        [id]: {
          ...selectedTimer,
          isRunning: true,
          startedAt: Date.now(),
        },
      };
    });
  }

  function handleReset(id: string) {
    setTimers((current) => ({
      ...current,
      [id]: {
        ...current[id],
        elapsed: 0,
        isRunning: false,
        startedAt: null,
      },
    }));
  }

  function resetAll() {
    setTimers(buildEmptyTimers());

    if (userId) {
      localStorage.removeItem(getDraftStorageKey(userId));
    }

    setStatus("Cronómetros reiniciados.");
  }

  function buildPayload() {
    return {
      user_id: userId,
      response_id: selectedResponseId || null,
      teacher_name: teacherName || null,
      teacher_email: teacherEmail || null,
      course_name: courseName || null,
      duration_weeks: durationWeeks,
      total_measured_seconds: totalMeasuredSeconds,
      total_measured_hours: toHours(totalMeasuredSeconds),
      details: TIMER_KEYS.map((item) => ({
        question_code: item.id,
        question_text: item.prompt,
        measured_seconds: getTimerElapsed(timers[item.id]),
        measured_hours: toHours(getTimerElapsed(timers[item.id])),
      })),
    };
  }

async function exportAllJson() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    setStatus("No hay sesión activa.");
    return;
  }

  const response = await fetch("/api/export/all-json", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    setStatus("No fue posible exportar todos los registros.");
    return;
  }

  const data = await response.json();

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "todos_los_registros_esfuerzo_docente.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function exportAllExcel() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    setStatus("No hay sesión activa.");
    return;
  }

  const response = await fetch("/api/export/all-excel", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    setStatus("No fue posible exportar todos los registros.");
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "todos_los_registros_esfuerzo_docente.xlsx";
  link.click();

  URL.revokeObjectURL(url);
}

  async function fetchRemoteRecords() {
    if (!supabase) return;

    setLoadingRemote(true);
    setStatus("Cargando registros...");

    const { data, error } = await supabase
      .from("mediciones_docentes")
      .select(
        `
        id,
        created_at,
        response_id,
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
      .order("created_at", { ascending: false });

    setLoadingRemote(false);

    if (error) {
      setStatus("No fue posible cargar los registros.");
      return;
    }

    const normalized: RecordItem[] = (data || []).map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      teacherName: row.teacher_name,
      teacherEmail: row.teacher_email,
      courseName: row.course_name,
      totalMeasuredSeconds: row.total_measured_seconds,
      totalMeasuredHours: row.total_measured_hours,
      timers: (row.medicion_detalle || []).map((detail: any) => ({
        id: detail.question_code,
        question: detail.question_text,
        measuredSeconds: detail.measured_seconds,
        measuredHours: detail.measured_hours,
      })),
    }));

    setRecords(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    setStatus("Registros cargados correctamente.");
  }

  async function saveRecord() {
    if (!userId) {
      setStatus("No hay usuario autenticado. Inicia sesión nuevamente.");
      return;
    }

    if (!selectedResponseId) {
      setStatus("Debe seleccionar un curso registrado antes de guardar la medición.");
      return;
    }

    const payload = buildPayload();

    if (payload.total_measured_seconds === 0) {
      setStatus("No hay tiempo medido para guardar.");
      return;
    }

    setSaving(true);

    const { data: inserted, error: headerError } = await supabase
      .from("mediciones_docentes")
      .insert({
        user_id: payload.user_id,
        response_id: payload.response_id,
        teacher_name: payload.teacher_name,
        teacher_email: payload.teacher_email,
        course_name: payload.course_name,
        total_measured_seconds: payload.total_measured_seconds,
        total_measured_hours: payload.total_measured_hours,
      })
      .select()
      .single();

    if (headerError || !inserted) {
      setSaving(false);
      setStatus("Error al guardar la medición principal.");
      return;
    }

    const detailRows = payload.details.map((detail) => ({
      medicion_id: inserted.id,
      question_code: detail.question_code,
      question_text: detail.question_text,
      measured_seconds: detail.measured_seconds,
      measured_hours: detail.measured_hours,
    }));

    const { error: detailError } = await supabase
      .from("medicion_detalle")
      .insert(detailRows);

    if (detailError) {
      setSaving(false);
      setStatus("La medición principal se guardó, pero falló el detalle.");
      return;
    }

    setSaving(false);
    setStatus("Registro guardado correctamente.");
    if (userId) {
      localStorage.removeItem(getDraftStorageKey(userId));
    }
    setTimers(buildEmptyTimers());
    await fetchRemoteRecords();
  }

  async function deleteRecord(id: string) {
    const { error } = await supabase
      .from("mediciones_docentes")
      .delete()
      .eq("id", id);

    if (error) {
      setStatus("No fue posible eliminar el registro.");
      return;
    }

    setStatus("Registro eliminado correctamente.");
    await fetchRemoteRecords();
  }

  async function handleLogout() {
    if (userId) {
      localStorage.removeItem(getDraftStorageKey(userId));
    }

    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-sm">
          Validando usuario...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {!supabaseConfigured && (
          <Alert className="rounded-2xl border-amber-300 bg-amber-50">
            <Database className="h-4 w-4" />
            <AlertDescription>
              Debes configurar las variables{" "}
              <strong>NEXT_PUBLIC_SUPABASE_URL</strong> y{" "}
              <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong>.
            </AlertDescription>
          </Alert>
        )}

        {supabaseConfigured && (
          <Alert className="rounded-2xl border-emerald-300 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Sesión iniciada. Los registros se guardarán asociados a tu usuario.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col justify-between gap-4 rounded-3xl border-0 bg-white/95 p-5 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 p-3">
              <User className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">
                {teacherName || "Usuario autenticado"}
              </div>
              <div className="text-sm text-slate-600">{teacherEmail}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                window.location.href = "/course/new";
              }}
            >
              Registrar curso
            </Button>

            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                window.location.href = "/profile";
              }}
            >
              Perfil
            </Button>

            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl border-0 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">¿Cómo usar la aplicación?</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>
              Esta aplicación permite registrar información inicial del curso y medir,
              mediante cronómetros, el tiempo dedicado a actividades docentes específicas.
            </p>

            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Primero, use el botón <strong>Registrar curso</strong> para diligenciar
                la información inicial del docente, del curso y de su contexto académico.
              </li>
              <li>
                Luego, seleccione el curso en el campo <strong>Curso registrado</strong>.
                La aplicación cargará automáticamente el nombre del curso y su duración
                en semanas.
              </li>
              <li>
                Use las pestañas <strong>P30 a P34</strong> para elegir la categoría de
                actividad docente que desea medir.
              </li>
              <li>
                Inicie el cronómetro correspondiente a la actividad que está realizando.
                Solo puede haber un cronómetro activo a la vez.
              </li>
              <li>
                Al finalizar una sesión de trabajo, presione <strong>Guardar registro</strong> para almacenar los tiempos medidos en la base de datos.
              </li>
              <li>
                Use <strong>Exportar dataset en Excel</strong> para generar el archivo
                consolidado con las respuestas del formulario, los tiempos medidos y el
                diccionario de variables.
              </li>
            </ol>

            <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <span className="font-semibold">Importante:</span> Si la página se cierra o
                se actualiza antes de guardar, la aplicación recuperará el borrador de la
                medición en este navegador.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="rounded-3xl border-0 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl">
                  Aplicación web para recolección de datos del curso y medición de tiempos en actividades docentes
              </CardTitle>
              <p className="text-sm text-slate-600 md:text-base">
                Permite registrar información del docente y del curso, así como cronometrar el tiempo dedicado a actividades de planificación, 
                diseño, desarrollo de recursos, implementación, evaluación y comunicación con estudiantes.
              </p>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-3">
                <Label>Curso registrado</Label>
                <select
                  value={selectedResponseId}
                  onChange={(e) => handleSelectCourse(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  {courses.length === 0 ? (
                    <option value="">No hay cursos registrados</option>
                  ) : (
                    courses.map((course) => (
                      <option key={course.responseId} value={course.responseId}>
                        {course.courseName} - {course.durationWeeks} semanas
                      </option>
                    ))
                  )}
                </select>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 rounded-2xl"
                  disabled={!selectedResponseId}
                  onClick={() => {
                    window.location.href = `/course/edit/${selectedResponseId}`;
                  }}
                >
                  Editar curso
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Nombre del docente</Label>
                <Input
                  value={teacherName}
                  readOnly
                  className="rounded-xl bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <Label>Correo del docente</Label>
                <Input
                  type="email"
                  value={teacherEmail}
                  readOnly
                  className="rounded-xl bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <Label>Curso seleccionado</Label>
                <Input
                  value={courseName}
                  readOnly
                  className="rounded-xl bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <Label>Duración del curso en semanas</Label>
                <Input
                  value={selectedResponseId ? String(durationWeeks) : ""}
                  readOnly
                  className="rounded-xl bg-slate-50"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Resumen</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">
                  Tiempo total medido
                </div>
                <div className="mt-1 text-3xl font-semibold">
                  {formatSeconds(totalMeasuredSeconds)}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {toHours(totalMeasuredSeconds)} horas
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={saveRecord}
                  className="rounded-2xl"
                  disabled={saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar registro"}
                </Button>

                <Button
                  variant="outline"
                  onClick={exportConsolidatedExcel}
                  className="rounded-2xl"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar dataset en Excel
                </Button>

                <Button
                  variant="outline"
                  onClick={resetAll}
                  className="rounded-2xl"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reiniciar todo
                </Button>
              </div>

              {status && <p className="text-sm text-slate-600">{status}</p>}
            </CardContent>
          </Card>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900">
              Medición de tiempos por actividad docente
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Seleccione una categoría para registrar el tiempo dedicado a sus actividades específicas.
            </p>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {TIMER_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveTimerSection(section.id)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  activeTimerSection === section.id
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {section.short} {section.title}
              </button>
            ))}
          </div>

          {TIMER_SECTIONS.filter((section) => section.id === activeTimerSection).map(
            (section) => {
              const sectionTimers = TIMER_KEYS.filter(
                (item) => item.parent === section.id
              );

              const sectionTotalSeconds = sectionTimers.reduce(
                (acc, item) => acc + timers[item.id].elapsed,
                0
              );

              return (
                <section key={section.id}>
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-full">{section.short}</Badge>
                        <h3 className="text-xl font-semibold text-slate-900">
                          {section.title}
                        </h3>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {section.description}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                      <div className="text-xs text-slate-500">
                        Total de la categoría
                      </div>
                      <div className="text-lg font-semibold text-slate-900">
                        {formatSeconds(sectionTotalSeconds)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {toHours(sectionTotalSeconds)} horas
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    {sectionTimers.map((item) => (
                      <TimerCard
                        key={item.id}
                        item={item}
                        elapsed={getTimerElapsed(timers[item.id])}
                        isRunning={timers[item.id].isRunning}
                        isBlocked={activeTimerId !== null && activeTimerId !== item.id}
                        onStartPause={() => handleStartPause(item.id)}
                        onReset={() => handleReset(item.id)}
                      />
                    ))}
                  </div>
                </section>
              );
            }
          )}
        </div>

        <Card className="rounded-3xl border-0 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Registros guardados</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {loadingRemote && (
              <p className="text-slate-600">Cargando registros...</p>
            )}

            {!loadingRemote && records.length === 0 ? (
              <p className="text-slate-600">Aún no hay registros guardados.</p>
            ) : (
              records.map((record) => (
                <div
                  key={record.id}
                  className="space-y-4 rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">
                        {record.teacherName || "Docente sin nombre"}
                      </div>
                      <div className="text-sm text-slate-600">
                        {record.courseName || "Curso no especificado"}
                      </div>
                      {record.teacherEmail && (
                        <div className="mt-1 text-sm text-slate-500">
                          {record.teacherEmail}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{record.totalMeasuredHours} h medidas</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRecord(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {record.timers.map((timer) => (
                      <div key={timer.id} className="rounded-xl bg-slate-50 p-3">
                        <div className="text-sm font-medium">
                          {timer.id.toUpperCase()}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {timer.question}
                        </div>
                        <div className="mt-3 text-sm">
                          Medido:{" "}
                          <span className="font-medium">
                            {timer.measuredHours} h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}