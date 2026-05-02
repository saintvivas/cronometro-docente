import AuthGuard from "@/components/ui/auth-guard";
import EffortTimerApp from "@/components/ui/effort-timer-app";

export default function Page() {
  return (
    <AuthGuard>
      <EffortTimerApp />
    </AuthGuard>
  );
}