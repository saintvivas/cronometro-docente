import { NextResponse } from "next/server";
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

  return NextResponse.json(data);
}