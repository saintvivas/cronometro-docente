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
} from "lucide-react";

const TIMER_KEYS = [
  {
    id: "q31",
    short: "P31",
    title: "Desarrollo de materiales y recursos",
    prompt:
      "Promedio de horas invertidas estimadas a la semana en el desarrollo de materiales y recursos",
  },
  {
    id: "q32",
    short: "P32",
    title: "Implementación",
    prompt:
      "Promedio de horas invertidas estimadas a la semana en implementación (subida de materiales, configuración, pruebas, etc.)",
  },
  {
    id: "q33",
    short: "P33",
    title: "Evaluación",
    prompt:
      "Promedio de horas invertidas estimadas a la semana en evaluación",
  },
  {
    id: "q34",
    short: "P34",
    title: "Comunicación con estudiantes",
    prompt:
      "Promedio de horas invertidas estimadas a la semana en comunicación con estudiantes (mensajes, foros, correos, tutorías, retroalimentación, etc.)",
  },
] as const;

const STORAGE_KEY = "esfuerzo_docente_registros_v5";

type TimerState = {
  elapsed: number;
  isRunning: boolean;
};

type TimerMap = Record<string, TimerState>;

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
      { elapsed: 0, isRunning: false },
    ])
  );
}

type TimerCardProps = {
  item: {
    id: string;
    short: string;
    title: string;
    prompt: string;
  };
  elapsed: number;
  isRunning: boolean;
  onStartPause: () => void;
  onReset: () => void;
};

function TimerCard({
  item,
  elapsed,
  isRunning,
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
            <CardTitle className="text-lg leading-snug">{item.title}</CardTitle>
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
          <Button onClick={onStartPause} className="rounded-2xl">
            {isRunning ? (
              <Pause className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isRunning ? "Pausar" : "Iniciar"}
          </Button>

          <Button variant="outline" onClick={onReset} className="rounded-2xl">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reiniciar
          </Button>
        </div>

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
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [courseName, setCourseName] = useState("");
  const [status, setStatus] = useState("");
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [timers, setTimers] = useState<TimerMap>(buildEmptyTimers);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((current) => {
        const next = { ...current };
        let changed = false;

        for (const item of TIMER_KEYS) {
          if (next[item.id].isRunning) {
            next[item.id] = {
              ...next[item.id],
              elapsed: next[item.id].elapsed + 1,
            };
            changed = true;
          }
        }

        return changed ? next : current;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    fetchRemoteRecords();
  }, []);

  const totalMeasuredSeconds = useMemo(
    () => TIMER_KEYS.reduce((acc, item) => acc + timers[item.id].elapsed, 0),
    [timers]
  );

  function handleStartPause(id: string) {
    setTimers((current) => ({
      ...current,
      [id]: { ...current[id], isRunning: !current[id].isRunning },
    }));
  }

  function handleReset(id: string) {
    setTimers((current) => ({
      ...current,
      [id]: { ...current[id], elapsed: 0, isRunning: false },
    }));
  }

  function resetAll() {
    setTimers(buildEmptyTimers());
    setTeacherName("");
    setTeacherEmail("");
    setCourseName("");
    setStatus("Sesión reiniciada.");
  }

  function buildPayload() {
    return {
      teacher_name: teacherName || null,
      teacher_email: teacherEmail || null,
      course_name: courseName || null,
      total_measured_seconds: totalMeasuredSeconds,
      total_measured_hours: toHours(totalMeasuredSeconds),
      details: TIMER_KEYS.map((item) => ({
        question_code: item.id,
        question_text: item.prompt,
        measured_seconds: timers[item.id].elapsed,
        measured_hours: toHours(timers[item.id].elapsed),
      })),
    };
  }

  async function fetchRemoteRecords() {
    if (!supabase) return;

    setLoadingRemote(true);
    setStatus("Cargando registros desde Supabase...");

    const { data, error } = await supabase
      .from("mediciones_docentes")
      .select(
        `
        id,
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
      .order("created_at", { ascending: false });

    setLoadingRemote(false);

    if (error) {
      setStatus("No fue posible cargar los registros remotos.");
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
    setStatus("Registros cargados desde Supabase.");
  }

  async function saveRecord() {
    const payload = buildPayload();
    setSaving(true);

    if (!supabase) {
      const localRecord: RecordItem = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        teacherName,
        teacherEmail,
        courseName,
        totalMeasuredSeconds: payload.total_measured_seconds,
        totalMeasuredHours: payload.total_measured_hours,
        timers: payload.details.map((detail) => ({
          id: detail.question_code,
          question: detail.question_text,
          measuredSeconds: detail.measured_seconds,
          measuredHours: detail.measured_hours,
        })),
      };

      const next = [localRecord, ...records];
      setRecords(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaving(false);
      setStatus("Registro guardado localmente. Configura Supabase para persistencia real.");
      return;
    }

    const { data: inserted, error: headerError } = await supabase
      .from("mediciones_docentes")
      .insert({
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
      setStatus("Error al guardar la medición principal en Supabase.");
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
    setStatus("Registro guardado correctamente en Supabase.");
    await fetchRemoteRecords();
  }

  async function deleteRecord(id: string) {
    if (!supabase) {
      const next = records.filter((record) => record.id !== id);
      setRecords(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStatus("Registro eliminado localmente.");
      return;
    }

    const { error } = await supabase
      .from("mediciones_docentes")
      .delete()
      .eq("id", id);

    if (error) {
      setStatus("No fue posible eliminar el registro.");
      return;
    }

    setStatus("Registro eliminado de Supabase.");
    await fetchRemoteRecords();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(records, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "registros_esfuerzo_docente.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const rows = records.flatMap((record) =>
      record.timers.map((timer) => ({
        fecha_registro: record.createdAt,
        docente: record.teacherName || "",
        correo_docente: record.teacherEmail || "",
        curso: record.courseName || "",
        pregunta: timer.id.toUpperCase(),
        descripcion: timer.question,
        tiempo_segundos: timer.measuredSeconds,
        tiempo_horas: timer.measuredHours,
        total_medicion_horas: record.totalMeasuredHours,
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mediciones");
    XLSX.writeFile(workbook, "registros_esfuerzo_docente.xlsx");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {!supabaseConfigured && (
          <Alert className="rounded-2xl border-amber-300 bg-amber-50">
            <Database className="h-4 w-4" />
            <AlertDescription>
              Debes configurar las variables <strong>NEXT_PUBLIC_SUPABASE_URL</strong> y{" "}
              <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong>.
            </AlertDescription>
          </Alert>
        )}

        {supabaseConfigured && (
          <Alert className="rounded-2xl border-emerald-300 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Supabase configurado. La aplicación ya puede cargar y guardar mediciones.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="rounded-3xl border-0 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl">
                Aplicación web para medición directa del esfuerzo docente
              </CardTitle>
              <p className="text-sm text-slate-600 md:text-base">
                Cronometra las preguntas 31, 32, 33 y 34, guarda la medición directa
                del docente y expórtala para su análisis posterior.
              </p>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Nombre del docente</Label>
                <Input
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Correo del docente</Label>
                <Input
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="docente@correo.com"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Curso</Label>
                <Input
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="rounded-xl"
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
                <div className="text-sm text-slate-500">Tiempo total medido</div>
                <div className="mt-1 text-3xl font-semibold">
                  {formatSeconds(totalMeasuredSeconds)}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {toHours(totalMeasuredSeconds)} horas
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={saveRecord} className="rounded-2xl" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar registro"}
                </Button>

                <Button variant="outline" onClick={exportJson} className="rounded-2xl">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar JSON
                </Button>

                <Button variant="outline" onClick={exportExcel} className="rounded-2xl">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar Excel
                </Button>

                <Button variant="outline" onClick={resetAll} className="rounded-2xl">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reiniciar todo
                </Button>
              </div>

              {status && <p className="text-sm text-slate-600">{status}</p>}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {TIMER_KEYS.map((item) => (
            <TimerCard
              key={item.id}
              item={item}
              elapsed={timers[item.id].elapsed}
              isRunning={timers[item.id].isRunning}
              onStartPause={() => handleStartPause(item.id)}
              onReset={() => handleReset(item.id)}
            />
          ))}
        </div>

        <Card className="rounded-3xl border-0 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Registros guardados</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {loadingRemote && <p className="text-slate-600">Cargando registros...</p>}

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
                        <div className="text-sm font-medium">{timer.id.toUpperCase()}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {timer.question}
                        </div>
                        <div className="mt-3 text-sm">
                          Medido: <span className="font-medium">{timer.measuredHours} h</span>
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