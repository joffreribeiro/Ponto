/**
 * app.js - Versão refatorada com validação robusta
 * Utiliza módulos: storage.js, calculations.js, dateUtils.js, validators.js
 */

// Estado global - Encapsulado
const AppState = {
    dados: null,
    eventoSelecionado: null,
    eventoEmEdicao: null,
    eventoAcordoPreselected: null,
    acordoEmEdicao: null,
    acordoEmEdicaoIndex: null,

    /**
     * Inicializa o estado
     */
    init() {
        this.dados = Storage.load();
    },

    /**
     * Salva dados com validação
     */
    save() {
        if (!Validators.validateConfiguracoes(this.dados.configuracoes).length) {
            return Storage.save(this.dados);
        }
        return false;
    },

    /**
     * Reset do estado
     */
    reset() {
        this.dados = Storage.getDefaultData();
        this.eventoSelecionado = null;
        this.eventoEmEdicao = null;
        this.eventoAcordoPreselected = null;
        this.acordoEmEdicao = null;
        this.acordoEmEdicaoIndex = null;
    }
};

// ============= INICIALIZAÇÃO =============

function inicializar() {
    try {
        AppState.init();
        configurarAbas();
        configurarSubAbas();
        configurarModalAcordo();
        configurarModalEvento();
        atualizarDashboard();
        renderizarTabelaRegistros();
        renderizarEventos();
        renderizarAcordos();
        atualizarSelectAcordosTimesheet();
        atualizarSelectAcordosRegistros();
        atualizarSelectAcordosEventos();
        atualizarSelectTiposEventos();
        const filtroEventos = document.getElementById('filtroAcordoEventos');
        if (filtroEventos) filtroEventos.addEventListener('change', renderizarEventos);
        const filtroRegistros = document.getElementById('filtroAcordoRegistros');
        if (filtroRegistros) filtroRegistros.addEventListener('change', renderizarTabelaRegistros);
        console.log('Aplicação inicializada com sucesso');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        mostrarAlertaGlobal('Erro ao inicializar. Verifique o console.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', inicializar);

// ============= ABAS =============

function configurarAbas() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const alvo = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const sec = document.getElementById(alvo);
            if (sec) sec.classList.add('active');
        });
    });
}

function configurarSubAbas() {
    const subBtns = document.querySelectorAll('.subtab-btn');
    const subContents = document.querySelectorAll('.subtab-content');

    subBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const alvo = btn.dataset.subtab;
            subBtns.forEach(b => b.classList.remove('active'));
            subContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const sec = document.getElementById(alvo);
            if (sec) sec.classList.add('active');

            // Re-renderiza listas quando abre a aba de acordos
            if (alvo === 'ponto-config') {
                renderizarAcordos();
            }
            // Re-renderiza eventos quando abre a aba de eventos
            if (alvo === 'ponto-eventos') {
                renderizarEventos();
            }
        });
    });
}

function configurarModalAcordo() {
    const sideBtns = document.querySelectorAll('.acordo-side-btn');
    sideBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const alvo = btn.dataset.panel;
            sideBtns.forEach(b => b.classList.remove('active'));
            const panels = document.querySelectorAll('.acordo-panel');
            panels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const sec = document.getElementById(alvo);
            if (sec) sec.classList.add('active');
        });
    });

    const btnP = document.getElementById('btnAdicionarPeriodo');
    if (btnP) btnP.addEventListener('click', adicionarPeriodoAcordo);
    const btnR = document.getElementById('btnAdicionarRegra');
    if (btnR) btnR.addEventListener('click', adicionarRegraHorario);

    const acordoSelect = document.getElementById('acordoEventoSelect');
    if (acordoSelect) {
        acordoSelect.addEventListener('change', () => {
            const v = acordoSelect.value;
            AppState.eventoAcordoPreselected = v === '' ? null : Number(v);
            if (AppState.eventoEmEdicao != null) {
                const ev = AppState.dados.eventos[AppState.eventoEmEdicao];
                if (ev) {
                    ev.acordoIndex = AppState.eventoAcordoPreselected;
                    AppState.save();
                    renderizarEventos();
                }
            }
        });
    }
}

function configurarModalEvento() {
    const modal = document.getElementById('modalEvento');
    if (!modal) return;

    const btnClose = modal.querySelector('.modal-close');
    if (btnClose) btnClose.addEventListener('click', fecharModalEvento);

    const btnCancel = modal.querySelector('.btn-cancelar-evento');
    if (btnCancel) btnCancel.addEventListener('click', fecharModalEvento);
}

// ============= DASHBOARD =============

function atualizarDashboard() {
    try {
        const totais = Calculations.calculatePeriodTotals(
            AppState.dados.registros,
            AppState.dados.eventos,
            AppState.dados.acordos
        );

        document.getElementById('horasPeriodo').textContent = DateUtils.minutesToTime(totais.totalTrabalhadas);
        document.getElementById('saldoBancoHoras').textContent = DateUtils.minutesToTime(totais.totalSaldo);
        document.getElementById('horasExtras').textContent = DateUtils.minutesToTime(totais.horasExtras);
        document.getElementById('horasAcordo').textContent = DateUtils.minutesToTime(totais.horasAcordo);
        
        // Debug: log detalhado dos cálculos de novembro
        console.log('=== CÁLCULO DE HORAS TRABALHADAS ===');
        console.log('Total de registros:', AppState.dados.registros.length);
        console.log('Acordos configurados:', AppState.dados.acordos.length);
        console.log('Eventos:', AppState.dados.eventos.length);
        console.log('Totais:', totais);
        
        // Detalhar novembro
        const novembroRegs = AppState.dados.registros.filter(r => r.data.startsWith('2024-11'));
        if (novembroRegs.length > 0) {
            console.log('\n=== NOVEMBRO 2024 - DETALHES DE CÁLCULO ===');
            novembroRegs.slice(0, 5).forEach(r => {
                const calc = Calculations.calculateDayWithContext(
                    AppState.dados.registros, AppState.dados.eventos, AppState.dados.acordos, r.data, r
                );
                const regra = Calculations.getRegraHorarioForDay(calc.acordo, r.data);
                console.log(`
${r.data}: ${r.entrada}-${r.saida}
  ├─ Trabalhou: ${DateUtils.minutesToTime(calc.trabalhadas)}
  ├─ Carga esperada: ${DateUtils.minutesToTime(480 + (regra.minutosExtras || 0))} (8h + ${regra.minutosExtras || 0}min)
  ├─ Saldo: ${DateUtils.minutesToTime(calc.saldo)}
  ├─ Acordo: ${calc.acordo?.nome || 'PADRÃO'}
  ├─ Regra período: ${regra.inicio} até ${regra.fim}
  └─ MinutosExtras regra: ${regra.minutosExtras || 0}
                `);
            });
            console.log(`Total registros novembro: ${novembroRegs.length}`);
        }

        // Avisos
        const listaAvisos = document.getElementById('listaAvisos');
        listaAvisos.innerHTML = '';

        if (!AppState.dados.registros.length) {
            const li = document.createElement('li');
            li.textContent = 'Nenhum registro de ponto cadastrado ainda.';
            listaAvisos.appendChild(li);
        } else {
            const hoje = DateUtils.today();
            const hojeRegistro = AppState.dados.registros.find(r => r.data === hoje);
            if (!hojeRegistro) {
                const li = document.createElement('li');
                li.textContent = 'Atenção: ainda não há registro de ponto para hoje.';
                listaAvisos.appendChild(li);
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
    }
}

// ============= REGISTROS =============

function renderizarTabelaRegistros() {
    try {
        const tbody = document.querySelector('#tabelaRegistros tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        const filtroEl = document.getElementById('filtroAcordoRegistros');
        const filtroVal = filtroEl ? filtroEl.value : '';
        const filtroIdx = filtroVal === '' ? null : Number(filtroVal);

        const registrosOrdenados = AppState.dados.registros
            .map((r, idx) => ({ ...r, _idx: idx, _d: DateUtils.parse(r.data) }))
            .filter(r => r._d)
            .filter(r => {
                if (filtroIdx === null) return true;
                const ac = Calculations.getAcordoByData(AppState.dados.acordos, r.data);
                const acIdx = ac ? AppState.dados.acordos.indexOf(ac) : -1;
                return acIdx === filtroIdx;
            })
            .sort((a, b) => a._d.getTime() - b._d.getTime());

        registrosOrdenados.forEach((r) => {
            const calc = Calculations.calculateDayWithContext(
                AppState.dados.registros,
                AppState.dados.eventos,
                AppState.dados.acordos,
                r.data,
                r
            );

            const classSaldo =
                calc.saldo > 0 ? 'saldo-positivo' :
                calc.saldo < 0 ? 'saldo-negativo' : '';

            const tr = document.createElement('tr');

            const colunas = [
                { content: DateUtils.formatBR(r.data), className: '' },
                { content: r.entrada || '', className: '' },
                { content: r.saidaAlmoco || '', className: '' },
                { content: r.retornoAlmoco || '', className: '' },
                { content: r.saida || '', className: '' },
                { content: DateUtils.minutesToTime(calc.trabalhadas), className: '' },
                { content: calc.saldo ? DateUtils.minutesToTime(calc.saldo) : '', className: classSaldo },
                { content: r.observacoes || '', className: '' }
            ];

            colunas.forEach(col => {
                const td = document.createElement('td');
                td.textContent = col.content;
                if (col.className) td.className = col.className;
                tr.appendChild(td);
            });

            // Botões de ação
            const tdActions = document.createElement('td');
            
            const btnEdit = document.createElement('button');
            btnEdit.type = 'button';
            btnEdit.className = 'btn-secondary';
            btnEdit.setAttribute('title', 'Editar registro');
            btnEdit.innerHTML = '✏️';
            btnEdit.addEventListener('click', () => editarRegistro(r._idx));
            tdActions.appendChild(btnEdit);

            const btnDel = document.createElement('button');
            btnDel.type = 'button';
            btnDel.className = 'btn-error';
            btnDel.setAttribute('title', 'Deletar registro');
            btnDel.innerHTML = '🗑️';
            btnDel.addEventListener('click', () => excluirRegistro(r._idx));
            tdActions.appendChild(btnDel);

            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao renderizar tabela:', error);
    }
}

function abrirModalRegistro() {
    document.getElementById('dataRegistro').value = '';
    document.getElementById('entradaRegistro').value = '';
    document.getElementById('saidaAlmocoRegistro').value = '';
    document.getElementById('retornoAlmocoRegistro').value = '';
    document.getElementById('saidaRegistro').value = '';
    document.getElementById('observacoesRegistro').value = '';
    document.getElementById('modalRegistro').classList.add('active');
}

function fecharModalRegistro() {
    document.getElementById('modalRegistro').classList.remove('active');
}

function salvarRegistro() {
    try {
        const data = document.getElementById('dataRegistro').value;
        const entrada = document.getElementById('entradaRegistro').value;
        const saidaAlmoco = document.getElementById('saidaAlmocoRegistro').value;
        const retornoAlmoco = document.getElementById('retornoAlmocoRegistro').value;
        const saida = document.getElementById('saidaRegistro').value;
        const observacoes = document.getElementById('observacoesRegistro').value;

        const registro = { data, entrada, saidaAlmoco, retornoAlmoco, saida, observacoes };

        // Validar
        const erros = Validators.validateRegistro(registro);
        if (erros.length > 0) {
            mostrarAlert('alertAreaRegistro', erros.join(' | '), 'error');
            return;
        }

        // Salvar ou atualizar
        const idxExistente = AppState.dados.registros.findIndex(r => r.data === data);
        if (idxExistente >= 0) {
            AppState.dados.registros[idxExistente] = registro;
        } else {
            AppState.dados.registros.push(registro);
        }

        AppState.save();
        atualizarDashboard();
        renderizarTabelaRegistros();
        fecharModalRegistro();
        mostrarAlert('alertAreaRegistro', 'Registro salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar registro:', error);
        mostrarAlert('alertAreaRegistro', 'Erro ao salvar: ' + error.message, 'error');
    }
}

function editarRegistro(index) {
    try {
        const r = AppState.dados.registros[index];
        if (!r) throw new Error('Registro não encontrado');

        document.getElementById('dataRegistro').value = r.data;
        document.getElementById('entradaRegistro').value = r.entrada || '';
        document.getElementById('saidaAlmocoRegistro').value = r.saidaAlmoco || '';
        document.getElementById('retornoAlmocoRegistro').value = r.retornoAlmoco || '';
        document.getElementById('saidaRegistro').value = r.saida || '';
        document.getElementById('observacoesRegistro').value = r.observacoes || '';

        document.getElementById('modalRegistro').classList.add('active');
    } catch (error) {
        console.error('Erro ao editar registro:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function excluirRegistro(index) {
    try {
        if (!confirm('Deseja realmente excluir este registro?')) return;

        AppState.dados.registros.splice(index, 1);
        AppState.save();
        atualizarDashboard();
        renderizarTabelaRegistros();
        mostrarAlert('alertAreaRegistro', 'Registro deletado.', 'success');
    } catch (error) {
        console.error('Erro ao excluir registro:', error);
        mostrarAlert('alertAreaRegistro', 'Erro ao deletar: ' + error.message, 'error');
    }
}

// ============= TIMESHEET (mantém compatibilidade) =============

function atualizarSelectAcordosTimesheet() {
    const select = document.getElementById('acordoTimesheet');
    if (!select) return;

    select.innerHTML = '';

    if (!AppState.dados.acordos.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Nenhum acordo cadastrado';
        select.appendChild(opt);
        return;
    }

    AppState.dados.acordos.forEach((a, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = a.nome || `Acordo ${idx + 1}`;
        select.appendChild(opt);
    });
}

function atualizarSelectAcordosRegistros() {
    const select = document.getElementById('filtroAcordoRegistros');
    if (!select) return;

    select.innerHTML = '';

    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = 'Todos os acordos';
    select.appendChild(optAll);

    AppState.dados.acordos.forEach((a, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = a.nome || `Acordo ${idx + 1}`;
        select.appendChild(opt);
    });
}

function gerarTimesheetAcordo() {
    try {
        const select = document.getElementById('acordoTimesheet');
        if (!select) {
            alert('Elemento <select id="acordoTimesheet"> não encontrado.');
            return;
        }

        const idx = Number(select.value);
        if (isNaN(idx) || !AppState.dados.acordos[idx]) {
            alert('Selecione um acordo válido.');
            return;
        }

        const acordo = AppState.dados.acordos[idx];
        if (!acordo.periodos || !acordo.periodos.length) {
            alert('Acordo sem períodos de compensação.');
            return;
        }

        // Parse period dates robustly (accept ISO 'YYYY-MM-DD' or 'DD/MM/YYYY')
        function parseDateString(s) {
            if (!s) return null;
            // detect dd/mm/yyyy
            const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (m) {
                const day = Number(m[1]);
                const mon = Number(m[2]) - 1;
                const yr = Number(m[3]);
                return new Date(yr, mon, day);
            }
            // fallback to Date parsing (ISO expected)
            const d = new Date(s);
            if (!isNaN(d.getTime())) return d;
            return null;
        }

        // Normalize periods with parsed inicio/fim and sort by parsed inicio
        const ordenados = [...acordo.periodos].map(p => ({
            ...p,
            _inicioDate: parseDateString(p.inicio),
            _fimDate: parseDateString(p.fim)
        })).sort((a, b) => (a._inicioDate || 0) - (b._inicioDate || 0));

        // Determine fiscal year start (April -> next March) using the most recent period start.
        let fiscalStartMonth = 3; // April (0-based index)
        if (acordo && typeof acordo.fiscalStartMonth !== 'undefined' && acordo.fiscalStartMonth !== null) {
            const raw = Number(acordo.fiscalStartMonth);
            if (!isNaN(raw)) {
                let candidate = raw;
                // allow 1-12 input (convert to 0-based)
                if (candidate >= 1 && candidate <= 12) candidate = candidate - 1;
                // accept 0-11 as-is
                if (candidate >= 0 && candidate <= 11) fiscalStartMonth = candidate;
            }
        }
        
        let fiscalStartYear;
        const latest = ordenados.reduce((acc, p) => {
            if (!p._inicioDate) return acc;
            return (!acc || p._inicioDate > acc) ? p._inicioDate : acc;
        }, null);
        if (latest) {
            const m = latest.getMonth();
            const y = latest.getFullYear();
            fiscalStartYear = (m >= fiscalStartMonth) ? y : (y - 1);
        } else {
            // fallback: current year
            const now = new Date();
            fiscalStartYear = (now.getMonth() >= fiscalStartMonth) ? now.getFullYear() : (now.getFullYear() - 1);
        }

        // If the acordo name contains a year range like '2025-2026', prefer that start year
        if (acordo && acordo.nome) {
            const m = acordo.nome.match(/(\d{4})\s*[-\/]\s*(\d{4})/);
            if (m) {
                const nameStartYear = Number(m[1]);
                if (!isNaN(nameStartYear)) {
                    fiscalStartYear = nameStartYear;
                }
            }
        }

        const inicio = new Date(fiscalStartYear, fiscalStartMonth, 1);
        const fim = new Date(fiscalStartYear + 1, fiscalStartMonth, 0);

        const content = document.getElementById('timesheetContent');
        content.innerHTML = '';

        const mapaReg = {};
        AppState.dados.registros.forEach(r => {
            mapaReg[r.data] = r;
        });

        const mesNomes = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const diaSem = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        let totalExtras = 0;
        let totalFaltas = 0;
        let totalFeriados = 0;

        // Calcular saldo anterior apenas dentro do acordo anterior (maior fim < início atual)
        const ultimoDiaMesAnterior = new Date(inicio.getFullYear(), inicio.getMonth(), 0); // último dia do mês anterior
        const ultimoDiaMesAnteriorStr = `${ultimoDiaMesAnterior.getFullYear()}-${String(ultimoDiaMesAnterior.getMonth() + 1).padStart(2, '0')}-${String(ultimoDiaMesAnterior.getDate()).padStart(2, '0')}`;

        // Detectar acordo anterior (maior fim < início atual) e seu intervalo total
        let acordoAnterior = null;
        let inicioAcordoAnterior = null;
        let fimAcordoAnterior = null;
        AppState.dados.acordos.forEach(ac => {
            (ac.periodos || []).forEach(p => {
                const ini = DateUtils.parse(p.inicio);
                const fim = DateUtils.parse(p.fim);
                if (!ini || !fim) return;
                if (fim.getTime() < inicio.getTime()) {
                    if (!fimAcordoAnterior || fim > fimAcordoAnterior) {
                        fimAcordoAnterior = fim;
                        inicioAcordoAnterior = ini;
                        acordoAnterior = ac;
                    }
                }
            });
        });

        console.log('=== CÁLCULO SALDO ANTERIOR ===');
        console.log('Início do acordo:', inicio.toDateString());
        console.log('Último dia do mês anterior:', ultimoDiaMesAnterior.toDateString(), `(${ultimoDiaMesAnteriorStr})`);
        console.log('Acordo anterior identificado:', acordoAnterior ? acordoAnterior.nome : 'nenhum');

        let saldoAcumuladoGeral = 0;

        if (!acordoAnterior) {
            console.log('Não há acordo anterior. Saldo anterior = 0');
            saldoAcumuladoGeral = 0;
        } else {
            // Limitar cálculo ao intervalo do acordo anterior até o último dia antes do novo acordo
            const inicioCalc = inicioAcordoAnterior;
            const fimCalc = fimAcordoAnterior.getTime() > ultimoDiaMesAnterior.getTime()
                ? ultimoDiaMesAnterior
                : fimAcordoAnterior;

            // Mapa de registros dentro do intervalo
            const mapaRegistros = {};
            AppState.dados.registros.forEach(r => {
                const d = DateUtils.parse(r.data);
                if (!d) return;
                if (d.getTime() < inicioCalc.getTime() || d.getTime() > fimCalc.getTime()) return;
                const iso = DateUtils.normalize(r.data);
                mapaRegistros[iso] = r;
            });

            let cursor = new Date(inicioCalc.getFullYear(), inicioCalc.getMonth(), inicioCalc.getDate());
            while (cursor.getTime() <= fimCalc.getTime()) {
                const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;

                // Respeitar bloqueio de evento (feriado/abono/etc) como no timesheet
                const ev = Calculations.getEventoByData(AppState.dados.eventos, iso);
                const isCompensar = ev && (
                    ev.tipoEvento === 'compensar_acordo' ||
                    ev.tipoEvento === 'compensacao_acordo' ||
                    ev.tipoEvento === 'compensação_acordo' ||
                    ev.impactoEvento === 'trabalho'
                );
                if (ev && !isCompensar) {
                    cursor.setDate(cursor.getDate() + 1);
                    continue;
                }

                const reg = mapaRegistros[iso];
                const calc = Calculations.calculateDayWithContext(
                    AppState.dados.registros,
                    AppState.dados.eventos,
                    AppState.dados.acordos,
                    iso,
                    reg
                );

                // Só acumula se o dia pertence ao acordo anterior
                if (calc.acordo && calc.acordo.nome === acordoAnterior.nome) {
                    saldoAcumuladoGeral += calc.saldo || 0;
                }

                cursor.setDate(cursor.getDate() + 1);
            }
        }

        console.log('Saldo acumulado até', ultimoDiaMesAnteriorStr + ':', saldoAcumuladoGeral);

        const dataAux = new Date(inicio.getFullYear(), inicio.getMonth(), 1);

        while (dataAux <= fim) {
            const ano = dataAux.getFullYear();
            const mes = dataAux.getMonth();

            const ultimoDiaMes = new Date(ano, mes + 1, 0);
            const ultimoDia = ultimoDiaMes.getDate();

            const wrapper = document.createElement('div');
            wrapper.className = 'timesheet-mes';

            const titulo = document.createElement('div');
            titulo.className = 'timesheet-header';
            titulo.textContent = `${mesNomes[mes]} de ${ano}`;
            wrapper.appendChild(titulo);

            const tableContainer = document.createElement('div');
            tableContainer.className = 'table-container';

            const table = document.createElement('table');
            table.className = 'timesheet-table';

            const thead = document.createElement('thead');
            const trHead = document.createElement('tr');
            const thTipo = document.createElement('th');
            thTipo.textContent = 'TIPO';
            trHead.appendChild(thTipo);

            // Cabeçalho Saldo Anterior
            const thSaldoAnterior = document.createElement('th');
            thSaldoAnterior.className = 'th-saldo-anterior';
            trHead.appendChild(thSaldoAnterior);

            const dias = [];
            for (let dia = 1; dia <= ultimoDia; dia++) {
                const d = new Date(ano, mes, dia);
                const dow = d.getDay();
                const th = document.createElement('th');

                th.innerHTML = `
                    <div class="th-dia">
                        <span class="th-dia-semana">${diaSem[dow]}</span>
                        <span class="th-dia-num">${dia}</span>
                    </div>
                `;
                trHead.appendChild(th);

                const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const isWeekend = (dow === 0 || dow === 6);
                dias.push({ data: d, dataStr, isWeekend });
            }

            // Cabeçalho Saldo Acumulado
            const thSaldoAcumulado = document.createElement('th');
            thSaldoAcumulado.className = 'th-saldo-acumulado';
            trHead.appendChild(thSaldoAcumulado);

            thead.appendChild(trHead);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');

            const numRows = 8;
            const labels = [
                'Entrada',
                'Saída (Almoço)',
                'Duração (Almoço)',
                'Retorno (Almoço)',
                'Saída',
                '',
                'Horas Trabalhadas',
                'Saldo do Dia'
            ];

            const eventos = dias.map(d => Calculations.getEventoByData(AppState.dados.eventos, d.dataStr));
            const eventoSpanCriado = new Array(dias.length).fill(false);
            const fimSemanaSpanCriado = new Array(dias.length).fill(false);

            function obterCalcDia(dia) {
                const r = mapaReg[dia.dataStr];
                return Calculations.calculateDayWithContext(
                    AppState.dados.registros,
                    AppState.dados.eventos,
                    AppState.dados.acordos,
                    dia.dataStr,
                    r
                );
            }

            let saldoMes = 0;
            const saldoAnterior = saldoAcumuladoGeral || 0;
            let saldoAcumuladoAtual = saldoAnterior;

            for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                const tr = document.createElement('tr');

                if (rowIndex === 5) tr.classList.add('row-separador-azul');
                if (rowIndex === 2) tr.classList.add('row-duracao-almoco');

                const tdLabel = document.createElement('td');
                tdLabel.textContent = labels[rowIndex];
                tr.appendChild(tdLabel);

                // Coluna Saldo Anterior (PRIMEIRA coluna após label)
                if (rowIndex === 0) {
                    const tdSaldoAnterior = document.createElement('td');
                    tdSaldoAnterior.rowSpan = numRows; // inclui a linha "Saldo do Dia"
                    tdSaldoAnterior.className = 'col-saldo-anterior';
                    const saldoDiv = document.createElement('div');
                    saldoDiv.className = 'saldo-vertical-text';
                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = 'Saldo Anterior';
                    saldoDiv.appendChild(labelSpan);
                    tdSaldoAnterior.appendChild(saldoDiv);
                    tr.appendChild(tdSaldoAnterior);
                }

                dias.forEach((dia, colIdx) => {
                    const ev = eventos[colIdx];
                    const isCompensar = ev && (
                        ev.tipoEvento === 'compensar_acordo' ||
                        ev.tipoEvento === 'compensacao_acordo' ||
                        ev.tipoEvento === 'compensação_acordo' ||
                        ev.impactoEvento === 'trabalho'
                    );

                    // Evento com bloqueio visual (exceto compensar_acordo, que deve permitir registro)
                    if (ev && !isCompensar) {
                        if (!eventoSpanCriado[colIdx] && rowIndex === 0) {
                            const td = document.createElement('td');
                            td.rowSpan = numRows;

                            let classeEvento = 'evento-outro';
                            switch (ev.tipoEvento) {
                                case 'feriado':
                                    classeEvento = 'evento-feriado';
                                    break;
                                case 'ferias':
                                    classeEvento = 'evento-ferias';
                                    break;
                                case 'afastamento':
                                    classeEvento = 'evento-afastamento';
                                    break;
                                case 'viagem':
                                    classeEvento = 'evento-viagem';
                                    break;
                                case 'abono_acordo':
                                    classeEvento = 'evento-abono-acordo';
                                    break;
                            }

                            td.className = `${classeEvento} evento-vertical`;
                            td.textContent = ev.descricaoEvento || ev.tipoEvento;

                            tr.appendChild(td);
                            eventoSpanCriado[colIdx] = true;

                            if (ev.tipoEvento === 'feriado') {
                                totalFeriados++;
                            }
                        }
                        return;
                    }

                    // Fim de semana mesclado
                    if (dia.isWeekend) {
                        if (!fimSemanaSpanCriado[colIdx] && rowIndex === 0) {
                            const td = document.createElement('td');
                            td.rowSpan = numRows;
                            td.classList.add('col-fimsemana', 'evento-vertical');
                            td.textContent = '';
                            tr.appendChild(td);
                            fimSemanaSpanCriado[colIdx] = true;
                        }
                        return;
                    }

                    // Dia útil normal (ou compensação de acordo)
                    const r = mapaReg[dia.dataStr] || null;
                    const td = document.createElement('td');
                    if (isCompensar) td.classList.add('evento-compensar-acordo');

                    if (rowIndex === 0) td.textContent = r && r.entrada || '';
                    if (rowIndex === 1) td.textContent = r && r.saidaAlmoco || '';
                    if (rowIndex === 2) {
                        if (r && r.saidaAlmoco && r.retornoAlmoco) {
                            const iniAlm = DateUtils.timeToMinutes(r.saidaAlmoco);
                            const fimAlm = DateUtils.timeToMinutes(r.retornoAlmoco);
                            if (iniAlm != null && fimAlm != null && fimAlm > iniAlm) {
                                const dur = fimAlm - iniAlm;
                                td.textContent = DateUtils.minutesToTime(dur);
                            }
                        }
                    }
                    if (rowIndex === 3) td.textContent = r && r.retornoAlmoco || '';
                    if (rowIndex === 4) td.textContent = r && r.saida || '';
                    if (rowIndex === 5) td.textContent = '';

                    if (rowIndex === 6 || rowIndex === 7) {
                        const calc = obterCalcDia(dia);

                        if (calc && calc.temRegistro) {
                            if (rowIndex === 6) {
                                td.textContent = DateUtils.minutesToTime(calc.trabalhadas);
                                if (calc.status === 'extra') td.classList.add('saldo-positivo');
                                if (calc.status === 'falta') td.classList.add('saldo-negativo');
                            } else if (rowIndex === 7) {
                                if (calc.saldo !== 0) {
                                    td.textContent = DateUtils.minutesToTime(calc.saldo);

                                    if (calc.saldo > 0) {
                                        td.classList.add('saldo-positivo');
                                        totalExtras++;
                                    }
                                    if (calc.saldo < 0) {
                                        td.classList.add('saldo-negativo');
                                        totalFaltas++;
                                    }
                                } else {
                                    td.textContent = '';
                                }

                                saldoMes += calc.saldo || 0;
                                if (rowIndex === 7) {
                                    saldoAcumuladoAtual += calc.saldo || 0;
                                }
                            }
                        } else {
                            // dia útil sem registro -> potencial falta
                            if (!dia.isWeekend && DateUtils.isBusinessDay(dia.data)) {
                                if (rowIndex === 7) {
                                    td.textContent = '—';
                                    td.classList.add('dia-falta');
                                    totalFaltas++;
                                }
                            }
                        }
                    }

                    tr.appendChild(td);
                });

                // Coluna Saldo Acumulado (ÚLTIMA coluna)
                if (rowIndex === 0) {
                    const tdSaldoAcumulado = document.createElement('td');
                    tdSaldoAcumulado.rowSpan = numRows; // inclui a linha "Saldo do Dia"
                    tdSaldoAcumulado.className = 'col-saldo-acumulado';
                    const saldoDiv = document.createElement('div');
                    saldoDiv.className = 'saldo-vertical-text';
                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = 'Saldo Acumulado';
                    saldoDiv.appendChild(labelSpan);
                    tdSaldoAcumulado.appendChild(saldoDiv);
                    tr.appendChild(tdSaldoAcumulado);
                }

                tbody.appendChild(tr);
            }

            // Linha saldo mês
            const trSaldoMes = document.createElement('tr');
            trSaldoMes.className = 'row-saldo-mes';

            const tdLabelSaldo = document.createElement('td');
            tdLabelSaldo.textContent = 'SALDO MÊS';
            trSaldoMes.appendChild(tdLabelSaldo);

            // Coluna Saldo Anterior na linha SALDO MÊS
            const tdSaldoAnteriorMes = document.createElement('td');
            tdSaldoAnteriorMes.className = 'col-saldo-anterior';
            tdSaldoAnteriorMes.textContent = DateUtils.minutesToTime(saldoAnterior);
            if (saldoAnterior > 0) tdSaldoAnteriorMes.classList.add('saldo-positivo');
            if (saldoAnterior < 0) tdSaldoAnteriorMes.classList.add('saldo-negativo');
            trSaldoMes.appendChild(tdSaldoAnteriorMes);

            // Coluna Saldo do Mês (spanning all days)
            const tdSaldoMes = document.createElement('td');
            tdSaldoMes.colSpan = dias.length;
            tdSaldoMes.textContent = DateUtils.minutesToTime(saldoMes);
            if (saldoMes > 0) tdSaldoMes.classList.add('saldo-positivo');
            if (saldoMes < 0) tdSaldoMes.classList.add('saldo-negativo');
            trSaldoMes.appendChild(tdSaldoMes);

            // Coluna Saldo Acumulado na linha SALDO MÊS
            const saldoAcumuladoMes = (saldoAnterior || 0) + (saldoMes || 0);
            saldoAcumuladoGeral = saldoAcumuladoMes;

            const tdSaldoAcumuladoMes = document.createElement('td');
            tdSaldoAcumuladoMes.className = 'col-saldo-acumulado';
            tdSaldoAcumuladoMes.textContent = DateUtils.minutesToTime(saldoAcumuladoMes);
            if (saldoAcumuladoMes > 0) tdSaldoAcumuladoMes.classList.add('saldo-positivo');
            if (saldoAcumuladoMes < 0) tdSaldoAcumuladoMes.classList.add('saldo-negativo');
            trSaldoMes.appendChild(tdSaldoAcumuladoMes);

            tbody.appendChild(trSaldoMes);

            table.appendChild(tbody);
            tableContainer.appendChild(table);
            wrapper.appendChild(tableContainer);
            content.appendChild(wrapper);

            dataAux.setMonth(dataAux.getMonth() + 1);
        }

        const resumo = document.createElement('div');
        resumo.className = 'card';
        resumo.innerHTML = `
            <h3>Resumo do Acordo</h3>
            <p class="small-text">
                Dias com hora extra: <strong>${totalExtras}</strong><br>
                Dias com falta ou potencial falta: <strong>${totalFaltas}</strong><br>
                Dias de feriado: <strong>${totalFeriados}</strong>
            </p>
        `;
        content.appendChild(resumo);
    } catch (error) {
        console.error('Erro ao gerar timesheet:', error);
        mostrarAlertaGlobal('Erro ao gerar timesheet: ' + error.message, 'error');
    }
}

// ============= EVENTOS =============

function renderizarEventos() {
    try {
        const tbody = document.querySelector('#tabelaEventos tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Função para converter YYYY-MM-DD para DD/MM/YYYY
        const formatarData = (dataStr) => {
            if (!dataStr) return '';
            const m = dataStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (m) {
                const [, year, month, day] = m;
                return `${day}/${month}/${year}`;
            }
            return dataStr;
        };

        // Ordenar eventos por data inicial (crescente)
        const eventosOrdenados = [...AppState.dados.eventos].sort((a, b) => 
            (a.dataInicioEvento || '').localeCompare(b.dataInicioEvento || '')
        );

        // Filtrar por acordo selecionado (se houver filtro)
        const filtroEl = document.getElementById('filtroAcordoEventos');
        const filtroVal = filtroEl ? filtroEl.value : '';
        const filtroIdx = filtroVal === '' ? null : Number(filtroVal);

        const eventosFiltrados = (filtroIdx === null)
            ? eventosOrdenados
            : eventosOrdenados.filter(ev => ev.acordoIndex === filtroIdx);

        eventosFiltrados.forEach((e, idx) => {
            // Encontrar índice original para editar/deletar
            const idxOriginal = AppState.dados.eventos.indexOf(e);

            const tr = document.createElement('tr');

            const colunas = [
                { content: e.tipoEvento },
                { content: e.descricaoEvento },
                { 
                    content: (e.acordoIndex != null && AppState.dados.acordos[e.acordoIndex]) 
                        ? (AppState.dados.acordos[e.acordoIndex].nome || `Acordo ${e.acordoIndex + 1}`)
                        : ''
                },
                { content: formatarData(e.dataInicioEvento) },
                { content: formatarData(e.dataFimEvento) },
                { content: e.impactoEvento }
            ];

            colunas.forEach(col => {
                const td = document.createElement('td');
                td.textContent = col.content;
                tr.appendChild(td);
            });

            const tdActions = document.createElement('td');

            const btnEdit = document.createElement('button');
            btnEdit.type = 'button';
            btnEdit.className = 'btn-secondary';
            btnEdit.setAttribute('title', 'Editar evento');
            btnEdit.innerHTML = '✏️';
            btnEdit.addEventListener('click', () => abrirEditarEvento(idxOriginal));
            tdActions.appendChild(btnEdit);

            const btnDel = document.createElement('button');
            btnDel.type = 'button';
            btnDel.className = 'btn-error';
            btnDel.setAttribute('title', 'Deletar evento');
            btnDel.innerHTML = '🗑️';
            btnDel.addEventListener('click', () => abrirModalExcluirEvento(idxOriginal));
            tdActions.appendChild(btnDel);

            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao renderizar eventos:', error);
    }
}

function salvarEvento() {
    try {
        const tipoEvento = document.getElementById('tipoEvento').value;
        const descricaoEvento = document.getElementById('descricaoEvento').value;
        const dataInicioEvento = document.getElementById('dataInicioEvento').value;
        const dataFimEvento = document.getElementById('dataFimEvento').value;
        const impactoEvento = document.getElementById('impactoEvento').value;
        const corFundo = document.getElementById('eventoCorFundo').value;
        const corTexto = document.getElementById('eventoCorTexto').value;
        const nomeCSS = document.getElementById('eventoNomeCSS').value;
        const acordoSelEl = document.getElementById('acordoEventoSelect');
        const acordoIdxRaw = acordoSelEl ? acordoSelEl.value : '';

        if (!acordoIdxRaw) {
            throw new Error('Selecione um Acordo antes de salvar o evento');
        }

        const evento = {
            tipoEvento,
            descricaoEvento,
            dataInicioEvento,
            dataFimEvento: dataFimEvento || dataInicioEvento,
            impactoEvento,
            acordoIndex: Number(acordoIdxRaw),
            corFundo,
            corTexto,
            nomeCSS
        };

        // Validar
        const erros = Validators.validateEvento(evento);
        if (erros.length > 0) {
            throw new Error(erros.join('; '));
        }

        // Salvar ou atualizar
        if (AppState.eventoEmEdicao != null) {
            AppState.dados.eventos[AppState.eventoEmEdicao] = evento;
            AppState.eventoEmEdicao = null;
        } else {
            AppState.dados.eventos.push(evento);
        }

        AppState.save();
        renderizarEventos();
        renderizarAcordos();
        limparEvento();
        fecharModalEvento();
        mostrarAlertaGlobal('Evento salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar evento:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function limparEvento() {
    document.getElementById('tipoEvento').value = 'feriado';
    document.getElementById('descricaoEvento').value = '';
    document.getElementById('dataInicioEvento').value = '';
    document.getElementById('dataFimEvento').value = '';
    document.getElementById('impactoEvento').value = 'folga';
    document.getElementById('eventoCorFundo').value = '#ffe4e6';
    document.getElementById('eventoCorTexto').value = '#9f1239';
    document.getElementById('eventoNomeCSS').value = '';
    const acordoSel = document.getElementById('acordoEventoSelect');
    if (acordoSel) {
        if (AppState.eventoAcordoPreselected != null) {
            acordoSel.value = String(AppState.eventoAcordoPreselected);
        } else {
            acordoSel.selectedIndex = 0;
        }
    }
    AppState.eventoEmEdicao = null;
    AppState.eventoAcordoPreselected = null;
}

function abrirEditarEvento(index) {
    try {
        const e = AppState.dados.eventos[index];
        if (!e) throw new Error('Evento não encontrado');

        document.getElementById('tipoEvento').value = e.tipoEvento || 'feriado';
        document.getElementById('descricaoEvento').value = e.descricaoEvento || '';
        document.getElementById('dataInicioEvento').value = e.dataInicioEvento || '';
        document.getElementById('dataFimEvento').value = e.dataFimEvento || '';
        document.getElementById('impactoEvento').value = e.impactoEvento || 'folga';
        document.getElementById('eventoCorFundo').value = e.corFundo || '#ffe4e6';
        document.getElementById('eventoCorTexto').value = e.corTexto || '#9f1239';
        document.getElementById('eventoNomeCSS').value = e.nomeCSS || '';
        
        const acordoSel = document.getElementById('acordoEventoSelect');
        if (acordoSel) acordoSel.value = (e.acordoIndex != null) ? String(e.acordoIndex) : '';
        
        AppState.eventoEmEdicao = index;
        document.getElementById('modalEvento').classList.add('active');
    } catch (error) {
        console.error('Erro ao editar evento:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function abrirModalExcluirEvento(index) {
    AppState.eventoSelecionado = index;
    const modal = document.getElementById('modalConfirmarEvento');
    if (modal) {
        modal.classList.add('active');
    } else {
        if (confirm('Deseja realmente excluir este evento?')) {
            deletarEventoConfirmado();
        }
    }
}

function fecharModalEvento() {
    AppState.eventoSelecionado = null;
    const modal = document.getElementById('modalConfirmarEvento');
    if (modal) modal.classList.remove('active');
    const modalEvento = document.getElementById('modalEvento');
    if (modalEvento) modalEvento.classList.remove('active');
}

function deletarEventoConfirmado() {
    try {
        if (AppState.eventoSelecionado === null) return;
        AppState.dados.eventos.splice(AppState.eventoSelecionado, 1);
        AppState.eventoSelecionado = null;
        AppState.save();
        renderizarEventos();
        fecharModalEvento();
        mostrarAlertaGlobal('Evento deletado.', 'success');
    } catch (error) {
        console.error('Erro ao deletar evento:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function atualizarSelectAcordosEventos() {
    const selectEvento = document.getElementById('acordoEventoSelect');
    const selectFiltro = document.getElementById('filtroAcordoEventos');

    if (selectEvento) {
        selectEvento.innerHTML = '';
        const optPlaceholder = document.createElement('option');
        optPlaceholder.value = '';
        optPlaceholder.disabled = true;
        optPlaceholder.selected = true;
        optPlaceholder.textContent = '(Selecione um acordo)';
        selectEvento.appendChild(optPlaceholder);
    }

    const filtroValorAtual = selectFiltro ? selectFiltro.value : '';
    if (selectFiltro) {
        selectFiltro.innerHTML = '';
        const optTodos = document.createElement('option');
        optTodos.value = '';
        optTodos.textContent = 'Todos os acordos';
        selectFiltro.appendChild(optTodos);
    }

    AppState.dados.acordos.forEach((a, idx) => {
        if (selectEvento) {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = a.nome || `Acordo ${idx + 1}`;
            selectEvento.appendChild(opt);
        }
        if (selectFiltro) {
            const optF = document.createElement('option');
            optF.value = idx;
            optF.textContent = a.nome || `Acordo ${idx + 1}`;
            selectFiltro.appendChild(optF);
        }
    });

    if (selectFiltro) {
        const existe = filtroValorAtual === '' || AppState.dados.acordos[filtroValorAtual];
        selectFiltro.value = existe ? filtroValorAtual : '';
    }
}

function abrirModalEventoParaAcordo(acordoIndex) {
    try {
        if (acordoIndex == null || !AppState.dados.acordos[acordoIndex]) {
            throw new Error('Acordo inválido para criar evento');
        }
        AppState.eventoAcordoPreselected = acordoIndex;
        AppState.eventoEmEdicao = null;
        limparEvento();

        const acordoSel = document.getElementById('acordoEventoSelect');
        if (acordoSel) {
            acordoSel.value = String(acordoIndex);
        }

        const modal = document.getElementById('modalEvento');
        if (modal) modal.classList.add('active');
    } catch (error) {
        console.error('Erro ao abrir modal de evento:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function abrirModalEvento() {
    try {
        if (!AppState.dados.acordos.length) {
            throw new Error('Cadastre um acordo antes de criar eventos.');
        }
        AppState.eventoAcordoPreselected = 0;
        AppState.eventoEmEdicao = null;
        limparEvento();
        atualizarSelectTiposEventos();

        const acordoSel = document.getElementById('acordoEventoSelect');
        if (acordoSel) {
            acordoSel.value = '0';
        }

        const modal = document.getElementById('modalEvento');
        if (modal) modal.classList.add('active');
    } catch (error) {
        console.error('Erro ao abrir modal de evento:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

// ============= ACORDOS =============

function novoAcordo() {
    AppState.acordoEmEdicao = {
        nome: '',
        periodos: [],
        regrasHorario: []
    };
    AppState.acordoEmEdicaoIndex = null;
    preencherModalAcordo();
    document.getElementById('modalAcordo').classList.add('active');
}

function editarAcordo(index) {
    try {
        const acordo = AppState.dados.acordos[index];
        if (!acordo) throw new Error('Acordo não encontrado');
        AppState.acordoEmEdicao = JSON.parse(JSON.stringify(acordo));
        AppState.acordoEmEdicaoIndex = index;
        preencherModalAcordo();
        document.getElementById('modalAcordo').classList.add('active');
    } catch (error) {
        console.error('Erro ao editar acordo:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function preencherModalAcordo() {
    document.getElementById('acordoNome').value = AppState.acordoEmEdicao.nome || '';
    document.getElementById('periodoInicio').value = '';
    document.getElementById('periodoFim').value = '';
    document.getElementById('periodoMinutosExtras').value = '';

    document.getElementById('regraInicio').value = '';
    document.getElementById('regraFim').value = '';
    document.getElementById('regraMinutosExtras').value = '';
    document.getElementById('regraInicioExpediente').value = '';
    document.getElementById('regraAlmoco').value = 60;
    document.getElementById('regraTolAlmoco').value = 5;
    document.getElementById('regraTolSaida').value = 5;
    document.getElementById('regraTipo').value = '';
    document.getElementById('regraVale').value = '';

    if (AppState.acordoEmEdicao) {
        AppState.acordoEmEdicao.editingPeriodoIndex = null;
        AppState.acordoEmEdicao.editingRegraIndex = null;
    }

    const sideBtns = document.querySelectorAll('.acordo-side-btn');
    sideBtns.forEach(b => b.classList.remove('active'));
    const panels = document.querySelectorAll('.acordo-panel');
    panels.forEach(p => p.classList.remove('active'));
    const defaultBtn = document.querySelector('.acordo-side-btn[data-panel="acordo-overview"]');
    const defaultPanel = document.getElementById('acordo-overview');
    if (defaultBtn) defaultBtn.classList.add('active');
    if (defaultPanel) defaultPanel.classList.add('active');

    const btnP = document.getElementById('btnAdicionarPeriodo');
    if (btnP) btnP.textContent = 'Adicionar Período';
    const btnR = document.getElementById('btnAdicionarRegra');
    if (btnR) btnR.textContent = 'Adicionar Regra';

    renderizarListasAcordo();
}

function renderizarListasAcordo() {
    try {
        const tbodyPeriodos = document.getElementById('tabelaPeriodosAcordo');
        const tbodyRegras = document.getElementById('tabelaRegrasAcordo');
        if (!tbodyPeriodos || !tbodyRegras) return;

        tbodyPeriodos.innerHTML = '';
        tbodyRegras.innerHTML = '';

        // Períodos
        (AppState.acordoEmEdicao.periodos || []).forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.inicio}</td>
                <td>${p.fim}</td>
                <td>${p.minutosExtras} min</td>
                <td>
                    <button type="button" class="btn-secondary" onclick="editarPeriodoAcordo(${idx})" title="Editar">✏️</button>
                    <button type="button" class="btn-error" onclick="removerPeriodoAcordo(${idx})" title="Deletar">🗑️</button>
                </td>
            `;
            tbodyPeriodos.appendChild(tr);
        });

        // Regras
        (AppState.acordoEmEdicao.regrasHorario || []).forEach((r, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.inicio}</td>
                <td>${r.fim}</td>
                <td>${r.minutosExtras}</td>
                <td>${r.inicioExpediente || ''}</td>
                <td>${r.almocoMin} min</td>
                <td>${r.tolAlmoco} min</td>
                <td>${r.tolSaida} min</td>
                <td>${r.tipo || ''}</td>
                <td>R$ ${Number(r.vale || 0).toFixed(2)}</td>
                <td>
                    <button type="button" class="btn-secondary" onclick="editarRegraHorario(${idx})" title="Editar">✏️</button>
                    <button type="button" class="btn-error" onclick="removerRegraHorario(${idx})" title="Deletar">🗑️</button>
                </td>
            `;
            tbodyRegras.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao renderizar listas de acordo:', error);
    }
}

function editarPeriodoAcordo(index) {
    try {
        const p = AppState.acordoEmEdicao.periodos[index];
        if (!p) throw new Error('Período não encontrado');
        document.getElementById('periodoInicio').value = p.inicio;
        document.getElementById('periodoFim').value = p.fim;
        document.getElementById('periodoMinutosExtras').value = p.minutosExtras || 0;
        AppState.acordoEmEdicao.editingPeriodoIndex = index;
        const btn = document.getElementById('btnAdicionarPeriodo');
        if (btn) btn.textContent = 'Salvar Período';
    } catch (error) {
        console.error('Erro ao editar período:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function adicionarPeriodoAcordo() {
    try {
        const inicio = document.getElementById('periodoInicio').value;
        const fim = document.getElementById('periodoFim').value;
        const minutosExtras = Number(document.getElementById('periodoMinutosExtras').value || 0);

        const periodo = { inicio, fim, minutosExtras };

        // Validar
        const erros = Validators.validatePeriodo(periodo);
        if (erros.length > 0) {
            throw new Error(erros.join('; '));
        }

        const editing = AppState.acordoEmEdicao.editingPeriodoIndex;
        if (editing != null) {
            AppState.acordoEmEdicao.periodos[editing] = periodo;
            AppState.acordoEmEdicao.editingPeriodoIndex = null;
            const btn = document.getElementById('btnAdicionarPeriodo');
            if (btn) btn.textContent = 'Adicionar Período';
        } else {
            AppState.acordoEmEdicao.periodos.push(periodo);
        }

        renderizarListasAcordo();
        document.getElementById('periodoInicio').value = '';
        document.getElementById('periodoFim').value = '';
        document.getElementById('periodoMinutosExtras').value = '';
    } catch (error) {
        console.error('Erro ao adicionar período:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function removerPeriodoAcordo(index) {
    AppState.acordoEmEdicao.periodos.splice(index, 1);
    renderizarListasAcordo();
}

function editarRegraHorario(index) {
    try {
        const r = AppState.acordoEmEdicao.regrasHorario[index];
        if (!r) throw new Error('Regra não encontrada');
        document.getElementById('regraInicio').value = r.inicio || '';
        document.getElementById('regraFim').value = r.fim || '';
        document.getElementById('regraMinutosExtras').value = r.minutosExtras || 0;
        document.getElementById('regraInicioExpediente').value = r.inicioExpediente || '';
        document.getElementById('regraAlmoco').value = r.almocoMin ?? 60;
        document.getElementById('regraTolAlmoco').value = r.tolAlmoco ?? 5;
        document.getElementById('regraTolSaida').value = r.tolSaida ?? 5;
        document.getElementById('regraTipo').value = r.tipo || '';
        document.getElementById('regraVale').value = r.vale || '';
        AppState.acordoEmEdicao.editingRegraIndex = index;
        const btn = document.getElementById('btnAdicionarRegra');
        if (btn) btn.textContent = 'Salvar Regra';
    } catch (error) {
        console.error('Erro ao editar regra:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function adicionarRegraHorario() {
    try {
        const inicio = document.getElementById('regraInicio').value;
        const fim = document.getElementById('regraFim').value;
        const minutosExtras = Number(document.getElementById('regraMinutosExtras').value || 0);
        const inicioExpediente = document.getElementById('regraInicioExpediente').value;
        const almocoMin = Number(document.getElementById('regraAlmoco').value || 60);
        const tolAlmoco = Number(document.getElementById('regraTolAlmoco').value || 5);
        const tolSaida = Number(document.getElementById('regraTolSaida').value || 5);
        const tipo = document.getElementById('regraTipo').value;
        const vale = Number(document.getElementById('regraVale').value || 0);

        const regra = {
            inicio,
            fim,
            minutosExtras,
            inicioExpediente,
            almocoMin,
            tolAlmoco,
            tolSaida,
            tipo,
            vale
        };

        // Validar
        const erros = Validators.validateRegraHorario(regra);
        if (erros.length > 0) {
            throw new Error(erros.join('; '));
        }

        const editing = AppState.acordoEmEdicao.editingRegraIndex;
        if (editing != null) {
            AppState.acordoEmEdicao.regrasHorario[editing] = regra;
            AppState.acordoEmEdicao.editingRegraIndex = null;
            const btn = document.getElementById('btnAdicionarRegra');
            if (btn) btn.textContent = 'Adicionar Regra';
        } else {
            AppState.acordoEmEdicao.regrasHorario.push(regra);
        }

        renderizarListasAcordo();
        document.getElementById('regraInicio').value = '';
        document.getElementById('regraFim').value = '';
        document.getElementById('regraMinutosExtras').value = '';
        document.getElementById('regraInicioExpediente').value = '';
        document.getElementById('regraTipo').value = '';
        document.getElementById('regraVale').value = '';
    } catch (error) {
        console.error('Erro ao adicionar regra:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function removerRegraHorario(index) {
    AppState.acordoEmEdicao.regrasHorario.splice(index, 1);
    renderizarListasAcordo();
}

function salvarAcordo() {
    try {
        const nome = document.getElementById('acordoNome').value.trim();
        AppState.acordoEmEdicao.nome = nome;

        // Validar
        const erros = Validators.validateAcordo(AppState.acordoEmEdicao);
        if (erros.length > 0) {
            throw new Error(erros.join('; '));
        }

        if (AppState.acordoEmEdicaoIndex == null) {
            AppState.dados.acordos.push(AppState.acordoEmEdicao);
        } else {
            AppState.dados.acordos[AppState.acordoEmEdicaoIndex] = AppState.acordoEmEdicao;
        }

        AppState.save();
        renderizarAcordos();
        atualizarSelectAcordosTimesheet();
        atualizarSelectAcordosEventos();
        atualizarSelectAcordosRegistros();
        fecharModalAcordo();
        mostrarAlertaGlobal('Acordo salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar acordo:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function fecharModalAcordo() {
    document.getElementById('modalAcordo').classList.remove('active');
    AppState.acordoEmEdicao = null;
    AppState.acordoEmEdicaoIndex = null;
}

function renderizarAcordos() {
    try {
        const container = document.getElementById('listaAcordos');
        if (!container) return;

        container.innerHTML = '';

        if (!AppState.dados.acordos.length) {
            const p = document.createElement('p');
            p.className = 'small-text';
            p.textContent = 'Nenhum acordo cadastrado ainda.';
            container.appendChild(p);
            return;
        }

        AppState.dados.acordos.forEach((a, idx) => {
            const div = document.createElement('div');
            div.className = 'acordo-card';

            const titulo = document.createElement('div');
            titulo.className = 'acordo-titulo';
            titulo.textContent = a.nome || `Acordo ${idx + 1}`;
            div.appendChild(titulo);

            const subt1 = document.createElement('div');
            subt1.className = 'acordo-subtitulo';
            subt1.textContent = 'Períodos de compensação:';
            div.appendChild(subt1);

            const ul1 = document.createElement('ul');
            ul1.className = 'acordo-lista';
            (a.periodos || []).forEach(p => {
                const li = document.createElement('li');
                li.textContent = `${p.inicio} a ${p.fim} (${p.minutosExtras} min/dia)`;
                ul1.appendChild(li);
            });
            div.appendChild(ul1);

            const subt2 = document.createElement('div');
            subt2.className = 'acordo-subtitulo';
            subt2.textContent = 'Regras de horário:';
            div.appendChild(subt2);

            const ul2 = document.createElement('ul');
            ul2.className = 'acordo-lista';
            (a.regrasHorario || []).forEach(r => {
                const li = document.createElement('li');
                li.textContent = `${r.inicio} a ${r.fim} - 8h + ${r.minutosExtras} min`;
                ul2.appendChild(li);
            });
            div.appendChild(ul2);

            const subt3 = document.createElement('div');
            subt3.className = 'acordo-subtitulo';
            subt3.textContent = 'Eventos e feriados:';
            div.appendChild(subt3);

            const ul3 = document.createElement('ul');
            ul3.className = 'acordo-lista';
            const eventosAcordo = AppState.dados.eventos.filter(ev => ev.acordoIndex === idx);
            if (!eventosAcordo.length) {
                const li = document.createElement('li');
                li.className = 'small-text';
                li.textContent = 'Nenhum evento vinculado';
                ul3.appendChild(li);
            } else {
                eventosAcordo.forEach(ev => {
                    const li = document.createElement('li');
                    const fim = ev.dataFimEvento && ev.dataFimEvento !== ev.dataInicioEvento
                        ? ` a ${ev.dataFimEvento}`
                        : '';
                    li.textContent = `${ev.tipoEvento} - ${ev.descricaoEvento} (${ev.dataInicioEvento}${fim})`;
                    ul3.appendChild(li);
                });
            }
            div.appendChild(ul3);

            const btnRow = document.createElement('div');
            btnRow.className = 'form-row';
            const btnEditar = document.createElement('button');
            btnEditar.type = 'button';
            btnEditar.className = 'btn-secondary';
            btnEditar.textContent = 'Editar';
            btnEditar.addEventListener('click', () => editarAcordo(idx));
            btnRow.appendChild(btnEditar);

            const btnEventos = document.createElement('button');
            btnEventos.type = 'button';
            btnEventos.className = 'btn-secondary';
            btnEventos.textContent = 'Eventos';
            btnEventos.addEventListener('click', () => abrirModalEventoParaAcordo(idx));
            btnRow.appendChild(btnEventos);

            div.appendChild(btnRow);
            container.appendChild(div);
        });

        // Atualiza selects dependentes (timesheet/eventos já atualizados em salvar, aqui garantimos registros)
        atualizarSelectAcordosRegistros();
    } catch (error) {
        console.error('Erro ao renderizar acordos:', error);
    }
}

// ============= UTILIDADES =============

function mostrarAlert(elementId, mensagem, tipo) {
    const area = document.getElementById(elementId);
    if (!area) return;
    area.innerHTML = '';
    const div = document.createElement('div');
    div.className = `alert alert-${tipo === 'success' ? 'success' : 'error'}`;
    div.textContent = mensagem;
    area.appendChild(div);
}

function mostrarAlertaGlobal(mensagem, tipo = 'error') {
    console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
    alert(mensagem);
}

// Exportar/Importar Registros - Formato Excel CSV
function exportarRegistrosCSV() {
    try {
        if (!AppState.dados.registros.length) {
            alert('Nenhum registro para exportar.');
            return;
        }

        // Criar CSV separado por ponto-vírgula (padrão Excel em PT-BR)
        let csv = 'Data;Entrada;Saída Almoço;Retorno Almoço;Saída;Observações\n';
        
        AppState.dados.registros
            .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
            .forEach(r => {
                const linha = [
                    r.data || '',
                    r.entrada || '',
                    r.saidaAlmoco || '',
                    r.retornoAlmoco || '',
                    r.saida || '',
                    r.observacoes || ''
                ].map(v => `"${v}"`).join(';');
                csv += linha + '\n';
            });

        // Exportar com BOM UTF-8 para Excel reconhecer caracteres acentuados
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `registros_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        mostrarAlertaGlobal('Registros exportados como CSV. Abra no Excel - abrirá em colunas automaticamente!', 'success');
    } catch (error) {
        console.error('Erro ao exportar registros:', error);
        mostrarAlertaGlobal('Erro ao exportar: ' + error.message, 'error');
    }
}

function importarRegistrosCSV(event) {
    try {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        console.log('Arquivo selecionado:', file.name, 'tipo:', file.type);

        const reader = new FileReader();
        
        reader.onload = function (e) {
            try {
                let registros = [];
                
                // Se for arquivo binário Excel (.xls, .xlsx), tentar com XLSX
                if ((file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) && typeof XLSX !== 'undefined') {
                    console.log('Lendo arquivo Excel com biblioteca XLSX...');
                    
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    console.log('Planilhas encontradas:', workbook.SheetNames);
                    
                    // Pegar a primeira planilha
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Converter para JSON
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    console.log('Total de linhas na planilha:', rows.length);
                    
                    // Processar dados
                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        
                        if (!row || row.length === 0) continue;
                        
                        let data = row[0];
                        const entrada = row[1] || '';
                        const saidaAlmoco = row[2] || '';
                        const retornoAlmoco = row[3] || '';
                        const saida = row[4] || '';
                        const observacoes = row[5] || '';
                        
                        // Converter data Excel para YYYY-MM-DD
                        if (typeof data === 'number') {
                            const date = new Date((data - 25569) * 86400 * 1000);
                            data = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        } else if (typeof data === 'string' && data.includes('/')) {
                            const partes = data.split('/');
                            if (partes.length === 3) {
                                const [d, m, y] = partes;
                                data = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                            }
                        }
                        
                        if (data && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            registros.push({ 
                                data: data.toString(), 
                                entrada: entrada?.toString() || '', 
                                saidaAlmoco: saidaAlmoco?.toString() || '', 
                                retornoAlmoco: retornoAlmoco?.toString() || '', 
                                saida: saida?.toString() || '', 
                                observacoes: observacoes?.toString() || '' 
                            });
                            console.log(`✓ Linha ${i}: ${data}`);
                        }
                    }
                } else {
                    // Para arquivos texto (CSV, TXT)
                    console.log('Lendo arquivo texto...');
                    
                    let text = e.target.result;
                    text = text.replace(/\x00/g, '').trim();
                    
                    if (!text || text.length === 0) {
                        throw new Error('Arquivo vazio.');
                    }
                    
                    const linhas = text.split(/\r?\n/).filter(l => l && l.trim().length > 0);
                    
                    if (linhas.length < 2) {
                        throw new Error('Arquivo sem dados suficientes.');
                    }
                    
                    // Detectar separador (ponto-vírgula, vírgula ou tab)
                    let separador = ';';
                    if (linhas[0].includes('\t')) {
                        separador = '\t';
                    } else if (!linhas[0].includes(';') && linhas[0].includes(',')) {
                        separador = ',';
                    }
                    
                    console.log('Separador detectado:', separador);
                    
                    for (let i = 1; i < linhas.length; i++) {
                        const cols = linhas[i]
                            .split(separador)
                            .map(c => c.trim().replace(/^"|"$/g, ''));
                        
                        if (cols.length < 1 || !cols[0]) continue;
                        
                        let data = cols[0];
                        const entrada = cols[1] || '';
                        const saidaAlmoco = cols[2] || '';
                        const retornoAlmoco = cols[3] || '';
                        const saida = cols[4] || '';
                        const observacoes = cols[5] || '';
                        
                        // Converter data
                        if (data && data.includes('/')) {
                            const partes = data.split('/');
                            if (partes.length === 3) {
                                const [d, m, y] = partes;
                                data = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                            }
                        }
                        
                        if (data && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            registros.push({ 
                                data, entrada, saidaAlmoco, retornoAlmoco, saida, observacoes 
                            });
                            console.log(`✓ Linha ${i}: ${data}`);
                        }
                    }
                }

                console.log('Total de registros válidos:', registros.length);

                if (registros.length === 0) {
                    throw new Error('Nenhum registro válido encontrado.');
                }

                const substituir = confirm(`Importar ${registros.length} registros?\n\nOK = Substituir todos\nCancelar = Mesclar`);

                if (substituir) {
                    AppState.dados.registros = registros.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
                } else {
                    registros.forEach(novo => {
                        const idx = AppState.dados.registros.findIndex(r => r.data === novo.data);
                        if (idx >= 0) {
                            AppState.dados.registros[idx] = novo;
                        } else {
                            AppState.dados.registros.push(novo);
                        }
                    });
                }

                AppState.save();
                atualizarDashboard();
                renderizarTabelaRegistros();
                mostrarAlertaGlobal(`${registros.length} registros importados com sucesso!`, 'success');
            } catch (error) {
                console.error('ERRO:', error);
                mostrarAlertaGlobal('Erro ao importar: ' + error.message, 'error');
            } finally {
                event.target.value = '';
            }
        };
        
        reader.onerror = function() {
            mostrarAlertaGlobal('Erro ao ler o arquivo.', 'error');
            event.target.value = '';
        };
        
        // Ler como texto ou ArrayBuffer conforme o tipo
        if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file, 'utf-8');
        }
    } catch (error) {
        console.error('ERRO:', error);
        mostrarAlertaGlobal('Erro: ' + error.message, 'error');
    }
}

// stubs restantes
function exportarRegistrosPDF() { alert('PDF em desenvolvimento'); }
function exportarTimesheetCSV() { alert('Exportação timesheet em desenvolvimento'); }
function exportarTimesheetPDF() { alert('PDF timesheet em desenvolvimento'); }
function exportarDados() { alert('Backup em desenvolvimento'); }
function importarDados(event) { alert('Restauração em desenvolvimento'); }
function salvarConfiguracoes() { alert('Configurações em desenvolvimento'); }
function carregarConfiguracoes() { alert('Carregamento de configurações em desenvolvimento'); }

// ============= SCROLL NAVIGATION =============
function scrollTableLeft(event) {
    event.preventDefault();
    const container = document.getElementById('tableScrollContainer');
    if (container) {
        container.scrollLeft -= 200;
    }
}

function scrollTableRight(event) {
    event.preventDefault();
    const container = document.getElementById('tableScrollContainer');
    if (container) {
        container.scrollLeft += 200;
    }
}

// ============= EXPORT/IMPORT EVENTOS EXCEL =============

function exportarEventosExcel() {
    try {
        if (!AppState.dados.eventos.length) {
            alert('Nenhum evento para exportar.');
            return;
        }

        // Cabeçalhos
        const headers = ['Tipo', 'Descrição', 'Acordo', 'Início', 'Fim', 'Impacto'];
        
        // Converter eventos para linhas CSV
        const rows = AppState.dados.eventos.map(ev => [
            ev.tipoEvento || '',
            ev.descricaoEvento || '',
            (ev.acordoIndex != null && AppState.dados.acordos[ev.acordoIndex]) 
                ? AppState.dados.acordos[ev.acordoIndex].nome 
                : '',
            ev.dataInicioEvento || '',
            ev.dataFimEvento || '',
            ev.impactoEvento || ''
        ]);

        // Montar CSV
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Criar blob e download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `eventos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        mostrarAlertaGlobal('Eventos exportados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao exportar eventos:', error);
        mostrarAlertaGlobal('Erro ao exportar: ' + error.message, 'error');
    }
}

function importarEventosExcel(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const linhas = text.trim().split('\n');
                
                if (linhas.length < 2) {
                    throw new Error('Arquivo vazio ou inválido.');
                }

                // Pular cabeçalho
                const eventos = [];
                for (let i = 1; i < linhas.length; i++) {
                    const linha = linhas[i];
                    const colunas = linha.split(',').map(col => col.replace(/^"|"$/g, '').trim());

                    if (colunas.length < 6) continue;

                    const [tipo, descricao, acordoNome, dataInicio, dataFim, impacto] = colunas;

                    // Localizar índice do acordo pelo nome
                    let acordoIndex = null;
                    if (acordoNome) {
                        const acordoIdx = AppState.dados.acordos.findIndex(a => a.nome === acordoNome);
                        if (acordoIdx >= 0) acordoIndex = acordoIdx;
                    }

                    const evento = {
                        tipoEvento: tipo || 'feriado',
                        descricaoEvento: descricao || '',
                        dataInicioEvento: dataInicio || '',
                        dataFimEvento: dataFim || dataInicio || '',
                        impactoEvento: impacto || 'folga',
                        acordoIndex: acordoIndex
                    };

                    // Validar evento
                    const erros = Validators.validateEvento(evento);
                    if (erros.length === 0) {
                        eventos.push(evento);
                    }
                }

                if (eventos.length === 0) {
                    throw new Error('Nenhum evento válido encontrado no arquivo.');
                }

                // Perguntar se deseja adicionar ou substituir
                if (confirm(`Encontrados ${eventos.length} eventos. Deseja adicioná-los aos existentes?`)) {
                    AppState.dados.eventos.push(...eventos);
                    AppState.save();
                    renderizarEventos();
                    mostrarAlertaGlobal(`${eventos.length} eventos importados com sucesso!`, 'success');
                }
            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                mostrarAlertaGlobal('Erro ao importar: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input para permitir reselecionar
    } catch (error) {
        console.error('Erro ao importar eventos:', error);
        mostrarAlertaGlobal('Erro ao importar: ' + error.message, 'error');
    }
}

// ============= DEBUG E DIAGNÓSTICO =============

// Função para exportar config completa e debug
function exportarDiagnostico() {
    const diagnostico = {
        timestamp: new Date().toISOString(),
        acordos: AppState.dados.acordos,
        eventos: AppState.dados.eventos,
        resumoRegistros: {
            total: AppState.dados.registros.length,
            novembro: AppState.dados.registros.filter(r => r.data.startsWith('2024-11')).length,
            outubro: AppState.dados.registros.filter(r => r.data.startsWith('2024-10')).length
        },
        detalhesNovembro: AppState.dados.registros
            .filter(r => r.data.startsWith('2024-11'))
            .map(r => {
                const calc = Calculations.calculateDayWithContext(
                    AppState.dados.registros, AppState.dados.eventos, AppState.dados.acordos, r.data, r
                );
                return {
                    data: r.data,
                    entrada: r.entrada,
                    saida: r.saida,
                    trabalhadas: DateUtils.minutesToTime(calc.trabalhadas),
                    saldo: DateUtils.minutesToTime(calc.saldo),
                    detalhes: calc.detalhes,
                    acordo: calc.acordo?.nome || 'PADRÃO'
                };
            })
    };
    
    const blob = new Blob([JSON.stringify(diagnostico, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostico_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('Diagnóstico exportado:', diagnostico);
}

// Adicionar função ao window para chamar do console
window.exportarDiagnostico = exportarDiagnostico;

// ============= GERENCIAMENTO DE TIPOS DE EVENTOS =============

function abrirModalNovoTipoEvento() {
    renderizarListaTiposEventos();
    document.getElementById('modalTiposEvento').classList.add('active');
    document.getElementById('novoTipoNome').value = '';
    document.getElementById('novoTipoCor').value = '#f3f4f6';
    document.getElementById('novoTipoNome').focus();
}

function fecharModalTiposEvento() {
    document.getElementById('modalTiposEvento').classList.remove('active');
    atualizarSelectTiposEventos();
}

function renderizarListaTiposEventos() {
    const container = document.getElementById('listaTiposEventos');
    const tipos = AppState.dados.tiposEvento || [];
    
    container.innerHTML = '';
    
    tipos.forEach((tipo, index) => {
        const card = document.createElement('div');
        card.className = 'tipo-card';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'tipo-color';
        colorBox.style.backgroundColor = tipo.cor || '#f3f4f6';
        
        const nameLabel = document.createElement('span');
        nameLabel.className = 'tipo-name';
        nameLabel.textContent = tipo.nome;
        
        const actions = document.createElement('div');
        actions.className = 'tipo-actions';
        
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-secondary btn-sm';
        editBtn.textContent = '✏️ Editar';
        editBtn.onclick = () => abrirEditarTipoEvento(index);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-error btn-sm';
        deleteBtn.textContent = '🗑️ Deletar';
        deleteBtn.onclick = () => deletarTipoEvento(index);
        
        // Desabilitar delete se for tipo padrão (primeiros 7)
        if (index < 7) {
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.5';
            deleteBtn.style.cursor = 'not-allowed';
        }
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        card.appendChild(colorBox);
        card.appendChild(nameLabel);
        card.appendChild(actions);
        container.appendChild(card);
    });
}

function adicionarNovoTipoEvento() {
    const nome = document.getElementById('novoTipoNome').value.trim();
    const cor = document.getElementById('novoTipoCor').value;
    
    if (!nome) {
        mostrarAlertaGlobal('Digite um nome para o novo tipo', 'error');
        return;
    }
    
    // Gerar ID baseado no nome (snake_case)
    const id = nome.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Verificar se já existe
    if (AppState.dados.tiposEvento.some(t => t.id === id)) {
        mostrarAlertaGlobal('Este tipo de evento já existe', 'error');
        return;
    }
    
    const novoTipo = {
        id: id,
        nome: nome,
        cor: cor
    };
    
    AppState.dados.tiposEvento.push(novoTipo);
    AppState.save();
    
    renderizarListaTiposEventos();
    document.getElementById('novoTipoNome').value = '';
    document.getElementById('novoTipoCor').value = '#f3f4f6';
    
    mostrarAlertaGlobal(`Tipo "${nome}" adicionado com sucesso`, 'success');
}

function abrirEditarTipoEvento(index) {
    const tipo = AppState.dados.tiposEvento[index];
    if (!tipo) return;
    
    const novoNome = prompt(`Editar nome do tipo:\n(Atual: "${tipo.nome}")`, tipo.nome);
    if (novoNome === null) return;
    
    if (!novoNome.trim()) {
        mostrarAlertaGlobal('Nome não pode estar vazio', 'error');
        return;
    }
    
    AppState.dados.tiposEvento[index].nome = novoNome.trim();
    AppState.save();
    
    renderizarListaTiposEventos();
    mostrarAlertaGlobal('Tipo atualizado com sucesso', 'success');
}

function deletarTipoEvento(index) {
    const tipo = AppState.dados.tiposEvento[index];
    if (!tipo) return;
    
    // Não permite deletar os tipos padrões (primeiros 7)
    if (index < 7) {
        mostrarAlertaGlobal('Não é permitido deletar tipos padrão', 'error');
        return;
    }
    
    if (!confirm(`Tem certeza que deseja deletar "${tipo.nome}"?`)) return;
    
    AppState.dados.tiposEvento.splice(index, 1);
    AppState.save();
    
    renderizarListaTiposEventos();
    mostrarAlertaGlobal('Tipo deletado com sucesso', 'success');
}

function atualizarSelectTiposEventos() {
    const select = document.getElementById('tipoEvento');
    if (!select) return;
    
    const tipos = AppState.dados.tiposEvento || [];
    const valorAtual = select.value;
    
    // Guardar valor selecionado se existir
    select.innerHTML = '';
    
    tipos.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo.id;
        option.textContent = tipo.nome;
        select.appendChild(option);
    });
    
    // Restaurar valor se ainda existir
    if (tipos.some(t => t.id === valorAtual)) {
        select.value = valorAtual;
    } else if (tipos.length > 0) {
        select.value = tipos[0].id;
    }
}
