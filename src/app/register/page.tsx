"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

async function handleRegister(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setStatus("");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  setLoading(false);

  if (error) {
    setStatus(error.message);
    return;
  }

  setStatus("Cuenta creada correctamente. Ahora inicia sesión.");
  router.push("/login");
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="text-2xl font-bold">Registro</h1>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">Nombre completo</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">Correo</label>
          <input
            type="email"
            className="w-full rounded-xl border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">Contraseña</label>
          <input
            type="password"
            className="w-full rounded-xl border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-2 text-white"
        >
          {loading ? "Creando..." : "Crear cuenta"}
        </button>

        <Link
            href="/login"
            className="mt-3 block w-full rounded-xl border border-slate-300 px-4 py-2 text-center text-slate-700 hover:bg-slate-50"
        >
            Iniciar sesión
        </Link>

        {status && <p className="mt-4 text-sm text-slate-600">{status}</p>}
      </form>
    </div>
  );
}