import { useState, useMemo, useEffect } from "react";

// ============================================================
// CONFIGURAÇÃO SUPABASE
// Substitua os valores abaixo com os dados do seu projeto
// Veja o guia-configuracao-supabase.md para instruções
// ============================================================
const SUPABASE_URL = "https://lsknixwvxrfidmlzpvmu.supabase.co";
const SUPABASE_KEY = "sb_publishable_Nakz-u-aAGt5Slov0nqtQQ_w-RNS5HU";

async function supabase(method, table, body = null, filters = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${filters}`;
  const res = await fetch(url, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

const CATEGORIAS = ["Administrativo", "Projetos", "Infraestrutura", "Recursos Humanos", "Eventos", "Outros"];
const USUARIOS = ["Roberto", "Maria", "Carlos", "Ana"];

// Dados de exemplo usados enquanto Supabase não está configurado
const DEMO_DATA = [
  { id: 1, tipo: "despesa", descricao: "Aluguel sede", valor: 1500, categoria: "Infraestrutura", data: "2026-05-01", usuario: "Maria", status: "aprovado" },
  { id: 2, tipo: "receita", descricao: "Doação mensal - Empresa X", valor: 5000, categoria: "Projetos", data: "2026-05-03", usuario: "Roberto", status: "aprovado" },
  { id: 3, tipo: "despesa", descricao: "Material de escritório", valor: 320, categoria: "Administrativo", data: "2026-05-10", usuario: "Carlos", status: "pendente" },
  { id: 4, tipo: "despesa", descricao: "Evento beneficente", valor: 800, categoria: "Eventos", data: "2026-05-15", usuario: "Ana", status: "pendente" },
];

function formatBRL(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Badge({ status }) {
  const map = {
    aprovado: { bg: "#d1fae5", color: "#065f46", label: "Aprovado" },
    pendente: { bg: "#fef3c7", color: "#92400e", label: "Pendente" },
    reprovado: { bg: "#fee2e2", color: "#991b1b", label: "Reprovado" },
  };
  const s = map[status];
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
      {s.label}
    </span>
  );
}

function DBStatus({ connected, loading }) {
  if (loading) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: connected ? "#34d399" : "#fbbf24", fontWeight: 600 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? "#34d399" : "#fbbf24" }} />
      {connected ? "Banco conectado" : "Modo demonstração"}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [transacoes, setTransacoes] = useState(DEMO_DATA);
  const [dbConnected, setDbConnected] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);
  const [form, setForm] = useState({ tipo: "despesa", descricao: "", valor: "", categoria: CATEGORIAS[0], data: new Date().toISOString().slice(0, 10), usuario: USUARIOS[0] });
  const [filtro, setFiltro] = useState({ tipo: "todos", status: "todos", categoria: "todos" });
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Tenta conectar ao Supabase ao carregar
  useEffect(() => {
    async function load() {
      if (SUPABASE_URL === "COLE_AQUI_SUA_SUPABASE_URL") {
        setDbLoading(false);
        return;
      }
      try {
        const data = await supabase("GET", "transacoes", null, "?order=data.desc");
        setTransacoes(data.length > 0 ? data : DEMO_DATA);
        setDbConnected(true);
      } catch {
        setDbConnected(false);
      } finally {
        setDbLoading(false);
      }
    }
    load();
  }, []);

  const totalReceitas = transacoes.filter(t => t.tipo === "receita" && t.status === "aprovado").reduce((a, b) => a + b.valor, 0);
  const totalDespesas = transacoes.filter(t => t.tipo === "despesa" && t.status === "aprovado").reduce((a, b) => a + b.valor, 0);
  const saldo = totalReceitas - totalDespesas;
  const pendentes = transacoes.filter(t => t.status === "pendente").length;

  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter(t => {
      if (filtro.tipo !== "todos" && t.tipo !== filtro.tipo) return false;
      if (filtro.status !== "todos" && t.status !== filtro.status) return false;
      if (filtro.categoria !== "todos" && t.categoria !== filtro.categoria) return false;
      return true;
    }).sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [transacoes, filtro]);

  const porCategoria = useMemo(() => {
    const map = {};
    transacoes.filter(t => t.tipo === "despesa" && t.status === "aprovado").forEach(t => {
      map[t.categoria] = (map[t.categoria] || 0) + t.valor;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transacoes]);

  async function handleSubmit() {
    if (!form.descricao || !form.valor) return;
    setSaving(true);
    const nova = { ...form, valor: parseFloat(form.valor), status: "pendente" };
    try {
      if (dbConnected) {
        const [saved] = await supabase("POST", "transacoes", nova);
        setTransacoes(prev => [saved, ...prev]);
      } else {
        setTransacoes(prev => [{ ...nova, id: Date.now() }, ...prev]);
      }
      setForm({ tipo: "despesa", descricao: "", valor: "", categoria: CATEGORIAS[0], data: new Date().toISOString().slice(0, 10), usuario: USUARIOS[0] });
      setSuccessMsg("Lançamento adicionado! Aguardando aprovação.");
      setTimeout(() => setSuccessMsg(""), 3000);
      setTab("lancamentos");
    } catch {
      setErrorMsg("Erro ao salvar. Verifique a conexão com o banco.");
      setTimeout(() => setErrorMsg(""), 4000);
    } finally {
      setSaving(false);
    }
  }

  async function handleAprovar(id) {
    try {
      if (dbConnected) {
        await supabase("PATCH", "transacoes", { status: "aprovado" }, `?id=eq.${id}`);
      }
      setTransacoes(prev => prev.map(t => t.id === id ? { ...t, status: "aprovado" } : t));
    } catch {
      setErrorMsg("Erro ao aprovar. Tente novamente.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  }

  async function handleReprovar(id) {
    try {
      if (dbConnected) {
        await supabase("PATCH", "transacoes", { status: "reprovado" }, `?id=eq.${id}`);
      }
      setTransacoes(prev => prev.map(t => t.id === id ? { ...t, status: "reprovado" } : t));
    } catch {
      setErrorMsg("Erro ao reprovar. Tente novamente.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  }

  const style = {
    root: { fontFamily: "'DM Sans', sans-serif", background: "#f0f4f8", minHeight: "100vh", color: "#1a2535" },
    header: { background: "#1a2535", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
    logo: { color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" },
    logoSpan: { color: "#34d399" },
    nav: { display: "flex", gap: 4, flexWrap: "wrap" },
    navBtn: (active) => ({
      background: active ? "#34d399" : "transparent",
      color: active ? "#1a2535" : "#94a3b8",
      border: "none", borderRadius: 8, padding: "8px 14px",
      cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit", transition: "all 0.15s"
    }),
    content: { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
    card: { background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
    grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 },
    statCard: (accent) => ({ background: "#fff", borderRadius: 14, padding: "18px 20px", borderLeft: `4px solid ${accent}`, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }),
    statLabel: { fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
    statValue: { fontSize: 26, fontWeight: 800, marginTop: 4, letterSpacing: "-0.5px" },
    sectionTitle: { fontWeight: 700, fontSize: 16, marginBottom: 14, color: "#1a2535" },
    input: { width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", background: "#f8fafc", color: "#1a2535", outline: "none", boxSizing: "border-box" },
    label: { fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.3 },
    btn: (color, bg) => ({ background: bg, color, border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", transition: "opacity 0.15s" }),
    row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, padding: "8px 10px", borderBottom: "1.5px solid #f1f5f9" },
    td: { padding: "12px 10px", borderBottom: "1px solid #f8fafc", fontSize: 14 },
    success: { background: "#d1fae5", color: "#065f46", borderRadius: 8, padding: "10px 16px", marginBottom: 14, fontWeight: 600, fontSize: 14 },
    error: { background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 16px", marginBottom: 14, fontWeight: 600, fontSize: 14 },
  };

  return (
    <div style={style.root}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={style.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={style.logo}>Conselho <span style={style.logoSpan}>Fiscal</span> ONG</div>
          <DBStatus connected={dbConnected} loading={dbLoading} />
        </div>
        <nav style={style.nav}>
          {[["dashboard", "Dashboard"], ["novo", "Novo Lançamento"], ["lancamentos", "Lançamentos"], ["aprovacoes", `Aprovações${pendentes > 0 ? ` (${pendentes})` : ""}`], ["relatorio", "Relatório"]].map(([id, label]) => (
            <button key={id} style={style.navBtn(tab === id)} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
      </div>

      <div style={style.content}>
        {successMsg && <div style={style.success}>{successMsg}</div>}
        {errorMsg && <div style={style.error}>{errorMsg}</div>}

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Visão Geral Financeira</div>
              <div style={{ color: "#64748b", fontSize: 14 }}>Maio 2026 • Conselho Fiscal</div>
            </div>
            <div style={style.grid4}>
              <div style={style.statCard("#34d399")}>
                <div style={style.statLabel}>Saldo Atual</div>
                <div style={{ ...style.statValue, color: saldo >= 0 ? "#065f46" : "#991b1b" }}>{formatBRL(saldo)}</div>
              </div>
              <div style={style.statCard("#60a5fa")}>
                <div style={style.statLabel}>Total Receitas</div>
                <div style={{ ...style.statValue, color: "#1d4ed8" }}>{formatBRL(totalReceitas)}</div>
              </div>
              <div style={style.statCard("#f87171")}>
                <div style={style.statLabel}>Total Despesas</div>
                <div style={{ ...style.statValue, color: "#991b1b" }}>{formatBRL(totalDespesas)}</div>
              </div>
              <div style={style.statCard("#fbbf24")}>
                <div style={style.statLabel}>Aguardando Aprovação</div>
                <div style={{ ...style.statValue, color: "#92400e" }}>{pendentes}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={style.card}>
                <div style={style.sectionTitle}>Últimas Movimentações</div>
                {transacoes.slice(0, 5).map(t => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{t.descricao}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{t.categoria} • {t.data}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: t.tipo === "receita" ? "#059669" : "#dc2626" }}>
                        {t.tipo === "receita" ? "+" : "-"}{formatBRL(t.valor)}
                      </div>
                      <Badge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={style.card}>
                <div style={style.sectionTitle}>Despesas por Categoria</div>
                {porCategoria.length === 0 && <div style={{ color: "#94a3b8", fontSize: 14 }}>Nenhuma despesa aprovada.</div>}
                {porCategoria.map(([cat, val]) => (
                  <div key={cat} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{cat}</span>
                      <span style={{ color: "#dc2626", fontWeight: 700 }}>{formatBRL(val)}</span>
                    </div>
                    <div style={{ background: "#f1f5f9", borderRadius: 99, height: 6 }}>
                      <div style={{ background: "#f87171", width: `${Math.min(100, (val / totalDespesas) * 100)}%`, height: 6, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* NOVO LANÇAMENTO */}
        {tab === "novo" && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 20 }}>Novo Lançamento</div>
            <div style={style.card}>
              <div style={style.row}>
                <div>
                  <label style={style.label}>Tipo</label>
                  <select style={style.input} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>
                <div>
                  <label style={style.label}>Usuário</label>
                  <select style={style.input} value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))}>
                    {USUARIOS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={style.label}>Descrição</label>
                <input style={style.input} placeholder="Ex: Pagamento fornecedor, Doação..." value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div style={style.row}>
                <div>
                  <label style={style.label}>Valor (R$)</label>
                  <input style={style.input} type="number" min="0" step="0.01" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
                </div>
                <div>
                  <label style={style.label}>Data</label>
                  <input style={style.input} type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={style.label}>Categoria</label>
                <select style={style.input} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={style.label}>Anexar Nota Fiscal (PDF/Imagem)</label>
                <input style={{ ...style.input, padding: "7px 12px", cursor: "pointer" }} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setForm(f => ({ ...f, nota: e.target.files[0]?.name || null }))} />
                {form.nota && <div style={{ fontSize: 12, color: "#059669", marginTop: 4 }}>✓ {form.nota}</div>}
              </div>
              <button style={{ ...style.btn("#fff", saving ? "#64748b" : "#1a2535"), opacity: saving ? 0.7 : 1 }} onClick={handleSubmit} disabled={saving}>
                {saving ? "Salvando..." : "Enviar para Aprovação →"}
              </button>
            </div>
          </div>
        )}

        {/* LANÇAMENTOS */}
        {tab === "lancamentos" && (
          <>
            <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 20 }}>Todos os Lançamentos</div>
            <div style={{ ...style.card, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <label style={style.label}>Tipo</label>
                  <select style={{ ...style.input, width: "auto" }} value={filtro.tipo} onChange={e => setFiltro(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="todos">Todos</option>
                    <option value="receita">Receitas</option>
                    <option value="despesa">Despesas</option>
                  </select>
                </div>
                <div>
                  <label style={style.label}>Status</label>
                  <select style={{ ...style.input, width: "auto" }} value={filtro.status} onChange={e => setFiltro(f => ({ ...f, status: e.target.value }))}>
                    <option value="todos">Todos</option>
                    <option value="pendente">Pendente</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="reprovado">Reprovado</option>
                  </select>
                </div>
                <div>
                  <label style={style.label}>Categoria</label>
                  <select style={{ ...style.input, width: "auto" }} value={filtro.categoria} onChange={e => setFiltro(f => ({ ...f, categoria: e.target.value }))}>
                    <option value="todos">Todas</option>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={style.card}>
              <table style={style.table}>
                <thead>
                  <tr>
                    {["Data", "Descrição", "Categoria", "Usuário", "Valor", "Status"].map(h => (
                      <th key={h} style={style.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transacoesFiltradas.map(t => (
                    <tr key={t.id}>
                      <td style={style.td}><span style={{ fontSize: 13, color: "#64748b" }}>{t.data}</span></td>
                      <td style={style.td}><span style={{ fontWeight: 600 }}>{t.descricao}</span></td>
                      <td style={style.td}><span style={{ fontSize: 13, color: "#64748b" }}>{t.categoria}</span></td>
                      <td style={style.td}><span style={{ fontSize: 13 }}>{t.usuario}</span></td>
                      <td style={style.td}>
                        <span style={{ fontWeight: 700, color: t.tipo === "receita" ? "#059669" : "#dc2626" }}>
                          {t.tipo === "receita" ? "+" : "-"}{formatBRL(t.valor)}
                        </span>
                      </td>
                      <td style={style.td}><Badge status={t.status} /></td>
                    </tr>
                  ))}
                  {transacoesFiltradas.length === 0 && (
                    <tr><td colSpan={6} style={{ ...style.td, textAlign: "center", color: "#94a3b8" }}>Nenhum lançamento encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* APROVAÇÕES */}
        {tab === "aprovacoes" && (
          <>
            <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 20 }}>Aprovações do Conselho</div>
            {transacoes.filter(t => t.status === "pendente").length === 0 && (
              <div style={{ ...style.card, textAlign: "center", color: "#64748b", padding: 40 }}>
                ✓ Nenhum lançamento pendente de aprovação.
              </div>
            )}
            {transacoes.filter(t => t.status === "pendente").map(t => (
              <div key={t.id} style={{ ...style.card, marginBottom: 12, borderLeft: "4px solid #fbbf24" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{t.descricao}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                      {t.categoria} • {t.data} • Enviado por {t.usuario}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 20, marginTop: 8, color: t.tipo === "receita" ? "#059669" : "#dc2626" }}>
                      {t.tipo === "receita" ? "+" : "-"}{formatBRL(t.valor)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={style.btn("#fff", "#059669")} onClick={() => handleAprovar(t.id)}>✓ Aprovar</button>
                    <button style={style.btn("#fff", "#dc2626")} onClick={() => handleReprovar(t.id)}>✗ Reprovar</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* RELATÓRIO */}
        {tab === "relatorio" && (
          <>
            <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 20 }}>Relatório Financeiro</div>
            <div style={style.grid4}>
              <div style={style.statCard("#34d399")}>
                <div style={style.statLabel}>Saldo</div>
                <div style={{ ...style.statValue, color: saldo >= 0 ? "#065f46" : "#991b1b" }}>{formatBRL(saldo)}</div>
              </div>
              <div style={style.statCard("#60a5fa")}>
                <div style={style.statLabel}>Receitas Aprovadas</div>
                <div style={{ ...style.statValue, color: "#1d4ed8" }}>{formatBRL(totalReceitas)}</div>
              </div>
              <div style={style.statCard("#f87171")}>
                <div style={style.statLabel}>Despesas Aprovadas</div>
                <div style={{ ...style.statValue, color: "#991b1b" }}>{formatBRL(totalDespesas)}</div>
              </div>
              <div style={style.statCard("#fbbf24")}>
                <div style={style.statLabel}>Lançamentos Totais</div>
                <div style={{ ...style.statValue, color: "#92400e" }}>{transacoes.length}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={style.card}>
                <div style={style.sectionTitle}>Despesas por Categoria</div>
                {porCategoria.map(([cat, val]) => (
                  <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f8fafc", fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{cat}</span>
                    <span style={{ color: "#dc2626", fontWeight: 700 }}>{formatBRL(val)}</span>
                  </div>
                ))}
              </div>
              <div style={style.card}>
                <div style={style.sectionTitle}>Resumo por Status</div>
                {["aprovado", "pendente", "reprovado"].map(s => {
                  const count = transacoes.filter(t => t.status === s).length;
                  const total = transacoes.filter(t => t.status === s).reduce((a, b) => a + b.valor, 0);
                  return (
                    <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f8fafc", fontSize: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Badge status={s} />
                        <span style={{ color: "#64748b" }}>{count} lançamentos</span>
                      </div>
                      <span style={{ fontWeight: 700 }}>{formatBRL(total)}</span>
                    </div>
                  );
                })}
                <div style={{ marginTop: 16, padding: "14px", background: "#f8fafc", borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>SAÚDE FINANCEIRA</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: saldo >= 0 ? "#059669" : "#dc2626" }}>
                    {saldo >= 0 ? "✓ Superávit" : "✗ Déficit"} de {formatBRL(Math.abs(saldo))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
