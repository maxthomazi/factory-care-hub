import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Wrench } from "lucide-react";

export default function Login() {
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
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
      if (!nomeEmpresa.trim()) { setError("Preencha o nome da empresa."); setLoading(false); return; }
      if (password.length < 6) { setError("Senha deve ter ao menos 6 caracteres."); setLoading(false); return; }

      // 1. Criar usuário no Auth
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        setError(authError.message.includes("already") ? "Email já cadastrado." : "Erro ao cadastrar.");
        setLoading(false); return;
      }

      if (data.user) {
        // 2. Usar função SQL segura para criar empresa + usuário
        const slug = nomeEmpresa.trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        const { error: fnError } = await supabase.rpc("criar_empresa_e_usuario", {
          p_user_id: data.user.id,
          p_nome: nome.trim(),
          p_email: email,
          p_nome_empresa: nomeEmpresa.trim(),
          p_slug: slug + "-" + Date.now(),
        });

        if (fnError) {
          setError("Erro ao criar empresa. Tente novamente.");
          setLoading(false); return;
        }

        setSucesso("Conta criada com sucesso! Fazendo login...");
        
        // 3. Login automático
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (!loginError) {
          navigate("/");
        } else {
          setSucesso("Conta criada! Faça login para continuar.");
          setModo("login");
          setNome(""); setNomeEmpresa(""); setPassword("");
        }
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
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nome completo</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                    placeholder="Seu nome" required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nome da empresa</label>
                  <input type="text" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)}
                    placeholder="Ex: Indústria ABC Ltda" required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="text-center">
            {modo === "login" ? (
              <p className="text-sm text-muted-foreground">
                Não tem conta?{" "}
                <button onClick={() => { setModo("cadastro"); setError(""); setSucesso(""); }}
                  className="text-primary font-medium hover:underline">
                  Criar conta grátis
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

          {modo === "cadastro" && (
            <p className="text-xs text-center text-muted-foreground">
              14 dias grátis · Sem cartão de crédito
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
