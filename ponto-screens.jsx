
// ── Shared UI primitives ────────────────────────────────────────────────────

const Badge = ({ type, children }) => {
  const cls = { verde:'badge-green', vermelho:'badge-red', amarelo:'badge-yellow', azul:'badge-blue', cinza:'badge-gray' };
  return <span className={`badge ${cls[type]||'badge-gray'}`}>{children}</span>;
};

const statusBadge = (s) => {
  if (s === 'concluida')    return <Badge type="verde">Concluída</Badge>;
  if (s === 'em andamento') return <Badge type="azul">Em andamento</Badge>;
  if (s === 'bloqueada')    return <Badge type="vermelho">Bloqueada</Badge>;
  return <Badge type="amarelo">Pendente</Badge>;
};

const diasBadge = (d) => {
  if (d < 0)  return <Badge type="vermelho">{d}d</Badge>;
  if (d === 0) return <Badge type="amarelo">Hoje</Badge>;
  if (d <= 5)  return <Badge type="amarelo">+{d}d</Badge>;
  return <Badge type="cinza">+{d}d</Badge>;
};

// ── Mini bar chart ──────────────────────────────────────────────────────────

const BarChart = ({ values, labels, color = 'var(--primary)', h = 72 }) => {
  const max = Math.max(...values);
  const W = values.length * 44;
  return (
    <svg width="100%" height={h + 18} viewBox={`0 0 ${W} ${h + 18}`} preserveAspectRatio="none" style={{display:'block'}}>
      {values.map((v, i) => {
        const bh = Math.max(4, (v / max) * h);
        return (
          <g key={i}>
            <rect x={i*44+4} y={h - bh} width={36} height={bh} rx={4} fill={color} opacity={0.82} />
            <text x={i*44+22} y={h+14} textAnchor="middle" fontSize={10} fill="var(--text-muted)">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
};

const LineChart = ({ values, labels, color = 'var(--accent)', h = 72 }) => {
  const max = Math.max(...values.map(Math.abs));
  const W = values.length * 44;
  const zero = h / 2;
  const pts = values.map((v, i) => {
    const x = i * 44 + 22;
    const y = zero - (v / max) * (h / 2 - 6);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width="100%" height={h + 18} viewBox={`0 0 ${W} ${h + 18}`} preserveAspectRatio="none" style={{display:'block'}}>
      <line x1={0} y1={zero} x2={W} y2={zero} stroke="var(--border)" strokeWidth={1} strokeDasharray="3,3" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => {
        const x = i * 44 + 22;
        const y = zero - (v / max) * (h / 2 - 6);
        return <circle key={i} cx={x} cy={y} r={4} fill={color} stroke="var(--bg-card)" strokeWidth={2} />;
      })}
      {labels.map((l, i) => (
        <text key={i} x={i*44+22} y={h+14} textAnchor="middle" fontSize={10} fill="var(--text-muted)">{l}</text>
      ))}
    </svg>
  );
};

// ── KPI card ────────────────────────────────────────────────────────────────

const KPI = ({ label, value, sub, variant = '' }) => (
  <div className={`kpi-card ${variant}`} style={{animationDelay:'0.05s'}}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">{value}</div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

// ── DASHBOARD ───────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { kpis: k, ferias: f, chartMeses, chartHoras, chartSaldo, chartDias } = window.D;
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  return (
    <div className={`page-enter`} style={{opacity: visible ? 1 : 0, transition:'opacity 0.3s'}}>
      {/* KPIs principais */}
      <div className="kpi-grid" style={{marginBottom:16}}>
        <KPI label="Horas Trabalhadas" value="168h 20min" sub="Abril 2026 · 21 dias" />
        <KPI label="Saldo Banco de Horas" value="+8h 20min" sub="↑ 14% vs mês anterior" variant="kpi-positive" />
        <KPI label="Horas Extras" value="8h 20min" sub="Acumuladas no período" variant="kpi-accent" />
        <KPI label="Hora de Saída Hoje" value="17:08" sub="Entrada 08:52 · Almoço 12h" />
      </div>

      {/* KPIs secundários */}
      <div className="kpi-grid" style={{marginBottom:16, gridTemplateColumns:'repeat(4,1fr)'}}>
        <KPI label="Média Diária" value="8h 01min" sub="Meta: 8h 00min" />
        <KPI label="Dias Trabalhados" value="21" sub="de 22 dias úteis" />
        <KPI label="Saldo 30 dias" value="+6h 45min" sub="vs. +5h 00min anteriores" variant="kpi-positive" />
        <KPI label="Faltas / Ausências" value="0" sub="Nenhuma no período" variant="kpi-positive" />
      </div>

      <div className="dash-grid">
        {/* LEFT */}
        <div className="dash-left">
          {/* Charts */}
          <div className="card">
            <div className="section-header" style={{marginBottom:8}}>
              <span className="card-title" style={{marginBottom:0}}>Analytics · Abril 2026</span>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
              <div>
                <div style={{fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px'}}>Horas Mensais</div>
                <BarChart values={chartHoras} labels={chartMeses} color="var(--primary)" />
              </div>
              <div>
                <div style={{fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px'}}>Saldo Acumulado (h)</div>
                <LineChart values={chartSaldo} labels={chartMeses} color="var(--accent)" />
              </div>
              <div>
                <div style={{fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px'}}>Distribuição Semanal</div>
                <BarChart values={Object.values(chartDias)} labels={Object.keys(chartDias)} color="var(--accent)" h={60} />
              </div>
              <div>
                <div style={{fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px'}}>Tipos de Registro</div>
                <div style={{display:'flex', flexDirection:'column', gap:8, paddingTop:4}}>
                  {[['Normal','var(--primary)',72],['Banco Horas','var(--accent)',12],['Feriado','var(--warning)',2]].map(([label, color, pct]) => (
                    <div key={label}>
                      <div style={{display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3}}>
                        <span style={{color:'var(--text-muted)'}}>{label}</span>
                        <span style={{fontWeight:700}}>{pct}%</span>
                      </div>
                      <div style={{height:6, background:'var(--border)', borderRadius:3, overflow:'hidden'}}>
                        <div style={{height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width 1s ease'}} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Alertas */}
          <div className="card">
            <div className="card-title">Avisos</div>
            <div className="alert alert-warn">
              <span style={{fontSize:16}}>⚠️</span>
              <div className="alert-text">
                <div className="alert-title">Férias a vencer em 96 dias</div>
                <div>Próximas férias: 04/08/2026 – 02/09/2026. Confirme o agendamento com a chefia.</div>
              </div>
            </div>
            <div className="alert alert-ok" style={{marginBottom:0}}>
              <span style={{fontSize:16}}>✓</span>
              <div className="alert-text">
                <div className="alert-title">Banco de horas positivo</div>
                <div>Saldo acumulado de +8h 20min — dentro dos limites do acordo de jornada.</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Férias */}
        <div className="card" style={{alignSelf:'start', position:'sticky', top:72}}>
          <div className="card-title">Resumo de Férias</div>

          {/* Timeline visual */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10, color:'var(--text-muted)', marginBottom:6, fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase'}}>Período Concessivo</div>
            <div style={{height:18, background:'var(--border)', borderRadius:9, overflow:'hidden', position:'relative'}}>
              <div style={{position:'absolute', left:0, top:0, height:'100%', width:'32%', background:'var(--accent)', opacity:0.7, borderRadius:'9px 0 0 9px'}} />
              <div style={{position:'absolute', left:'38%', width:3, top:0, height:'100%', background:'var(--negative)', opacity:0.9}} title="Hoje" />
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:4}}>
              <span>01/02/2026</span><span>Hoje</span><span>31/01/2027</span>
            </div>
          </div>

          {[
            ['Período Aquisitivo', '01/02/2025 – 31/01/2026', ''],
            ['Período Concessivo', '01/02/2026 – 31/01/2027', ''],
            ['Próximas Férias', '04/08/2026 – 02/09/2026', 'var(--positive)'],
            ['Pode tirar a partir de', '01/02/2026', 'var(--accent)'],
            ['Dias Restantes', '30 dias', 'var(--primary)'],
            ['Dias Utilizados', '0 dias', ''],
            ['Saldo Acumulado', '30 dias', 'var(--positive)'],
            ['Abono Disponível', '10 dias', 'var(--positive)'],
          ].map(([label, value, color]) => (
            <div key={label} className="ferias-stat">
              <div className="ferias-stat-label">{label}</div>
              <div className="ferias-stat-value" style={color ? {color} : {}}>{value}</div>
            </div>
          ))}

          <div style={{marginTop:12, padding:'10px 12px', background:'var(--positive-soft)', borderRadius:'var(--radius-sm)', fontSize:12, color:'var(--positive)', fontWeight:600}}>
            Período aquisitivo encerrado · Férias liberadas
          </div>
        </div>
      </div>
    </div>
  );
};

// ── PONTO ───────────────────────────────────────────────────────────────────

const PontoScreen = () => {
  const [sub, setSub] = React.useState('timesheet');
  const { registros } = window.D;

  return (
    <div className="page-enter">
      <div className="subtabs" style={{marginBottom:16}}>
        {[['timesheet','Timesheet'],['registros','Registros'],['acordos','Acordos'],['eventos','Eventos'],['ferias','Férias']].map(([k,l]) => (
          <button key={k} className={`subtab${sub===k?' active':''}`} onClick={() => setSub(k)}>{l}</button>
        ))}
      </div>

      {sub === 'timesheet' && (
        <div className="card">
          <div className="section-header">
            <span className="section-title">Timesheet — Abril 2026</span>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-ghost btn-sm">Exportar CSV</button>
              <button className="btn btn-ghost btn-sm">Exportar PDF</button>
            </div>
          </div>
          <div className="table-wrap">
            <div className="ts-row" style={{borderBottom:'2px solid var(--border)'}}>
              {['Data','Dia','Entrada','S. Almoço','R. Almoço','Saída','Total','Saldo','Obs'].map(h => (
                <div key={h} className="ts-cell ts-head">{h}</div>
              ))}
            </div>
            {registros.map((r, i) => (
              <div key={i} className={`ts-row${r.tipo==='hoje'?' ts-today':r.tipo==='feriado'?' ts-feriado':i%2===0?' ':''}`}>
                <div className="ts-cell" style={{fontWeight:600}}>{r.data}</div>
                <div className="ts-cell" style={{color:'var(--text-muted)'}}>{r.dia}</div>
                <div className="ts-cell">{r.entrada}</div>
                <div className="ts-cell">{r.sAlm}</div>
                <div className="ts-cell">{r.rAlm}</div>
                <div className="ts-cell">{r.saida}</div>
                <div className="ts-cell" style={{fontWeight:600}}>{r.total}</div>
                <div className={`ts-cell ${r.saldo?.startsWith('+') ? 'ts-positive' : r.saldo?.startsWith('-') ? 'ts-negative' : ''}`}>{r.saldo}</div>
                <div className="ts-cell" style={{color:'var(--text-muted)', fontSize:11}}>{r.obs}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:16, display:'flex', gap:24, fontSize:12, color:'var(--text-muted)'}}>
            <span>Total: <strong style={{color:'var(--text)'}}>168h 20min</strong></span>
            <span>Saldo: <strong style={{color:'var(--positive)'}}>+8h 20min</strong></span>
            <span>Acordo: <strong style={{color:'var(--text)'}}>160h 00min</strong></span>
          </div>
        </div>
      )}

      {sub === 'registros' && (
        <div className="card">
          <div className="section-header">
            <span className="section-title">Registros de Ponto</span>
            <button className="btn btn-primary btn-sm">+ Novo Registro</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>{['Data','Dia','Entrada','S. Almoço','R. Almoço','Saída','Total','Saldo','Observações',''].map(h=><th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {registros.map((r,i) => (
                  <tr key={i} style={r.tipo==='feriado'?{opacity:0.6}: r.tipo==='hoje'?{background:'var(--primary-soft)'}:{}}>
                    <td style={{fontWeight:600}}>{r.data}</td>
                    <td style={{color:'var(--text-muted)'}}>{r.dia}</td>
                    <td>{r.entrada}</td><td>{r.sAlm}</td><td>{r.rAlm}</td><td>{r.saida}</td>
                    <td style={{fontWeight:600}}>{r.total}</td>
                    <td style={{fontWeight:700, color: r.saldo?.startsWith('+') ? 'var(--positive)' : r.saldo?.startsWith('-') ? 'var(--negative)' : 'var(--text-muted)'}}>{r.saldo}</td>
                    <td style={{color:'var(--text-muted)', fontSize:12}}>{r.obs}</td>
                    <td><button className="btn btn-ghost btn-sm" style={{padding:'3px 8px'}}>✏️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sub === 'acordos' && (
        <div className="card">
          <div className="section-header">
            <span className="section-title">Acordos de Jornada</span>
            <button className="btn btn-primary btn-sm">+ Novo Acordo</button>
          </div>
          <div style={{display:'grid', gap:12}}>
            {[
              { nome:'Acordo Principal', jornada:'8h/dia · Seg–Sex', inicio:'01/02/2024', fim:'31/01/2027', ativo:true },
            ].map((a, i) => (
              <div key={i} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', background:'var(--bg-secondary)'}}>
                <div>
                  <div style={{fontWeight:700, marginBottom:4}}>{a.nome}</div>
                  <div style={{fontSize:12, color:'var(--text-muted)'}}>{a.jornada} · {a.inicio} – {a.fim}</div>
                </div>
                <Badge type="verde">Ativo</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {(sub === 'eventos' || sub === 'ferias') && (
        <div className="card">
          <div className="card-title">{sub === 'eventos' ? 'Eventos' : 'Férias'}</div>
          <div style={{textAlign:'center', padding:'40px 0', color:'var(--text-muted)'}}>
            <div style={{fontSize:32, marginBottom:8}}>{sub === 'eventos' ? '📌' : '🏖️'}</div>
            <div style={{fontWeight:600}}>Selecione ou crie um {sub === 'eventos' ? 'evento' : 'período de férias'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── ATIVIDADES ──────────────────────────────────────────────────────────────

const AtividadesScreen = () => {
  const [view, setView] = React.useState('table');
  const [search, setSearch] = React.useState('');
  const { atividades } = window.D;
  const filtered = atividades.filter(a =>
    !search || a.objeto.toLowerCase().includes(search.toLowerCase()) || a.ted.toLowerCase().includes(search.toLowerCase())
  );

  const kanbanCols = ['pendente','em andamento','bloqueada','concluida'];
  const kanbanLabels = { pendente:'Pendente', 'em andamento':'Em Andamento', bloqueada:'Bloqueada', concluida:'Concluída' };
  const kanbanColors = { pendente:'var(--warning)', 'em andamento':'var(--primary)', bloqueada:'var(--negative)', concluida:'var(--positive)' };

  return (
    <div className="page-enter">
      <div className="section-header" style={{marginBottom:12}}>
        <span className="section-title">Atividades</span>
        <div style={{display:'flex', gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{padding:'6px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:13, width:200}} />
          <div className="subtabs" style={{marginBottom:0}}>
            <button className={`subtab${view==='table'?' active':''}`} onClick={()=>setView('table')}>Tabela</button>
            <button className={`subtab${view==='kanban'?' active':''}`} onClick={()=>setView('kanban')}>Kanban</button>
          </div>
          <button className="btn btn-primary btn-sm">+ Nova</button>
        </div>
      </div>

      {view === 'table' && (
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>{['#','TED/Ptrab','Objeto','Processo','Assunto','Prazo','Dias','Ação','Status','Fin.',''].map(h=><th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} style={a.finalizado ? {opacity:0.6} : {}}>
                    <td style={{fontWeight:700, color:'var(--text-muted)'}}>{a.id}</td>
                    <td><code style={{fontSize:11, background:'var(--primary-soft)', color:'var(--primary)', padding:'2px 6px', borderRadius:4}}>{a.ted}</code></td>
                    <td style={{fontWeight:600, maxWidth:160}}>{a.objeto}</td>
                    <td style={{fontSize:11, color:'var(--text-muted)', fontFamily:'monospace'}}>{a.proc}</td>
                    <td>{a.assunto}</td>
                    <td style={{fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap'}}>{a.prazo}</td>
                    <td>{diasBadge(a.dias)}</td>
                    <td style={{fontSize:12, maxWidth:180, color:'var(--text-muted)'}}>{a.acao}</td>
                    <td>{statusBadge(a.status)}</td>
                    <td>{a.finalizado ? <Badge type="verde">✓</Badge> : <Badge type="cinza">—</Badge>}</td>
                    <td style={{whiteSpace:'nowrap'}}>
                      <button className="btn btn-ghost btn-sm" style={{padding:'3px 8px', marginRight:4}}>✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'kanban' && (
        <div className="kanban">
          {kanbanCols.map(col => {
            const items = filtered.filter(a => a.status === col);
            return (
              <div key={col} className="kanban-col">
                <div className="kanban-header">
                  <span style={{color: kanbanColors[col]}}>{kanbanLabels[col]}</span>
                  <Badge type={col==='concluida'?'verde':col==='bloqueada'?'vermelho':col==='em andamento'?'azul':'amarelo'}>{items.length}</Badge>
                </div>
                {items.map(a => (
                  <div key={a.id} className="kanban-card">
                    <div style={{fontSize:10, color:'var(--text-muted)', marginBottom:4, fontFamily:'monospace'}}>{a.ted}</div>
                    <div className="kanban-card-title">{a.objeto}</div>
                    <div className="kanban-card-meta" style={{marginBottom:8}}>{a.acao}</div>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                      {diasBadge(a.dias)}
                      <span style={{fontSize:10, color:'var(--text-muted)'}}>{a.prazo}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── CONFIG ──────────────────────────────────────────────────────────────────

const ConfigScreen = () => (
  <div className="page-enter">
    <div className="section-title" style={{marginBottom:16}}>Configurações</div>
    <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16}}>
      {[
        { icon:'⬇️', title:'Fazer Backup', desc:'Exportar todos os dados em JSON.', btn:'Fazer Download', variant:'btn-primary' },
        { icon:'⬆️', title:'Restaurar Backup', desc:'Restaurar a partir de arquivo anterior.', btn:'Selecionar Arquivo', variant:'btn-ghost' },
        { icon:'🗑️', title:'Limpar Dados', desc:'Remove permanentemente todos os registros. Irreversível.', btn:'Limpar Dados', variant:'btn-ghost', danger:true },
      ].map(c => (
        <div key={c.title} className="card">
          <div style={{fontSize:28, marginBottom:12}}>{c.icon}</div>
          <div style={{fontWeight:700, fontSize:15, marginBottom:6}}>{c.title}</div>
          <div style={{fontSize:13, color:'var(--text-muted)', marginBottom:16}}>{c.desc}</div>
          <button className={`btn ${c.variant}`} style={c.danger ? {color:'var(--negative)', borderColor:'var(--negative)'} : {}}>{c.btn}</button>
        </div>
      ))}
    </div>
    <div className="card" style={{marginTop:16, borderLeft:'3px solid var(--accent)', background:'var(--primary-soft)'}}>
      <div style={{fontWeight:700, marginBottom:4}}>ℹ️ Informações</div>
      <ul style={{fontSize:13, color:'var(--text-muted)', paddingLeft:18, lineHeight:1.8}}>
        <li>Backups são salvos em formato JSON, legíveis em qualquer editor.</li>
        <li>Sempre faça backup antes de limpar os dados.</li>
        <li>A restauração substitui completamente os dados atuais.</li>
      </ul>
    </div>
  </div>
);

Object.assign(window, { Dashboard, PontoScreen, AtividadesScreen, ConfigScreen });
