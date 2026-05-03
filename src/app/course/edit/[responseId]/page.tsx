import AuthGuard from "@/components/ui/auth-guard";
import CourseQuestionnaireForm from "@/components/ui/course-questionnaire-form";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ responseId: string }>;
}) {
  const { responseId } = await params;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Editar curso registrado
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Modifique la información del curso registrada previamente. Los cambios se
              verán reflejados en el selector de cursos y en las futuras exportaciones del
              dataset.
            </p>
          </div>

          <CourseQuestionnaireForm responseId={responseId} mode="edit" />
        </div>
      </div>
    </AuthGuard>
  );
}