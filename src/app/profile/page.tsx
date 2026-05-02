"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ProfilePage() {
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const fallbackName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

    const fallbackEmail = user.email || "";

    setEmail(fallbackEmail);

    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setFullName(data.full_name || fallbackName);
      setEmail(data.email || fallbackEmail);
    } else {
      setFullName(fallbackName);

      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fallbackName,
        email: fallbackEmail,
      });
    }
  }

  loadProfile();
}, []);

  async function saveProfile(e: React.FormEvent) {
  e.preventDefault();
  setStatus("");

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    email,
  });

  if (error) {
    setStatus(error.message);
    return;
  }

  setStatus("Perfil actualizado correctamente.");
}

  async function changePassword() {
    setStatus("");

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Contraseña actualizada correctamente.");
    setNewPassword("");
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Perfil de usuario</h1>

        <Link
            href="/"
            className="mt-4 inline-block rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
            Atrás
        </Link>

        <form onSubmit={saveProfile}>
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
              className="w-full rounded-xl border px-3 py-2 bg-slate-50"
              value={email}
              readOnly
            />
          </div>

          <button
            type="submit"
            className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-white"
          >
            Guardar perfil
          </button>
        </form>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">Cambiar contraseña</h2>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">Nueva contraseña</label>
            <input
              type="password"
              className="w-full rounded-xl border px-3 py-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <button
            onClick={changePassword}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-white"
          >
            Actualizar contraseña
          </button>
        </div>

        {status && <p className="mt-4 text-sm text-slate-600">{status}</p>}
      </div>
    </div>
  );
}