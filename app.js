const STORAGE_KEY = 'controle_ponto_avancado_v1';

let dados = {
    registros: [],
    configuracoes: {
        tipoJornada: 44,
        entradaPadrao: '',
        saidaPadrao: '',
        almocoMinutos: 60,
        toleranciaAtraso: 5,
        inicioPeriodoBanco: '',
        fimPeriodoBanco: ''
    },
    eventos: [],
    acordos: []
};

let eventoSelecionadoIndex = null;
let acordoEmEdicao = null;
let acordoEmEdicaoIndex = null;

// Inicialização

function inicializar() {
    carregarDados();
    configurarAbas();
    configurarSubAbas();
    carregarConfiguracoes();
    atualizarDashboard();
    renderizarTabelaRegistros();
    renderizarEventos();
    renderizarAcordos();
    atualizarSelectAcordosTimesheet();
}
inicializar();

// LocalStorage

function salvarDados() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

function carregarDados() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw);
        dados.registros = parsed.registros || [];
        dados.configuracoes = parsed.configuracoes || dados.configuracoes;
        dados.eventos = parsed.eventos || [];
        dados.acordos = parsed.acordos || [];
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
    }
}

// Helpers

function normalizarDataImportacao(str) {
    if (!str) return '';
    const s = str.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [d, m, a] = s.split('/');
        return `${a}-${m}-${d}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        const [d, m, a] = s.split('-');
        return `${a}-${m}-${d}`;
    }
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
        const [a, m, d] = s.split('/');
        return `${a}-${m}-${d}`;
    }
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
        const [a, m, d] = s.split('-');
        return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return s;
}

function parseTimeToMinutes(t) {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

function minutesToHHMM(total) {
    const sinal = total < 0 ? '-' : '';
    const v = Math.abs(total);
    const h = Math.floor(v / 60);
    const m = v % 60;
    return `${sinal}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function ehDiaUtil(dateObj) {
    const dow = dateObj.getDay();
    return dow !== 0 && dow !== 6;
}

// Eventos por data

function obterEventoPorData(dataStr) {
    return dados.eventos.find(e =>
        e.dataInicioEvento <= dataStr &&
        e.dataFimEvento >= dataStr
    ) || null;
}

// Abas

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
        });
    });
}

// Acordos e regras

function obterAcordoPorData(dataStr) {
    for (const acordo of dados.acordos) {
        if (!acordo.periodos) continue;
        const periodo = acordo.periodos.find(p => p.inicio <= dataStr && p.fim >= dataStr);
        if (periodo) return acordo;
    }
    return null;
}

function obterMinutosExtrasAcordo(acordo, dataStr) {
    if (!acordo || !acordo.periodos) return 0;
    const periodo = acordo.periodos.find(p => p.inicio <= dataStr && p.fim >= dataStr);
    return periodo ? Number(periodo.minutosExtras || 0) : 0;
}

function obterRegraHorarioParaData(acordo, dataStr) {
    if (!acordo || !acordo.regrasHorario) return null;
    return acordo.regrasHorario.find(r => r.inicio <= dataStr && r.fim >= dataStr) || null;
}

function calcularHorasDiaDetalhado(registro, minutosExtrasPeriodo, regra) {
    if (!registro || !registro.entrada || !registro.saida) {
        return {
            trabalhadas: 0,
            saldo: 0,
            temRegistro: !!registro,
            status: 'sem_registro'
        };
    }

    const entrada = parseTimeToMinutes(registro.entrada);
    const saida = parseTimeToMinutes(registro.saida);
    const saidaAlm = registro.saidaAlmoco ? parseTimeToMinutes(registro.saidaAlmoco) : null;
    const retornoAlm = registro.retornoAlmoco ? parseTimeToMinutes(registro.retornoAlmoco) : null;

    const almocoPadrao = regra.almocoMin || 60;
    const tolAlmoco = regra.tolAlmoco || 5;
    const tolSaida = regra.tolSaida || 5;

    let duracaoAlmoco;
    if (saidaAlm !== null && retornoAlm !== null && retornoAlm > saidaAlm) {
        duracaoAlmoco = retornoAlm - saidaAlm;
    } else {
        duracaoAlmoco = almocoPadrao;
    }

    const diffAlmoco = duracaoAlmoco - almocoPadrao;
    if (Math.abs(diffAlmoco) <= tolAlmoco) {
        duracaoAlmoco = almocoPadrao;
    }

    const trabalhadas = (saida - entrada) - duracaoAlmoco;
    const carga = 480 + (minutosExtrasPeriodo || 0);
    let saldo = trabalhadas - carga;

    if (Math.abs(saldo) <= tolSaida) {
        saldo = 0;
    }

    let status = 'ok';
    if (saldo > 0) status = 'extra';
    if (saldo < 0) status = 'falta';

    return {
        trabalhadas,
        saldo,
        temRegistro: true,
        status
    };
}

function calcularHorasDiaComContexto(dataStr, registro) {
    const acordo = obterAcordoPorData(dataStr);
    const minutosExtrasPeriodo = obterMinutosExtrasAcordo(acordo, dataStr);

    let regra = obterRegraHorarioParaData(acordo, dataStr);
    if (!regra) {
        regra = {
            almocoMin: dados.configuracoes.almocoMinutos || 60,
            tolAlmoco: 5,
            tolSaida: dados.configuracoes.toleranciaAtraso || 5
        };
    }

    return calcularHorasDiaDetalhado(registro, minutosExtrasPeriodo, regra);
}

// Dashboard

function atualizarDashboard() {
    let totalMin = 0;
    let saldoBanco = 0;
    let horasExtras = 0;
    let horasAcordo = 0;

    dados.registros.forEach(r => {
        const acordo = obterAcordoPorData(r.data);
        const minutosExtras = obterMinutosExtrasAcordo(acordo, r.data);
        const calc = calcularHorasDiaComContexto(r.data, r);

        totalMin += calc.trabalhadas;
        saldoBanco += calc.saldo;

        if (calc.saldo > 0) horasExtras += calc.saldo;
        if (minutosExtras > 0) horasAcordo += minutosExtras;
    });

    document.getElementById('horasPeriodo').textContent = minutesToHHMM(totalMin);
    document.getElementById('saldoBancoHoras').textContent = minutesToHHMM(saldoBanco);
    document.getElementById('horasExtras').textContent = minutesToHHMM(horasExtras);
    document.getElementById('horasAcordo').textContent = minutesToHHMM(horasAcordo);

    const listaAvisos = document.getElementById('listaAvisos');
    listaAvisos.innerHTML = '';

    if (!dados.registros.length) {
        const li = document.createElement('li');
        li.textContent = 'Nenhum registro de ponto cadastrado ainda.';
        listaAvisos.appendChild(li);
    } else {
        const hoje = new Date().toISOString().slice(0, 10);
        const hojeRegistro = dados.registros.find(r => r.data === hoje);
        if (!hojeRegistro) {
            const li = document.createElement('li');
            li.textContent = 'Atenção: ainda não há registro de ponto para hoje.';
            listaAvisos.appendChild(li);
        }
    }
}

// Registros

function renderizarTabelaRegistros() {
    const tbody = document.querySelector('#tabelaRegistros tbody');
    tbody.innerHTML = '';

    dados.registros
        .slice()
        .sort((a, b) => a.data.localeCompare(b.data))
        .forEach((r, index) => {
            const calc = calcularHorasDiaComContexto(r.data, r);
            const classSaldo =
                calc.saldo > 0 ? 'saldo-positivo' :
                calc.saldo < 0 ? 'saldo-negativo' : '';

                const tr = document.createElement('tr');

                const tdData = document.createElement('td');
                tdData.textContent = r.data;
                tr.appendChild(tdData);

                const tdEntrada = document.createElement('td');
                tdEntrada.textContent = r.entrada || '';
                tr.appendChild(tdEntrada);

                const tdSaidaAlm = document.createElement('td');
                tdSaidaAlm.textContent = r.saidaAlmoco || '';
                tr.appendChild(tdSaidaAlm);

                const tdRetorno = document.createElement('td');
                tdRetorno.textContent = r.retornoAlmoco || '';
                tr.appendChild(tdRetorno);

                const tdSaida = document.createElement('td');
                tdSaida.textContent = r.saida || '';
                tr.appendChild(tdSaida);

                const tdTrab = document.createElement('td');
                tdTrab.textContent = minutesToHHMM(calc.trabalhadas);
                tr.appendChild(tdTrab);

                const tdSaldo = document.createElement('td');
                tdSaldo.className = classSaldo;
                tdSaldo.textContent = calc.saldo ? minutesToHHMM(calc.saldo) : '';
                tr.appendChild(tdSaldo);

                const tdObs = document.createElement('td');
                tdObs.textContent = r.observacoes || '';
                tr.appendChild(tdObs);

                const tdActions = document.createElement('td');

                const btnEdit = document.createElement('button');
                btnEdit.type = 'button';
                btnEdit.className = 'btn-secondary';
                btnEdit.textContent = '✏️';
                btnEdit.addEventListener('click', () => editarRegistro(index));
                tdActions.appendChild(btnEdit);

                const btnDel = document.createElement('button');
                btnDel.type = 'button';
                btnDel.className = 'btn-error';
                btnDel.textContent = '🗑️';
                btnDel.addEventListener('click', () => excluirRegistro(index));
                tdActions.appendChild(btnDel);

                tr.appendChild(tdActions);
                tbody.appendChild(tr);
        });
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
    const data = document.getElementById('dataRegistro').value;
    const entrada = document.getElementById('entradaRegistro').value;
    const saidaAlmoco = document.getElementById('saidaAlmocoRegistro').value;
    const retornoAlmoco = document.getElementById('retornoAlmocoRegistro').value;
    const saida = document.getElementById('saidaRegistro').value;
    const observacoes = document.getElementById('observacoesRegistro').value;

    if (!data || !entrada || !saida) {
        alert('Preencha pelo menos Data, Entrada e Saída.');
        return;
    }

    const registro = { data, entrada, saidaAlmoco, retornoAlmoco, saida, observacoes };
    const idxExistente = dados.registros.findIndex(r => r.data === data);

    if (idxExistente >= 0) {
        dados.registros[idxExistente] = registro;
    } else {
        dados.registros.push(registro);
    }

    salvarDados();
    atualizarDashboard();
    renderizarTabelaRegistros();
    fecharModalRegistro();
}

function editarRegistro(index) {
    const r = dados.registros[index];
    if (!r) return;

    document.getElementById('dataRegistro').value = r.data;
    document.getElementById('entradaRegistro').value = r.entrada || '';
    document.getElementById('saidaAlmocoRegistro').value = r.saidaAlmoco || '';
    document.getElementById('retornoAlmocoRegistro').value = r.retornoAlmoco || '';
    document.getElementById('saidaRegistro').value = r.saida || '';
    document.getElementById('observacoesRegistro').value = r.observacoes || '';

    document.getElementById('modalRegistro').classList.add('active');
}

function excluirRegistro(index) {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    dados.registros.splice(index, 1);
    salvarDados();
    atualizarDashboard();
    renderizarTabelaRegistros();
}

// Timesheet

function atualizarSelectAcordosTimesheet() {
    const select = document.getElementById('acordoTimesheet');
    if (!select) return;

    select.innerHTML = '';

    if (!dados.acordos.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Nenhum acordo cadastrado';
        select.appendChild(opt);
        return;
    }

    dados.acordos.forEach((a, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = a.nome || `Acordo ${idx + 1}`;
        select.appendChild(opt);
    });
}

function gerarTimesheetAcordo() {
    const select = document.getElementById('acordoTimesheet');
    if (!select) {
        alert('Elemento <select id="acordoTimesheet"> não encontrado.');
        return;
    }

    const idx = Number(select.value);
    if (isNaN(idx) || !dados.acordos[idx]) {
        alert('Selecione um acordo válido.');
        return;
    }

    const acordo = dados.acordos[idx];
    if (!acordo.periodos || !acordo.periodos.length) {
        alert('Acordo sem períodos de compensação.');
        return;
    }

    const ordenados = [...acordo.periodos].sort((a, b) => a.inicio.localeCompare(b.inicio));
    const inicio = new Date(ordenados[0].inicio);
    const fim = new Date(ordenados[ordenados.length - 1].fim);

    const content = document.getElementById('timesheetContent');
    content.innerHTML = '';

    const mapaReg = {};
    dados.registros.forEach(r => {
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
    let saldoAcumuladoGeral = 0;

    const dataAux = new Date(inicio.getFullYear(), inicio.getMonth(), 1);

    while (dataAux <= fim) {
        const ano = dataAux.getFullYear();
        const mes = dataAux.getMonth();

        const primeiroDiaMes = new Date(ano, mes, 1);
        const ultimoDiaMes = new Date(ano, mes + 1, 0);
        const ultimoDia = ultimoDiaMes.getDate();

        if (ultimoDiaMes < inicio || primeiroDiaMes > fim) {
            dataAux.setMonth(dataAux.getMonth() + 1);
            continue;
        }

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

        const eventos = dias.map(d => obterEventoPorData(d.dataStr));
        const eventoSpanCriado = new Array(dias.length).fill(false);
        const fimSemanaSpanCriado = new Array(dias.length).fill(false);

        function obterCalcDia(dia) {
            const r = mapaReg[dia.dataStr];
            return calcularHorasDiaComContexto(dia.dataStr, r);
        }

        let saldoMes = 0;

        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            const tr = document.createElement('tr');

            if (rowIndex === 5) tr.classList.add('row-separador-azul');
            if (rowIndex === 2) tr.classList.add('row-duracao-almoco');

            const tdLabel = document.createElement('td');
            tdLabel.textContent = labels[rowIndex];
            tr.appendChild(tdLabel);

            dias.forEach((dia, colIdx) => {
                const ev = eventos[colIdx];

                // Evento
                if (ev) {
                    // special handling: compensar_acordo should NOT create a merged vertical cell
                    // nor display text — only color the individual day cell. For other event types
                    // we keep the existing merged vertical cell behavior.
                    if (ev.tipoEvento === 'compensar_acordo') {
                        const td = document.createElement('td');
                        td.className = 'evento-compensar-acordo';
                        // do not set textContent and do not set rowSpan: color-only per-cell
                        tr.appendChild(td);
                        return;
                    }

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
                            case 'compensar_acordo':
                                classeEvento = 'evento-compensar-acordo';
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
                        td.textContent = ''; // vazio, como você pediu
                        tr.appendChild(td);
                        fimSemanaSpanCriado[colIdx] = true;
                    }
                    return;
                }

                // Dia útil normal
                const r = mapaReg[dia.dataStr] || null;
                const td = document.createElement('td');

                if (rowIndex === 0) td.textContent = r && r.entrada || '';
                if (rowIndex === 1) td.textContent = r && r.saidaAlmoco || '';
                if (rowIndex === 2) {
                    if (r && r.saidaAlmoco && r.retornoAlmoco) {
                        const iniAlm = parseTimeToMinutes(r.saidaAlmoco);
                        const fimAlm = parseTimeToMinutes(r.retornoAlmoco);
                        if (iniAlm != null && fimAlm != null && fimAlm > iniAlm) {
                            const dur = fimAlm - iniAlm;
                            td.textContent = minutesToHHMM(dur);
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
                            td.textContent = minutesToHHMM(calc.trabalhadas);
                            if (calc.status === 'extra') td.classList.add('saldo-positivo');
                            if (calc.status === 'falta') td.classList.add('saldo-negativo');
                        } else if (rowIndex === 7) {
                            // show saldo only when non-zero
                            if (calc.saldo !== 0) {
                                td.textContent = minutesToHHMM(calc.saldo);

                                if (calc.saldo > 0) {
                                    td.classList.add('saldo-positivo');
                                    totalExtras++;
                                }
                                if (calc.saldo < 0) {
                                    td.classList.add('saldo-negativo');
                                    totalFaltas++;
                                }

                                saldoMes += calc.saldo || 0;
                            } else {
                                // zero saldo -> leave cell empty (no text, no saldo classes)
                                td.textContent = '';
                            }
                        }
                    } else {
                        // dia útil sem registro -> potencial falta
                        if (!dia.isWeekend && ehDiaUtil(dia.data)) {
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

            tbody.appendChild(tr);
        }

        // Linha saldo mês (acumulado geral)
        const trSaldoMes = document.createElement('tr');
        trSaldoMes.className = 'row-saldo-mes';

        const tdLabelSaldo = document.createElement('td');
        tdLabelSaldo.textContent = 'SALDO MÊS';
        trSaldoMes.appendChild(tdLabelSaldo);

        const tdSaldo = document.createElement('td');
        tdSaldo.colSpan = dias.length;

        saldoAcumuladoGeral += saldoMes;
        tdSaldo.textContent = minutesToHHMM(saldoAcumuladoGeral);

        if (saldoAcumuladoGeral > 0) {
            tdSaldo.classList.add('saldo-positivo');
        } else if (saldoAcumuladoGeral < 0) {
            tdSaldo.classList.add('saldo-negativo');
        }

        trSaldoMes.appendChild(tdSaldo);
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
}

// Configurações

function salvarConfiguracoes() {
    const tipoJornada = Number(document.getElementById('tipoJornada').value);
    const entradaPadrao = document.getElementById('entradaPadrao').value;
    const saidaPadrao = document.getElementById('saidaPadrao').value;
    const almocoMinutos = Number(document.getElementById('almocoMinutos').value || 60);
    const toleranciaAtraso = Number(document.getElementById('toleranciaAtraso').value || 5);
    const inicioPeriodoBanco = document.getElementById('inicioPeriodoBanco').value;
    const fimPeriodoBanco = document.getElementById('fimPeriodoBanco').value;

    dados.configuracoes = {
        tipoJornada,
        entradaPadrao,
        saidaPadrao,
        almocoMinutos,
        toleranciaAtraso,
        inicioPeriodoBanco,
        fimPeriodoBanco
    };

    salvarDados();
    mostrarAlert('alertAreaConfig', 'Configurações salvas com sucesso.', 'success');
    atualizarDashboard();
}

function carregarConfiguracoes() {
    const cfg = dados.configuracoes || {};

    document.getElementById('tipoJornada').value = cfg.tipoJornada || 44;
    document.getElementById('entradaPadrao').value = cfg.entradaPadrao || '';
    document.getElementById('saidaPadrao').value = cfg.saidaPadrao || '';
    document.getElementById('almocoMinutos').value = cfg.almocoMinutos ?? 60;
    document.getElementById('toleranciaAtraso').value = cfg.toleranciaAtraso ?? 5;
    document.getElementById('inicioPeriodoBanco').value = cfg.inicioPeriodoBanco || '';
    document.getElementById('fimPeriodoBanco').value = cfg.fimPeriodoBanco || '';
}

// Eventos

function salvarEvento() {
    const tipoEvento = document.getElementById('tipoEvento').value;
    const descricaoEvento = document.getElementById('descricaoEvento').value;
    const dataInicioEvento = document.getElementById('dataInicioEvento').value;
    const dataFimEvento = document.getElementById('dataFimEvento').value;
    const impactoEvento = document.getElementById('impactoEvento').value;

    if (!descricaoEvento || !dataInicioEvento) {
        alert('Preencha pelo menos descrição e data inicial.');
        return;
    }

    const ev = {
        tipoEvento,
        descricaoEvento,
        dataInicioEvento,
        dataFimEvento: dataFimEvento || dataInicioEvento,
        impactoEvento
    };

    dados.eventos.push(ev);
    salvarDados();
    renderizarEventos();
    limparEvento();
}

function limparEvento() {
    document.getElementById('tipoEvento').value = 'feriado';
    document.getElementById('descricaoEvento').value = '';
    document.getElementById('dataInicioEvento').value = '';
    document.getElementById('dataFimEvento').value = '';
    document.getElementById('impactoEvento').value = 'folga';
}

function renderizarEventos() {
    const tbody = document.querySelector('#tabelaEventos tbody');
    tbody.innerHTML = '';

    dados.eventos.forEach((e, idx) => {
        const tr = document.createElement('tr');

        const tdTipo = document.createElement('td');
        tdTipo.textContent = e.tipoEvento;
        tr.appendChild(tdTipo);

        const tdDesc = document.createElement('td');
        tdDesc.textContent = e.descricaoEvento;
        tr.appendChild(tdDesc);

        const tdInicio = document.createElement('td');
        tdInicio.textContent = e.dataInicioEvento;
        tr.appendChild(tdInicio);

        const tdFim = document.createElement('td');
        tdFim.textContent = e.dataFimEvento;
        tr.appendChild(tdFim);

        const tdImpacto = document.createElement('td');
        tdImpacto.textContent = e.impactoEvento;
        tr.appendChild(tdImpacto);

        const tdActions = document.createElement('td');
        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'btn-error';
        btnDel.textContent = '🗑️';
        btnDel.addEventListener('click', () => abrirModalExcluirEvento(idx));
        tdActions.appendChild(btnDel);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
}

function abrirModalExcluirEvento(index) {
    eventoSelecionadoIndex = index;
    document.getElementById('modalConfirmarEvento').classList.add('active');
}

function fecharModalEvento() {
    eventoSelecionadoIndex = null;
    document.getElementById('modalConfirmarEvento').classList.remove('active');
}

function deletarEventoConfirmado() {
    if (eventoSelecionadoIndex === null) return;
    dados.eventos.splice(eventoSelecionadoIndex, 1);
    eventoSelecionadoIndex = null;
    salvarDados();
    renderizarEventos();
    fecharModalEvento();
}

// Acordos

function novoAcordo() {
    acordoEmEdicao = {
        nome: '',
        periodos: [],
        regrasHorario: []
    };
    acordoEmEdicaoIndex = null;
    preencherModalAcordo();
    document.getElementById('modalAcordo').classList.add('active');
}

function editarAcordo(index) {
    const acordo = dados.acordos[index];
    if (!acordo) return;
    acordoEmEdicao = JSON.parse(JSON.stringify(acordo));
    acordoEmEdicaoIndex = index;
    preencherModalAcordo();
    document.getElementById('modalAcordo').classList.add('active');
}

function preencherModalAcordo() {
    document.getElementById('acordoNome').value = acordoEmEdicao.nome || '';
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

    renderizarListasAcordo();
}

function renderizarListasAcordo() {
    const tbodyPeriodos = document.getElementById('tabelaPeriodosAcordo');
    const tbodyRegras = document.getElementById('tabelaRegrasAcordo');
    tbodyPeriodos.innerHTML = '';
    tbodyRegras.innerHTML = '';

    (acordoEmEdicao.periodos || []).forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.inicio}</td>
            <td>${p.fim}</td>
            <td>${p.minutosExtras} min</td>
            <td>
                <button type="button" class="btn-error" onclick="removerPeriodoAcordo(¨D{idx})">🗑️</button>
            </td>
        `;
        tbodyPeriodos.appendChild(tr);
    });

    (acordoEmEdicao.regrasHorario || []).forEach((r, idx) => {
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
                <button type="button" class="btn-error" onclick="removerRegraHorario(¨D{idx})">🗑️</button>
            </td>
        `;
        tbodyRegras.appendChild(tr);
    });
}

function adicionarPeriodoAcordo() {
    const inicio = document.getElementById('periodoInicio').value;
    const fim = document.getElementById('periodoFim').value;
    const minutosExtras = Number(document.getElementById('periodoMinutosExtras').value || 0);

    if (!inicio || !fim) {
        alert('Informe início e fim do período.');
        return;
    }
    if (fim < inicio) {
        alert('Data fim não pode ser menor que a de início.');
        return;
    }

    acordoEmEdicao.periodos.push({ inicio, fim, minutosExtras });
    renderizarListasAcordo();

    document.getElementById('periodoInicio').value = '';
    document.getElementById('periodoFim').value = '';
    document.getElementById('periodoMinutosExtras').value = '';
}

function removerPeriodoAcordo(index) {
    acordoEmEdicao.periodos.splice(index, 1);
    renderizarListasAcordo();
}

function adicionarRegraHorario() {
    const inicio = document.getElementById('regraInicio').value;
    const fim = document.getElementById('regraFim').value;
    const minutosExtras = Number(document.getElementById('regraMinutosExtras').value || 0);
    const inicioExpediente = document.getElementById('regraInicioExpediente').value;
    const almocoMin = Number(document.getElementById('regraAlmoco').value || 60);
    const tolAlmoco = Number(document.getElementById('regraTolAlmoco').value || 5);
    const tolSaida = Number(document.getElementById('regraTolSaida').value || 5);
    const tipo = document.getElementById('regraTipo').value;
    const vale = Number(document.getElementById('regraVale').value || 0);

    if (!inicio || !fim) {
        alert('Informe início e fim da regra.');
        return;
    }
    if (fim < inicio) {
        alert('Data fim não pode ser menor que a de início.');
        return;
    }

    acordoEmEdicao.regrasHorario.push({
        inicio,
        fim,
        minutosExtras,
        inicioExpediente,
        almocoMin,
        tolAlmoco,
        tolSaida,
        tipo,
        vale
    });

    renderizarListasAcordo();

    document.getElementById('regraInicio').value = '';
    document.getElementById('regraFim').value = '';
    document.getElementById('regraMinutosExtras').value = '';
    document.getElementById('regraInicioExpediente').value = '';
    document.getElementById('regraTipo').value = '';
    document.getElementById('regraVale').value = '';
}

function removerRegraHorario(index) {
    acordoEmEdicao.regrasHorario.splice(index, 1);
    renderizarListasAcordo();
}

function salvarAcordo() {
    const nome = document.getElementById('acordoNome').value.trim();
    if (!nome) {
        alert('Informe o nome do acordo.');
        return;
    }
    if (!acordoEmEdicao.periodos.length) {
        alert('Inclua pelo menos um período.');
        return;
    }

    acordoEmEdicao.nome = nome;

    if (acordoEmEdicaoIndex == null) {
        dados.acordos.push(acordoEmEdicao);
    } else {
        dados.acordos[acordoEmEdicaoIndex] = acordoEmEdicao;
    }

    salvarDados();
    renderizarAcordos();
    atualizarSelectAcordosTimesheet();
    fecharModalAcordo();
}

function fecharModalAcordo() {
    document.getElementById('modalAcordo').classList.remove('active');
    acordoEmEdicao = null;
    acordoEmEdicaoIndex = null;
}

function renderizarAcordos() {
    const container = document.getElementById('listaAcordos');
    container.innerHTML = '';

    if (!dados.acordos.length) {
        const p = document.createElement('p');
        p.className = 'small-text';
        p.textContent = 'Nenhum acordo cadastrado ainda.';
        container.appendChild(p);
        return;
    }

    dados.acordos.forEach((a, idx) => {
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
            li.textContent =
                `${r.inicio} a ${r.fim} - 8h + ${r.minutosExtras} min, ` +
                `almoço ${r.almocoMin} min, tolerância almoço ${r.tolAlmoco} min, ` +
                `tolerância saída ${r.tolSaida} min, vale R$ ${Number(r.vale || 0).toFixed(2)}`;
            ul2.appendChild(li);
        });
        div.appendChild(ul2);

        const btnRow = document.createElement('div');
        btnRow.className = 'form-row';
        const btnEditar = document.createElement('button');
        btnEditar.type = 'button';
        btnEditar.className = 'btn-secondary';
        btnEditar.textContent = 'Editar';
        btnEditar.onclick = () => editarAcordo(idx);
        btnRow.appendChild(btnEditar);

        div.appendChild(btnRow);
        container.appendChild(div);
    });
}

// Exportar/Importar CSV/PDF/JSON (mesmo que antes)

function baixarCSV(linhas, nomeArquivo) {
    const csv = linhas
        .map(cols => cols.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
}

function abrirJanelaImpressao(html, titulo) {
    const win = window.open('', '_blank');
    win.document.write('<html><head><title>' + (titulo || '') + '</title>');
    win.document.write('<link rel="stylesheet" href="styles.css">');
    win.document.write('</head><body>');
    win.document.write('<div class="container">');
    win.document.write(html);
    win.document.write('</div>');
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    win.print();
}

function exportarRegistrosCSV() {
    if (!dados.registros.length) {
        alert('Não há registros para exportar.');
        return;
    }

    const linhas = [];
    linhas.push(['Data', 'Entrada', 'SaídaAlmoço', 'RetornoAlmoço', 'Saída', 'Observações']);

    dados.registros
        .slice()
        .sort((a, b) => a.data.localeCompare(b.data))
        .forEach(r => {
            linhas.push([
                r.data,
                r.entrada || '',
                r.saidaAlmoco || '',
                r.retornoAlmoco || '',
                r.saida || '',
                r.observacoes || ''
            ]);
        });

    baixarCSV(linhas, 'registros_ponto.csv');
}

function importarRegistrosCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        const texto = e.target.result;
        const linhas = texto.split(/\r?\n/).filter(l => l.trim());
        if (!linhas.length) {
            alert('Arquivo vazio.');
            return;
        }

        const primeira = linhas[0].toLowerCase();
        const temCabecalho = primeira.includes('data') && primeira.includes('entrada');
        const inicio = temCabecalho ? 1 : 0;

        let importados = 0;

        for (let i = inicio; i < linhas.length; i++) {
            const linha = linhas[i];
            if (!linha.trim()) continue;

            const cols = linha.split(/;|,/).map(c =>
                c.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
            );

            const [dataBruta, entrada, saidaAlmoco, retornoAlmoco, saida, observacoes] = cols;
            if (!dataBruta) continue;

            const data = normalizarDataImportacao(dataBruta);

            const reg = {
                data,
                entrada: entrada || '',
                saidaAlmoco: saidaAlmoco || '',
                retornoAlmoco: retornoAlmoco || '',
                saida: saida || '',
                observacoes: observacoes || ''
            };

            const idx = dados.registros.findIndex(r => r.data === data);
            if (idx >= 0) dados.registros[idx] = reg;
            else dados.registros.push(reg);

            importados++;
        }

        if (!importados) {
            alert('Nenhuma linha válida encontrada no arquivo.');
        } else {
            salvarDados();
            atualizarDashboard();
            renderizarTabelaRegistros();
            alert(`${importados} registros importados com sucesso.`);
        }

        event.target.value = '';
    };

    reader.readAsText(file, 'utf-8');
}

function exportarRegistrosPDF() {
    const secao = document.getElementById('ponto-registros');
    if (!secao) {
        alert('Seção de registros não encontrada.');
        return;
    }
    abrirJanelaImpressao(secao.innerHTML, 'Registros de Ponto');
}

function exportarTimesheetCSV() {
    const content = document.getElementById('timesheetContent');
    const tables = content ? content.querySelectorAll('table.timesheet-table') : [];
    if (!tables.length) {
        alert('Gere o timesheet antes de exportar.');
        return;
    }

    const linhas = [];

    tables.forEach(table => {
        const header = table.previousElementSibling;
        const tituloMes = header && header.classList.contains('timesheet-header')
            ? header.textContent.trim()
            : '';

        if (tituloMes) {
            linhas.push([tituloMes]);
        }

        const trs = table.querySelectorAll('tr');
        trs.forEach(tr => {
            const cols = Array.from(tr.children).map(td =>
                td.innerText.replace(/\s+/g, ' ').trim()
            );
            linhas.push(cols);
        });

        linhas.push([]);
    });

    baixarCSV(linhas, 'timesheet_ponto.csv');
}

function exportarTimesheetPDF() {
    const secao = document.getElementById('ponto-timesheet');
    if (!secao) {
        alert('Seção de timesheet não encontrada.');
        return;
    }
    const temTabela = secao.querySelector('table.timesheet-table');
    if (!temTabela) {
        alert('Gere o timesheet antes de exportar.');
        return;
    }
    abrirJanelaImpressao(secao.innerHTML, 'Timesheet de Ponto');
}

function exportarDados() {
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'controle_ponto_backup.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importarDados(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const json = JSON.parse(e.target.result);
            if (!json.registros || !json.configuracoes || !json.eventos || !json.acordos) {
                alert('Arquivo inválido.');
                return;
            }
            dados = json;
            salvarDados();
            carregarConfiguracoes();
            atualizarDashboard();
            renderizarTabelaRegistros();
            renderizarEventos();
            renderizarAcordos();
            atualizarSelectAcordosTimesheet();
            alert('Dados importados com sucesso.');
        } catch (err) {
            alert('Erro ao importar arquivo: ' + err.message);
        }
    };
    reader.readAsText(file, 'utf-8');
}

// Alerts

function mostrarAlert(elementId, mensagem, tipo) {
    const area = document.getElementById(elementId);
    if (!area) return;
    area.innerHTML = '';
    const div = document.createElement('div');
    div.className = `alert alert-${tipo === 'success' ? 'success' : 'error'}`;
    div.textContent = mensagem;
    area.appendChild(div);
}
