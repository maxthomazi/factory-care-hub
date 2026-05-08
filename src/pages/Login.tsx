import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Wrench } from "lucide-react";

export default function Login() {
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sucesso, setSucesso] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(""); setSucesso("");

    if (modo === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Email ou senha incorretos.");
      else navigate("/");
    } else {
      if (!nome.trim()) { setError("Preencha seu nome."); setLoading(false); return; }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message.includes("already") ? "Email já cadastrado." : "Erro ao cadastrar.");
      } else if (data.user) {
        await supabase.from("usuarios").insert({ id: data.user.id, nome: nome.trim(), email, role: "tecnico" });
        setSucesso("Cadastro realizado! Verifique seu email para confirmar a conta.");
        setModo("login");
        setNome(""); setEmail(""); setPassword("");
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Wrench className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">CMMS Pro</span>
          </div>
          <p className="text-sm text-muted-foreground">Gestão de Manutenção Industrial</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h1 className="text-lg font-semibold text-center">
            {modo === "login" ? "Entrar" : "Criar conta"}
          </h1>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {sucesso && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              {sucesso}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {modo === "cadastro" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="text-center">
            {modo === "login" ? (
              <p className="text-sm text-muted-foreground">
                Não tem conta?{" "}
                <button onClick={() => { setModo("cadastro"); setError(""); setSucesso(""); }}
                  className="text-primary font-medium hover:underline">
                  Criar conta
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Já tem conta?{" "}
                <button onClick={() => { setModo("login"); setError(""); setSucesso(""); }}
                  className="text-primary font-medium hover:underline">
                  Entrar
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
