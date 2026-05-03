import AuthGuard from "@/components/ui/auth-guard";
import CourseQuestionnaireForm from "@/components/ui/course-questionnaire-form";

export default function NewCoursePage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Registro inicial del curso
            </h1>
            <p className="mt-2 text-sm text-slate-600">
                En esta sección se registra una sola vez la información general del docente,
                del curso y de su contexto académico, incluyendo características como duración,
                tiempo en labor asignado, número de estudiantes, módulos, actividades evaluadas,
                porcentajes asociados al diseño del curso y estimaciones iniciales de tiempo
                semanal. Posteriormente, la aplicación permitirá contrastar estas estimaciones
                con los tiempos registrados mediante cronómetros.

            </p>
          </div>

          <CourseQuestionnaireForm />
        </div>
      </div>
    </AuthGuard>
  );
}