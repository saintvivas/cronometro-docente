import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

  const { data, error } = await supabaseAdmin
    .from("mediciones_docentes")
    .select(
      `
      id,
      created_at,
      user_id,
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

  if (error) {
    return NextResponse.json(
      { error: "No fue posible consultar los registros." },
      { status: 500 }
    );
  }

  const resumenRows = (data || []).map((record: any) => ({
    id_registro: record.id,
    fecha_registro: record.created_at,
    user_id: record.user_id,
    docente: record.teacher_name || "",
    correo_docente: record.teacher_email || "",
    curso: record.course_name || "",
    total_segundos: record.total_measured_seconds,
    total_horas: record.total_measured_hours,
  }));

  const detalleRows = (data || []).flatMap((record: any) =>
    (record.medicion_detalle || []).map((timer: any) => ({
      id_registro: record.id,
      fecha_registro: record.created_at,
      user_id: record.user_id,
      docente: record.teacher_name || "",
      correo_docente: record.teacher_email || "",
      curso: record.course_name || "",
      categoria_principal: timer.question_code?.split("_")[0]?.toUpperCase(),
      pregunta: timer.question_code?.toUpperCase(),
      descripcion: timer.question_text,
      tiempo_segundos: timer.measured_seconds,
      tiempo_horas: timer.measured_hours,
      total_medicion_horas: record.total_measured_hours,
    }))
  );

  const workbook = XLSX.utils.book_new();

  const resumenSheet = XLSX.utils.json_to_sheet(resumenRows);
  const detalleSheet = XLSX.utils.json_to_sheet(detalleRows);

  XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen");
  XLSX.utils.book_append_sheet(workbook, detalleSheet, "Detalle");

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
        'attachment; filename="todos_los_registros_esfuerzo_docente.xlsx"',
    },
  });
}