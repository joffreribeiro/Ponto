// Gera um ID único simples (timestamp + random)
function gerarIdUnico() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

// Converte data de DD/MM/AAAA para YYYY-MM-DD
function parseDateBR(dataBR) {
    if (!dataBR) return null;
    const partes = dataBR.split('/');
    if (partes.length !== 3) return null;
    const [dia, mes, ano] = partes;
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

// ============= ATUALIZAÇÃO DE COMPONENTES =============

/**
 * Limpa períodos duplicados/antigos mantendo apenas os válidos
 * Mantém apenas períodos com índice sequencial (1-4) e sem saltos
 * Períodos futuros serão gerados automaticamente por gerarProximoPeriodoSeNecessario()
 */
function limparPeriodosInvalidos() {
    try {
        if (!AppState.dados?.periodosAquisitivos) return;
        
        const hoje = new Date();
        const periodosValidos = [];
        
        console.log(`[limparPeriodosInvalidos] Total de períodos antes: ${AppState.dados.periodosAquisitivos.length}`);
        
        // Agrupar períodos por periodoIndex
        const porIndex = {};
        for (const p of AppState.dados.periodosAquisitivos) {
            const idx = p.periodoIndex || 0;
            if (!porIndex[idx]) porIndex[idx] = [];
            porIndex[idx].push(p);
        }
        
        console.log(`[limparPeriodosInvalidos] Índices únicos encontrados:`, Object.keys(porIndex).sort((a, b) => a - b));
        
        // Manter apenas o período mais recente de cada índice
        // E manter apenas índices 1-4 (períodos iniciais reais)
        // Períodos futuros (5+) serão gerados automaticamente conforme necessário
        for (const [idxStr, periodos] of Object.entries(porIndex)) {
            const idx = parseInt(idxStr);
            
            // Manter apenas índices 1-4 (os períodos iniciais reais)
            // Índices 5+ são provavelmente gerados por bug e serão recriados automaticamente
            if (idx > 4) {
                console.log(`[limparPeriodosInvalidos] Descartando períodos com índice ${idx} (mantém apenas 1-4)`);
                continue;
            }
            
            // Se houver múltiplos períodos com mesmo índice, manter o mais recente
            if (periodos.length > 1) {
                console.log(`[limparPeriodosInvalidos] Índice ${idx} tem ${periodos.length} períodos - mantendo apenas 1`);
                periodos.sort((a, b) => {
                    const dtA = a.termino ? DateUtils.parse(a.termino) : new Date(0);
                    const dtB = b.termino ? DateUtils.parse(b.termino) : new Date(0);
                    return dtB - dtA;
                });
            }
            
            periodosValidos.push(periodos[0]);
        }
        
        // Ordenar por índice
        periodosValidos.sort((a, b) => a.periodoIndex - b.periodoIndex);
        
        console.log(`[limparPeriodosInvalidos] Total após limpeza: ${periodosValidos.length}`);
        console.log(`[limparPeriodosInvalidos] Períodos mantidos:`, periodosValidos.map(p => `Idx${p.periodoIndex}(${p.inicio}→${p.termino})`).join(', '));
        
        AppState.dados.periodosAquisitivos = periodosValidos;
        AppState.save();
        
        return periodosValidos.length;
        
    } catch (error) {
        console.error('[limparPeriodosInvalidos] Erro:', error);
        return 0;
    }
}

/**
 * Atualiza apenas a tabela de férias (períodos aquisitivos)
 * Recarrega dados do localStorage e renderiza sem recarregar página
 */
function atualizarTabelaFerias() {
    try {
        console.log('[atualizarTabelaFerias] Iniciando...');
        console.log('[atualizarTabelaFerias] AppState antes:', AppState.dados?.periodosAquisitivos?.length || 0);
        
        // 1. Garantir que a aba de férias está visível
        const feriaTab = document.getElementById('ponto-ferias');
        if (feriaTab) {
            feriaTab.style.display = 'block';
            console.log('[atualizarTabelaFerias] Aba de férias exibida');
        }
        
        // 2. Recarregar dados do localStorage (sem resetar a tudo padrão)
        AppState.init();
        
        // 3. Limpar períodos inválidos/duplicados se houver muitos
        const periodosBefore = AppState.dados?.periodosAquisitivos?.length || 0;
        let periodosAfter = periodosBefore;
        
        if (periodosBefore > 10) {
            console.log(`[atualizarTabelaFerias] Detectados ${periodosBefore} períodos - limpando duplicatas...`);
            periodosAfter = limparPeriodosInvalidos() || periodosAfter;
            
            // Recarregar AppState após limpeza
            AppState.init();
        }
        
        console.log('[atualizarTabelaFerias] AppState depois de limpeza:', AppState.dados?.periodosAquisitivos?.length || 0);
        console.log('[atualizarTabelaFerias] Dados localStorage após processamento:', JSON.stringify({
            periodosCount: AppState.dados?.periodosAquisitivos?.length || 0,
            periodos: AppState.dados?.periodosAquisitivos?.map(p => ({
                index: p.periodoIndex,
                inicio: p.inicio,
                termino: p.termino
            })) || []
        }));
        
        // 4. Renderizar tabela
        if (typeof renderizarPeriodosAquisitivosTable === 'function') {
            console.log('[atualizarTabelaFerias] Chamando renderizarPeriodosAquisitivosTable()');
            renderizarPeriodosAquisitivosTable();
            console.log('[atualizarTabelaFerias] Tabela renderizada com sucesso');
        } else {
            console.error('[atualizarTabelaFerias] Função renderizarPeriodosAquisitivosTable não encontrada!');
        }
        
        // 5. Feedback ao usuário com contagem correta
        const periodos = AppState.dados?.periodosAquisitivos?.length || 0;
        console.log(`[atualizarTabelaFerias] Finalizando. Total final: ${periodos} períodos`);
        
        if (periodosBefore !== periodos) {
            console.log(`[atualizarTabelaFerias] Limpeza executada: ${periodosBefore} → ${periodos} períodos`);
        }
        
        if (typeof Notifications !== 'undefined' && Notifications.success) {
            Notifications.success(`✅ Tabela de férias atualizada! (${periodos} períodos)`);
        } else {
            alert(`Tabela de férias atualizada! (${periodos} períodos)`);
        }
    } catch (error) {
        console.error('[atualizarTabelaFerias] Erro:', error);
        console.error('[atualizarTabelaFerias] Stack:', error.stack);
        if (typeof Notifications !== 'undefined' && Notifications.error) {
            Notifications.error('Erro ao atualizar: ' + error.message);
        } else {
            alert('Erro ao atualizar: ' + error.message);
        }
    }
}

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
    // Filtros do dashboard
    dashboardFilters: {
        acordoIndex: null,
        periodo: 'todos',
        dataInicio: null,
        dataFim: null
    },

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
        // Sempre salvar os dados - a validação de configurações não deve bloquear
        // a persistência de outras informações (eventos, períodos, etc.)
        try {
            return Storage.save(this.dados);
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
            return false;
        }
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
        ensureTiposEventoDefault();
        configurarAbas();
        configurarSubAbas();
        configurarModalAcordo();
        configurarModalEvento();
        popularFiltroAcordosDashboard();
        configurarFiltrosDashboard();
        atualizarDashboard();
        renderizarTabelaRegistros();
        renderizarEventos();
        renderizarAcordos();
        atualizarSelectAcordosTimesheet();
        // Gerar timesheet automaticamente quando o select for alterado
        try {
            const sel = document.getElementById('acordoTimesheet');
            if (sel && !sel._autoTimesheetAttached) {
                sel.addEventListener('change', () => {
                    try { gerarTimesheetAcordo(); } catch(e){ console.error('Erro ao gerar timesheet on change:', e); }
                });
                sel._autoTimesheetAttached = true;
            }
        } catch(e){ console.warn('Não foi possível anexar listener ao select acordoTimesheet:', e); }
        atualizarSelectAcordosRegistros();
        atualizarSelectAcordosEventos();
        atualizarSelectAcordosFerias();
        // Inicializar módulo de Atividades
        ensureAtividadesDefault();
        renderizarAtividades();
        
        // fallback: garantir botão 'Nova Atividade' ligado mesmo que onclick inline falhe
            try {
                let btnNew = document.querySelector('button[onclick="abrirModalAtividade()"]');
                if (!btnNew) {
                    btnNew = document.querySelector('#atividades button.btn-primary');
                }
                if (!btnNew) {
                    const candidates = Array.from(document.querySelectorAll('button.btn-primary'));
                    btnNew = candidates.find(b => (b.dataset && b.dataset.action === 'abrirModalAtividade') || (b.textContent || '').toLowerCase().includes('nova atividade') || (b.textContent || '').includes('➕'));
                }
                if (btnNew && !btnNew._atividadeListenerAttached) {
                    console.debug('Anexando listener fallback ao botão Nova Atividade', btnNew);
                    // Se o botão estiver marcado para comportamento inline ou já chama abrirAbaNovaAtividade(),
                    // anexar listener que abre o painel inline em vez do modal.
                    const onclickAttr = (btnNew.getAttribute && btnNew.getAttribute('onclick')) || '';
                    if (btnNew.hasAttribute && btnNew.hasAttribute('data-no-fallback')) {
                        btnNew.addEventListener('click', (e) => { try { abrirAbaNovaAtividade(); } catch(err){ console.error('Erro ao abrir painel inline (fallback):', err); } });
                    } else if (onclickAttr.includes('abrirAbaNovaAtividade')) {
                        btnNew.addEventListener('click', (e) => { try { abrirAbaNovaAtividade(); } catch(err){ console.error('Erro ao abrir painel inline (fallback):', err); } });
                    } else {
                        btnNew.addEventListener('click', (e) => { try { abrirModalAtividade(); } catch(err){ console.error('Erro ao abrir modal atividade (fallback):', err); } });
                    }
                    btnNew._atividadeListenerAttached = true;
                }
            // adicional: listener global para diagnosticar cliques e forçar abertura caso o botão não responda
            if (!document._atividadeGlobalClickAttached) {
                    document.addEventListener('click', function(ev){
                    try {
                        const t = ev.target;
                        const btn = t.closest && t.closest('button');
                        // Se o botão estiver marcado para comportamento inline, pular o fallback global
                        if (btn && btn.hasAttribute && btn.hasAttribute('data-no-fallback')) return;
                        if (!btn) return;
                        const insideAtividades = !!btn.closest('#atividades');
                        const callsAbrir = (btn.getAttribute && btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('abrirModalAtividade')) || ((btn.textContent||'').toLowerCase().includes('nova atividade')) || btn.classList.contains('btn-primary') && insideAtividades;
                                if (callsAbrir) {
                                    console.debug('Clique detectado no botão de nova atividade (global):', btn);
                                    try {
                                        // Inspecionar nós vizinhos e conteúdo relevante para diagnosticar o "número ao lado do hidden"
                                        const prev = btn.previousSibling && btn.previousSibling.textContent ? btn.previousSibling.textContent.trim() : null;
                                        const next = btn.nextSibling && btn.nextSibling.textContent ? btn.nextSibling.textContent.trim() : null;
                                        const parentText = btn.parentElement ? (btn.parentElement.textContent || '').trim().slice(0,200) : null;
                                        console.debug('Botão vizinhos -> previousSibling:', prev, ' nextSibling:', next);
                                        console.debug('Botão parent (first 200 chars):', parentText);
                                        console.debug('Registros antes abrirModalAtividade:', (AppState.dados && AppState.dados.registros) ? AppState.dados.registros.length : 0);
                                        abrirModalAtividade();
                                        console.debug('Registros depois abrirModalAtividade:', (AppState.dados && AppState.dados.registros) ? AppState.dados.registros.length : 0);
                                        // também logar o estado resumido de atividades
                                        console.debug('Atividades total:', (AppState.dados && AppState.dados.atividades) ? AppState.dados.atividades.length : 0);
                                    } catch(err) { console.error('Erro ao abrir modal via listener global:', err); }
                                }
                    } catch(e){ /* ignore */ }
                }, true);
                document._atividadeGlobalClickAttached = true;
            }
        } catch (e) { console.error('Erro ao anexar listener Nova Atividade:', e); }
        
        // Listeners para data-action buttons (exportar/importar atividades)
        try {
            document.addEventListener('click', function(ev) {
                const btn = ev.target.closest && ev.target.closest('button[data-action]');
                if (!btn) return;
                
                const action = btn.getAttribute('data-action');
                
                    const actions = {
                    'abrirModalAtividade': abrirModalAtividade,
                    'exportarAtividadesExcel': exportarAtividadesExcelAction,
                    'importarAtividadesExcel': importarAtividadesExcelAction,
                    'toggleAtividadesKanban': toggleAtividadesKanban,
                    'toggleAtividadesTable': toggleAtividadesTable,
                    'abrirAbaNovaAtividade': abrirAbaNovaAtividade,
                    'fecharAbaNovaAtividade': fecharAbaNovaAtividade,
                        // wrap theme toggle to avoid ReferenceError if global not defined yet
                        'toggleTheme': function() {
                            try {
                                if (window.App && window.App.actions && typeof window.App.actions.toggleTheme === 'function') return window.App.actions.toggleTheme();
                                if (typeof window['toggleTheme'] === 'function') return window['toggleTheme']();
                            } catch (e) { console.error('Erro ao executar toggleTheme wrapper', e); }
                        }
                };
                
                if (typeof actions[action] === 'function') {
                    try {
                        actions[action]();
                        ev.preventDefault();
                        ev.stopPropagation();
                    } catch (err) {
                        console.error(`Erro ao executar ação ${action}:`, err);
                    }
                }
            });
        } catch (e) { console.error('Erro ao anexar listener de data-action:', e); }
        
        // Botão rápido no dashboard para abrir aba Férias
        try {
            const btnFerias = document.getElementById('btnSolicitarFeriasDashboard');
            if (btnFerias && !btnFerias._listenerAttached) {
                btnFerias.addEventListener('click', abrirAbaFeriasFromDashboard);
                btnFerias._listenerAttached = true;
            }
        } catch(e){ console.warn('Não foi possível anexar listener ao botão Solicitar Férias (dashboard):', e); }
        // Botões relacionados à geração de períodos aquisitivos na subaba Férias
        try {
            const btnGerar = document.getElementById('btnGerarPeriodosAdmissao');
            const btnLimpar = document.getElementById('btnLimparPeriodosAdmissao');
            const inputAdmissao = document.getElementById('dataAdmissao');
            // popular valor salvo da data de admissão e desabilitar se já salvo
            try {
                if (inputAdmissao && AppState.dados && AppState.dados.admissao) {
                    // armazenamos como ISO (YYYY-MM-DD)
                    inputAdmissao.value = dateIsoToBr(AppState.dados.admissao || '');
                    // desabilitar edição se já existe data salva
                    inputAdmissao.disabled = true;
                    // esconder botão salvar
                    const btnSalvar = document.getElementById('btnSalvarAdmissao');
                    if (btnSalvar) btnSalvar.style.display = 'none';
                }
            } catch(e) { /* ignore */ }
            if (btnGerar && !btnGerar._listenerAttached) {
                btnGerar.addEventListener('click', () => {
                    try { gerarPeriodosAquisitivosFromAdmissao(); } catch(e){ console.error('Erro gerar períodos:', e); }
                });
                btnGerar._listenerAttached = true;
            }
            if (btnLimpar && !btnLimpar._listenerAttached) {
                btnLimpar.addEventListener('click', () => {
                    const tb = document.getElementById('tablePeriodosAquisitivos');
                    if (tb && tb.tBodies && tb.tBodies[0]) tb.tBodies[0].innerHTML = '';
                    if (inputAdmissao) {
                        inputAdmissao.value = '';
                        // Reabilitar edição do campo
                        inputAdmissao.disabled = false;
                    }
                    // Mostrar botão salvar novamente
                    const btnSalvar = document.getElementById('btnSalvarAdmissao');
                    if (btnSalvar) btnSalvar.style.display = '';
                    try {
                        if (AppState.dados) {
                            if (Array.isArray(AppState.dados.periodosAquisitivos)) {
                                AppState.dados.periodosAquisitivos = [];
                            }
                            // também remover data de admissão salva
                            if (typeof AppState.dados.admissao !== 'undefined') AppState.dados.admissao = '';
                            AppState.save();
                        }
                    } catch(e) { console.warn('Erro ao limpar períodos salvos:', e); }
                });
                btnLimpar._listenerAttached = true;
            }
            if (inputAdmissao && !inputAdmissao._listenerAttached) {
                // Não salvar automaticamente ao alterar; usar botão 'Salvar'
                inputAdmissao._listenerAttached = true;
            }

            // botão Salvar ao lado do input de admissão
            try {
                const btnSalvarAdmissao = document.getElementById('btnSalvarAdmissao');
                if (btnSalvarAdmissao && !btnSalvarAdmissao._listenerAttached) {
                    btnSalvarAdmissao.addEventListener('click', () => {
                        try {
                            const val = inputAdmissao ? (inputAdmissao.value || '') : '';
                            if (!AppState.dados) AppState.dados = {};
                            if (val) {
                                const parsed = DateUtils.parse(val);
                                AppState.dados.admissao = parsed ? DateUtils.getIsoDate(parsed) : val;
                            } else {
                                AppState.dados.admissao = '';
                            }
                            AppState.save();
                            // Desabilitar campo e esconder botão após salvar
                            if (inputAdmissao) inputAdmissao.disabled = true;
                            btnSalvarAdmissao.style.display = 'none';
                            mostrarAlertaGlobal('Data de admissão salva.', 'success');
                        } catch (e) {
                            console.warn('Erro ao salvar data de admissão via botão:', e);
                            mostrarAlertaGlobal('Erro ao salvar data de admissão.', 'error');
                        }
                    });
                    btnSalvarAdmissao._listenerAttached = true;
                }
            } catch(e) { console.warn('Não foi possível anexar listener ao botão Salvar Admissão:', e); }
            
            // Renderizar tabela de períodos aquisitivos salvos
            try {
                renderizarPeriodosAquisitivosTable();
                // Verificar e gerar automaticamente o próximo período se o atual expirou
                gerarProximoPeriodoSeNecessario();
            } catch(e) { console.warn('Erro ao renderizar períodos aquisitivos:', e); }
        } catch(e){ console.warn('Não foi possível anexar listeners aos controles de períodos aquisitivos:', e); }
        atualizarSelectTiposEventos();
        const filtroEventos = document.getElementById('filtroAcordoEventos');
        if (filtroEventos) filtroEventos.addEventListener('change', renderizarEventos);
        const filtroRegistros = document.getElementById('filtroAcordoRegistros');
        if (filtroRegistros) filtroRegistros.addEventListener('change', renderizarTabelaRegistros);
        // iniciar verificação de lembretes a cada 30 minutos
        try {
            checkAtividadesDeadlines();
            setInterval(checkAtividadesDeadlines, 30 * 60 * 1000);
        } catch (e) { /* ignore */ }

        // Delegação central para ações declaradas via data-action e scroll-to
        try {
            const handleAction = (el) => {
                const action = el.dataset && el.dataset.action;
                if (!action) return;
                const id = el.dataset.id;
                try {
                    if (window.App && typeof window.App.handleAction === 'function') {
                        window.App.handleAction(action, id);
                        return;
                    }
                    // fallback to legacy behavior
                    if (typeof window[action] === 'function') {
                        if (typeof id !== 'undefined' && id !== null && id !== '') window[action](id);
                        else window[action]();
                    } else {
                        console.warn('Ação não encontrada:', action);
                    }
                } catch (err) { console.error('Erro ao executar ação delegada', action, err); }
            };

            const handleScrollTo = (el) => {
                const targetId = el.dataset && el.dataset.scrollTo;
                if (!targetId) return;
                const target = document.getElementById(targetId);
                if (target) target.scrollIntoView();
            };

            if (window.Utils && Utils.delegate) {
                Utils.delegate(document, '[data-action]', 'click', (e, el) => { try { handleAction(el); } catch(err){console.error(err);} });
                Utils.delegate(document, '[data-scroll-to]', 'click', (e, el) => { e.preventDefault(); try { handleScrollTo(el); } catch(err){console.error(err);} });
            } else {
                document.addEventListener('click', function(e){
                    const el = e.target.closest && e.target.closest('[data-action]');
                    if (el) { e.preventDefault(); handleAction(el); return; }
                    const el2 = e.target.closest && e.target.closest('[data-scroll-to]');
                    if (el2) { e.preventDefault(); handleScrollTo(el2); }
                });
            }
        } catch (e) { console.error('Erro ao configurar delegação de ações:', e); }
        console.log('Aplicação inicializada com sucesso');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        mostrarAlertaGlobal('Erro ao inicializar. Verifique o console.', 'error');
    }
}

/**
 * Garante que `AppState.dados.tiposEvento` contenha os tipos padrão,
 * incluindo `evento_registro` usado para eventos criados a partir de registros.
 */
function ensureTiposEventoDefault() {
    if (!AppState.dados) AppState.dados = {};
    if (!Array.isArray(AppState.dados.tiposEvento)) AppState.dados.tiposEvento = [];

    const defaults = [
        { id: 'feriado', nome: 'Feriado', cor: '#dc2626' },
        { id: 'ferias', nome: 'Férias', cor: '#d97706' },
        { id: 'afastamento', nome: 'Afastamento', cor: '#0891b2' },
        { id: 'viagem', nome: 'Viagem', cor: '#7c3aed' },
        { id: 'abono_acordo', nome: 'Abono (acordo)', cor: '#059669' },
        { id: 'abono', nome: 'Abono', cor: '#10b981' },
        { id: 'compensar_acordo', nome: 'Pagar Hora (acordo)', cor: '#db2777' },
        { id: 'pagar_hora', nome: 'Pagar Hora', cor: '#f59e0b' },
        { id: 'outro', nome: 'Outro', cor: '#64748b' },
        { id: 'evento_registro', nome: 'Registro (ponto)', cor: '#06b6d4', corTexto: '#ffffff' }
    ];

    // Inserir qualquer tipo default que esteja faltando
    defaults.forEach(d => {
        if (!AppState.dados.tiposEvento.some(t => t.id === d.id)) {
            AppState.dados.tiposEvento.push(d);
        }
    });

    // Atualizar nomes dos tipos existentes com os defaults (para sincronizar mudanças)
    AppState.dados.tiposEvento.forEach(t => {
        const defaultTipo = defaults.find(d => d.id === t.id);
        if (defaultTipo && t.nome !== defaultTipo.nome) {
            t.nome = defaultTipo.nome;
        }
    });

    // Salvar se foi modificado
    AppState.save();
}

function ensureAtividadesDefault() {
    if (!AppState.dados) AppState.dados = {};
    if (!Array.isArray(AppState.dados.atividades)) AppState.dados.atividades = [];
    if (typeof AppState.dados.atividadesKanbanView === 'undefined') AppState.dados.atividadesKanbanView = false;
    if (!Array.isArray(AppState.dados.atividadesReminders)) AppState.dados.atividadesReminders = [];
    AppState.save();
}

// Calcula quantos dias faltam de hoje até a data do prazo (ex: prazo - hoje)
function calcularDiasAtePrazo(prazoIso) {
    if (!prazoIso) return 0;
    try {
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const prazo = new Date(prazoIso);
        prazo.setHours(0,0,0,0);
        const diffMs = prazo.getTime() - hoje.getTime();
        const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        // retornar valor assinado: negativo = vencido, 0 = vence hoje, positivo = dias restantes
        return dias;
    } catch (e) {
        return 0;
    }
}

function gerarProximoOrdem() {
    const list = AppState.dados && Array.isArray(AppState.dados.atividades) ? AppState.dados.atividades : [];
    let max = 0;
    list.forEach(a => {
        const v = Number(a.ordem);
        if (!isNaN(v) && v > max) max = v;
    });
    return String(max + 1);
}

// Atualiza o campo Dias ao alterar o Prazo (liga por onchange nos inputs)
function atualizarDiasFromPrazo(prazoInputId, diasInputId) {
    try {
        const prazoEl = document.getElementById(prazoInputId);
        const diasEl = document.getElementById(diasInputId);
        if (!prazoEl || !diasEl) return;
        const prazoVal = prazoEl.value || null;
        const dias = calcularDiasAtePrazo(prazoVal);
        diasEl.value = dias;
    } catch (e) { /* ignore */ }
}

// expor para uso inline/onchange direto no HTML
window.atualizarDiasFromPrazo = atualizarDiasFromPrazo;

// ============= ATIVIDADES (CRUD mínimo) =============

function renderizarAtividades() {
    const container = document.getElementById('atividadesLista');
    if (!container) return;
    try { console.debug('renderizarAtividades: AppState.dados.atividades length =', (AppState.dados && Array.isArray(AppState.dados.atividades)) ? AppState.dados.atividades.length : 'no-data'); } catch(e){}
    // Acessos defensivos: aceitar os IDs antigos (filtroAtividades*) ou os novos topFiltro*
    const statusEl = document.getElementById('filtroAtividadesStatus') || document.getElementById('topFiltroStatusCol');
    const statusFiltro = statusEl ? (statusEl.value || '') : '';

    const buscaEl = document.getElementById('filtroAtividadesBusca') || document.getElementById('topFiltroBusca');
    const busca = buscaEl ? ((buscaEl.value || '').toLowerCase()) : '';

    const prioridadeEl = document.getElementById('filtroAtividadesPrioridade') || document.getElementById('topFiltroPrioridade');
    const prioridadeFiltro = prioridadeEl ? (prioridadeEl.value || '') : '';

    const responsavelEl = document.getElementById('filtroAtividadesResponsavel') || document.getElementById('topFiltroResponsavel');
    const responsavelFiltro = responsavelEl ? ((responsavelEl.value || '').toLowerCase()) : '';

    const ordenarEl = document.getElementById('filtroAtividadesOrdenar') || document.getElementById('topFiltroOrdem');
    const ordenarPor = ordenarEl ? (ordenarEl.value || 'prioridade') : 'prioridade';
    const kanbanVisible = !!AppState.atividadesKanbanView;

    const items = (AppState.dados.atividades || []).filter(a => {
        if (statusFiltro && a.status !== statusFiltro) return false;
        if (busca && !(String(a.titulo || '').toLowerCase().includes(busca) || String(a.descricao || '').toLowerCase().includes(busca))) return false;
        return true;
    });

    if (!items.length) {
        try { console.debug('renderizarAtividades: filtro resultou em 0 items. statusFiltro=', statusFiltro, 'busca=', busca); } catch(e){}
        container.innerHTML = '<div class="card">Nenhuma atividade encontrada.</div>';
        const kanb = document.getElementById('atividadesKanban'); if (kanb) kanb.innerHTML = '';
        return;
    }

    // ordenar
    items.sort((x,y) => {
        if (ordenarPor === 'prioridade') {
            const order = { 'critica': 3, 'alta':2, 'media':1, 'baixa':0 };
            return (order[y.prioridade]||0) - (order[x.prioridade]||0);
        }
        if (ordenarPor === 'prazo') {
            const dx = x.prazo ? new Date(x.prazo).getTime() : Infinity;
            const dy = y.prazo ? new Date(y.prazo).getTime() : Infinity;
            return dx - dy;
        }
        if (ordenarPor === 'criadoEm') {
            return new Date(y.criadoEm).getTime() - new Date(x.criadoEm).getTime();
        }
        return 0;
    });

    const rows = items.map((a, idx) => {
        const prazo = a.prazo ? DateUtils.formatBR(a.prazo) : '';
        const rawDias = typeof a.dias !== 'undefined' ? a.dias : (a.atividadeDias || '');
        const diasNum = (rawDias === '' || rawDias === null) ? null : Number(rawDias);
        let diasBadge = '';
        if (diasNum !== null) {
            if (diasNum < 0) {
                diasBadge = `<span class="badge badge--overdue">Vencido ${Math.abs(diasNum)}</span>`;
            } else if (diasNum === 0) {
                diasBadge = `<span class="badge badge--due">Vence hoje</span>`;
            } else if (diasNum <= 3) {
                diasBadge = `<span class="badge badge--due">${diasNum}d</span>`;
            } else {
                diasBadge = `<span class="badge badge--ok">${diasNum}d</span>`;
            }
        }
        const ordemBadge = a.ordem ? `<span class="badge badge--order">${escapeHtml(a.ordem)}</span>` : '';
        const dueClass = (diasNum !== null && diasNum <= 3 && diasNum >= 0) ? 'due-soon' : '';
        return `
            <div class="atividade-item activity-card ${dueClass}" data-idx="${idx}">
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        ${ordemBadge}
                        <strong>${escapeHtml(a.titulo)}</strong>
                    </div>
                    <div class="small-text">${escapeHtml(a.descricao || '')}</div>
                    <div class="meta small-text">Responsável: ${escapeHtml(a.responsavel || '')} • Prioridade: ${getPriorityBadge(a.prioridade)} • Prazo: ${prazo} ${diasBadge}</div>
                </div>
                <div class="actions" style="text-align:right; min-width:160px;">
                    <div style="margin-bottom:6px;">Status: <strong>${escapeHtml(a.status || '')}</strong></div>
                    <div style="margin-bottom:6px;">Progresso: ${Number(a.progresso || 0)}%</div>
                    <div>
                        <button class="btn-secondary btn-icon" onclick="editarAtividade(${a.id ? `'${a.id}'` : idx})">${svgIcon('edit', { title: 'Editar atividade', color: 'currentColor' })}</button>
                        <button class="btn-secondary btn-icon" onclick="removerAtividade(${a.id ? `'${a.id}'` : idx})">${svgIcon('trash', { title: 'Remover atividade', color: 'currentColor' })}</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = rows;

    // render kanban if view enabled
    const kanban = document.getElementById('atividadesKanban');
    if (!kanban) return;
    if (kanbanVisible) {
        document.getElementById('atividadesLista').style.display = 'none';
        kanban.style.display = 'block';
        renderizarKanban(items);
    } else {
        document.getElementById('atividadesLista').style.display = 'block';
        kanban.style.display = 'none';
        kanban.innerHTML = '';
    }

    // sempre atualizar tabela se visível
    const tabelaContainer = document.getElementById('atividadesTableContainer');
    if (tabelaContainer && tabelaContainer.style.display !== 'none') {
        renderizarTabelaAtividades(AppState.dados.atividades || []);
    }
}

// Icons and badges moved to `icons.js` (exposed as `Icons.svgIcon` / `svgIcon` and `Icons.getPriorityBadge` / `getPriorityBadge`)

function renderizarTabelaAtividades(items) {
    try { console.debug('renderizarTabelaAtividades: items length =', Array.isArray(items)? items.length : typeof items); } catch(e){}
    if (window.AtividadesTabela && typeof AtividadesTabela.renderizarTabelaAtividades === 'function') {
        try { return AtividadesTabela.renderizarTabelaAtividades(items); } catch(e){ console.error('AtividadesTabela.renderizarTabelaAtividades error', e); }
    }
    // fallback mínimo: limpa o tbody
    const tbody = document.querySelector('#tabelaAtividades tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
}

function renderizarKanban(items) {
    if (window.AtividadesKanban && typeof AtividadesKanban.renderizarKanban === 'function') {
        return AtividadesKanban.renderizarKanban(items);
    }
    // fallback mínimo: limpa container
    const kanban = document.getElementById('atividadesKanban');
    if (!kanban) return;
    kanban.innerHTML = '';
}

function moveAtividadeToStatus(id, status) {
    const list = AppState.dados.atividades || [];
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) {
        list[idx].status = status;
        // Se status for 'concluida', marcar como finalizado
        if (status === 'concluida') {
            list[idx].finalizado = true;
        } else {
            list[idx].finalizado = false;
        }
        list[idx].atualizadoEm = new Date().toISOString();
        AppState.dados.atividades = list;
        AppState.save();
        renderizarAtividades();
        if (typeof renderizarTabelaAtividades === 'function') {
            renderizarTabelaAtividades(AppState.dados.atividades || []);
        }
    }
}

// Abre o novo modal de atividade completa (com barra lateral)
function abrirModalAtividade(editId) {
        // Adiciona auto-preenchimento TED/PTrab -> Objeto/Processo Principal
        const tedInput = document.getElementById('atividadeTedPtrabCompleta');
        if (tedInput && !tedInput._autoFillListener) {
            tedInput.addEventListener('blur', function() {
                const valor = tedInput.value.trim();
                if (!valor) return;
                const match = (AppState.dados.atividades || []).find(x => x.tedPtrab && x.tedPtrab.trim() === valor);
                if (match) {
                    if (document.getElementById('atividadeObjetoCompleta')) document.getElementById('atividadeObjetoCompleta').value = match.objeto || '';
                    if (document.getElementById('atividadeProcessoPrincipalCompleta')) document.getElementById('atividadeProcessoPrincipalCompleta').value = match.processoPrincipal || '';
                }
            });
            tedInput._autoFillListener = true;
        }
    const modal = document.getElementById('modalNovaAtividadeCompleta');
    if (!modal) { alert('Modal de atividade não encontrado!'); return; }
    // Limpa todos os campos
    const ids = [
        'atividadeOrdemCompleta','atividadeTedPtrabCompleta','atividadeObjetoCompleta','atividadeProcessoPrincipalCompleta','atividadeAssuntoCompleta','atividadeProcessoSolicitacaoCompleta','atividadeDataDocCompleta','atividadeTipoDocCompleta','atividadeNumeroDocCompleta','atividadeRemetenteCompleta','atividadeDestinatarioCompleta','atividadeAcaoRealizarCompleta','atividadePrioridadeCompleta','atividadePrazoCompleta','atividadeDiasCompleta','atividadeStatusCompleta','atividadeProgressoCompleta','atividadeTagsCompleta','atividadeLembreteDiasCompleta','atividadeLembreteHorarioCompleta','atividadeObservacoesCompleta','atividadeFinalizadoCompleta','atividadeArquivoCompleta','comentarioInputCompleta'];
    ids.forEach(id => { const n = document.getElementById(id); if (n) { if(n.type==='checkbox') n.checked=false; else n.value=''; }});
    // Limpa listas
    ['anexosListCompleta','comentariosListCompleta'].forEach(id => { const ul = document.getElementById(id); if (ul) ul.innerHTML = ''; });
    // Preenche ordem automática se for novo
    if (!editId) {
        const ordEl = document.getElementById('atividadeOrdemCompleta');
        if (ordEl) ordEl.value = gerarProximoOrdem();
    }
    // Se for edição, preencher campos
    if (editId) {
        const a = (AppState.dados.atividades || []).find(x => x.id === editId) || null;
        if (!a) return;
        modal.dataset.editId = editId;
        if (document.getElementById('atividadeOrdemCompleta')) document.getElementById('atividadeOrdemCompleta').value = a.ordem || '';
        if (document.getElementById('atividadeTedPtrabCompleta')) document.getElementById('atividadeTedPtrabCompleta').value = a.tedPtrab || '';
        if (document.getElementById('atividadeObjetoCompleta')) document.getElementById('atividadeObjetoCompleta').value = a.objeto || '';
        if (document.getElementById('atividadeProcessoPrincipalCompleta')) document.getElementById('atividadeProcessoPrincipalCompleta').value = a.processoPrincipal || '';
        if (document.getElementById('atividadeAssuntoCompleta')) document.getElementById('atividadeAssuntoCompleta').value = a.assunto || '';
        if (document.getElementById('atividadeProcessoSolicitacaoCompleta')) document.getElementById('atividadeProcessoSolicitacaoCompleta').value = a.processoSolicitacao || '';
        if (document.getElementById('atividadeDataDocCompleta')) document.getElementById('atividadeDataDocCompleta').value = dateIsoToBr(a.dataDoc) || '';
        if (document.getElementById('atividadeTipoDocCompleta')) document.getElementById('atividadeTipoDocCompleta').value = a.tipoDoc || '';
        if (document.getElementById('atividadeNumeroDocCompleta')) document.getElementById('atividadeNumeroDocCompleta').value = a.numeroDoc || '';
        if (document.getElementById('atividadeRemetenteCompleta')) document.getElementById('atividadeRemetenteCompleta').value = a.remetente || '';
        if (document.getElementById('atividadeDestinatarioCompleta')) document.getElementById('atividadeDestinatarioCompleta').value = a.destinatario || '';
        if (document.getElementById('atividadeAcaoRealizarCompleta')) document.getElementById('atividadeAcaoRealizarCompleta').value = a.acaoRealizar || '';
        if (document.getElementById('atividadePrioridadeCompleta')) document.getElementById('atividadePrioridadeCompleta').value = a.prioridade || 'media';
        if (document.getElementById('atividadePrazoCompleta')) document.getElementById('atividadePrazoCompleta').value = dateIsoToBr(a.prazo) || '';
        if (document.getElementById('atividadeDiasCompleta')) document.getElementById('atividadeDiasCompleta').value = typeof a.dias !== 'undefined' ? a.dias : '';
        if (document.getElementById('atividadeStatusCompleta')) document.getElementById('atividadeStatusCompleta').value = a.status || 'pendente';
        if (document.getElementById('atividadeProgressoCompleta')) document.getElementById('atividadeProgressoCompleta').value = a.progresso || 0;
        if (document.getElementById('atividadeTagsCompleta')) document.getElementById('atividadeTagsCompleta').value = a.tags || '';
        if (document.getElementById('atividadeLembreteDiasCompleta')) document.getElementById('atividadeLembreteDiasCompleta').value = a.lembreteDias || 0;
        if (document.getElementById('atividadeLembreteHorarioCompleta')) document.getElementById('atividadeLembreteHorarioCompleta').value = a.lembreteHorario || '';
        if (document.getElementById('atividadeObservacoesCompleta')) document.getElementById('atividadeObservacoesCompleta').value = a.observacoes || '';
        if (document.getElementById('atividadeFinalizadoCompleta')) document.getElementById('atividadeFinalizadoCompleta').value = a.finalizado ? 'true' : 'false';
        // anexos, comentários: implementar se necessário
    } else {
        delete modal.dataset.editId;
    }
    modal.classList.add('active');
}

function fecharModalNovaAtividadeCompleta() {
    const modal = document.getElementById('modalNovaAtividadeCompleta');
    if (modal) modal.classList.remove('active');
    delete modal.dataset.editId;
}

function salvarNovaAtividadeCompleta() {
    // Exemplo: coleta campos e salva no AppState (implementar conforme necessário)
    const get = id => document.getElementById(id)?.value || '';
    const atividade = {
        ordem: get('atividadeOrdemCompleta'),
        tedPtrab: get('atividadeTedPtrabCompleta'),
        objeto: get('atividadeObjetoCompleta'),
        processoPrincipal: get('atividadeProcessoPrincipalCompleta'),
        assunto: get('atividadeAssuntoCompleta'),
        processoSolicitacao: get('atividadeProcessoSolicitacaoCompleta'),
        dataDoc: dateBrToIso(get('atividadeDataDocCompleta')),
        tipoDoc: get('atividadeTipoDocCompleta'),
        numeroDoc: get('atividadeNumeroDocCompleta'),
        remetente: get('atividadeRemetenteCompleta'),
        destinatario: get('atividadeDestinatarioCompleta'),
        acaoRealizar: get('atividadeAcaoRealizarCompleta'),
        prioridade: get('atividadePrioridadeCompleta'),
        prazo: dateBrToIso(get('atividadePrazoCompleta')),
        dias: get('atividadeDiasCompleta'),
        status: get('atividadeStatusCompleta'),
        progresso: get('atividadeProgressoCompleta'),
        tags: get('atividadeTagsCompleta'),
        lembreteDias: get('atividadeLembreteDiasCompleta'),
        lembreteHorario: get('atividadeLembreteHorarioCompleta'),
        observacoes: get('atividadeObservacoesCompleta'),
        finalizado: get('atividadeFinalizadoCompleta') === 'true',
        // anexos, comentários: implementar se necessário
    };
    // Se for edição, atualiza; senão, adiciona
    const modal = document.getElementById('modalNovaAtividadeCompleta');
    const editId = modal?.dataset.editId;
    if (editId) {
        const idx = (AppState.dados.atividades || []).findIndex(x => x.id === editId);
        if (idx >= 0) {
            AppState.dados.atividades[idx] = { ...AppState.dados.atividades[idx], ...atividade };
        }
    } else {
        atividade.id = gerarIdUnico();
        (AppState.dados.atividades = AppState.dados.atividades || []).push(atividade);
    }
    AppState.save();
    renderizarAtividades();
    fecharModalNovaAtividadeCompleta();
}

function fecharModalAtividade() {
    const modal = document.getElementById('modalAtividade');
    if (!modal) return;
    modal.classList.remove('active');
    delete modal.dataset.editId;
    // limpar subtasks input/list
    const ul = document.getElementById('subtasksList'); if (ul) ul.innerHTML = '';
    const subInput = document.getElementById('subtaskInput'); if (subInput) subInput.value = '';
}

function salvarAtividade() {
    const modal = document.getElementById('modalAtividade');
    const editId = modal && modal.dataset.editId ? modal.dataset.editId : null;
    const titulo = document.getElementById('atividadeTitulo').value.trim();
    if (!titulo) { Notifications.warning('Título é obrigatório'); return; }
    const tagsArr = (document.getElementById('atividadeTags').value || '').split(',').map(s=>s.trim()).filter(Boolean);
    const tempoEstimado = Number(document.getElementById('atividadeEstimado').value || 0) || 0;
    const tempoGasto = Number(document.getElementById('atividadeGasto').value || 0) || 0;
    const lembreteDias = Number(document.getElementById('atividadeLembreteDias').value || 0) || 0;

    const lembreteHorarioVal = document.getElementById('atividadeLembreteHorario').value || null;
    const observacoes = document.getElementById('atividadeObservacoes').value || '';
    const finalizadoVal = document.getElementById('atividadeFinalizado').value === 'true';
    

    const obj = {
        id: editId || ('ativ-' + Date.now()),
        titulo,
        descricao: document.getElementById('atividadeDescricao').value.trim(),
        responsavel: document.getElementById('atividadeResponsavel').value.trim(),
        prioridade: document.getElementById('atividadePrioridade').value,
        prazo: dateBrToIso(document.getElementById('atividadePrazo').value) || null,
        dataDoc: dateBrToIso(document.getElementById('atividadeDataDoc').value) || null,
        tipoDoc: document.getElementById('atividadeTipoDoc').value || '',
        numeroDoc: document.getElementById('atividadeNumeroDoc').value || '',
        remetente: document.getElementById('atividadeRemetente').value || '',
        destinatario: document.getElementById('atividadeDestinatario').value || '',
        acaoRealizar: document.getElementById('atividadeAcaoRealizar').value || '',
        status: document.getElementById('atividadeStatus').value,
        progresso: Number(document.getElementById('atividadeProgresso').value || 0),
        tags: tagsArr,
        tempoEstimadoMin: tempoEstimado,
        tempoGastoMin: tempoGasto,
        lembreteDias: Number(document.getElementById('atividadeLembreteDias').value || 0) || 0,
        lembreteHorario: lembreteHorarioVal ? new Date(lembreteHorarioVal).toISOString() : null,
        observacoes: observacoes,
        finalizado: finalizadoVal,
        // calcular dias automaticamente a partir do prazo
        dias: calcularDiasAtePrazo(dateBrToIso(document.getElementById('atividadePrazo').value) || null),
        tedPtrab: document.getElementById('atividadeTedPtrab').value || '',
        objeto: document.getElementById('atividadeObjeto').value || '',
        processoPrincipal: document.getElementById('atividadeProcessoPrincipal').value || '',
        assunto: document.getElementById('atividadeAssunto').value || '',
        processoSolicitacao: document.getElementById('atividadeProcessoSolicitacao').value || '',
        tipoDoc: document.getElementById('atividadeTipoDoc').value || '',
        numeroDoc: document.getElementById('atividadeNumeroDoc').value || '',
        // Ordem é automática quando criando; ao editar, preservar
        ordem: (editId ? (document.getElementById('atividadeOrdem') && document.getElementById('atividadeOrdem').value) : gerarProximoOrdem()) || '',
        acaoRealizar: document.getElementById('atividadeAcaoRealizar').value || '',
        observacoesDoc: document.getElementById('atividadeObservacoes').value || '',
        comentarios: [],
        anexos: [],
        subtarefas: [] ,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
    };

    let list = AppState.dados.atividades || [];
    const tempSub = (window.__modalSubtasks && window.__modalSubtasks['new']) || [];
    const tempAnexos = (window.__modalAnexos && window.__modalAnexos['new']) || [];
    const tempComentarios = (window.__modalComentarios && window.__modalComentarios['new']) || [];

    if (editId) {
        const idx = list.findIndex(x => x.id === editId);
        if (idx >= 0) {
            // merge arrays instead of overriding
            const existing = list[idx];
            const merged = Object.assign({}, existing, obj);
            merged.subtarefas = (existing.subtarefas || []).concat(tempSub);
            merged.anexos = (existing.anexos || []).concat(tempAnexos);
            merged.comentarios = (existing.comentarios || []).concat(tempComentarios);
            merged.atualizadoEm = new Date().toISOString();
            list[idx] = merged;
        }
    } else {
        if (tempSub.length) obj.subtarefas = tempSub.slice();
        if (tempAnexos.length) obj.anexos = tempAnexos.slice();
        if (tempComentarios.length) obj.comentarios = tempComentarios.slice();
        list.push(obj);
    }

    AppState.dados.atividades = list;
    AppState.save();
    // limpar buffers temporários do modal
    try { window.__modalAnexos = { 'new': [] }; } catch(e){}
    try { window.__modalComentarios = { 'new': [] }; } catch(e){}
    try { window.__modalSubtasks = { 'new': [] }; } catch(e){}
    fecharModalAtividade();
    renderizarAtividades();
    Notifications.success('Atividade salva');
}

// ================= PAINEL INLINE NOVA ATIVIDADE ==================
function abrirAbaNovaAtividade() {
    console.debug('abrirAbaNovaAtividade called');
    const el = document.getElementById('novaAtividadeInline');
    if (!el) return;
    // fechar modal caso esteja aberto
    if (typeof fecharModalAtividade === 'function') {
        try { fecharModalAtividade(); } catch (e) { console.debug('fecharModalAtividade falhou', e); }
    }
    // garantir que a aba de Atividades esteja visível
    try { const tab = document.querySelector('.tab-btn[data-tab="atividades"]'); if (tab) tab.click(); } catch (e) { /* ignore */ }
    // limpar campos
    const ids = ['atividadeOrdemInline','atividadeTedPtrabInline','atividadeObjetoInline','atividadeProcessoPrincipalInline','atividadeAssuntoInline','atividadeProcessoSolicitacaoInline','atividadeDataDocInline','atividadeTipoDocInline','atividadeNumeroDocInline','atividadeRemetenteInline','atividadeDestinatarioInline','atividadeAcaoRealizarInline','atividadePrazoInline','atividadeDiasInline','atividadeObservacoesInline','atividadeFinalizadoInline','atividadeStatusInline'];
    ids.forEach(id => { const n = document.getElementById(id); if (n) n.value = ''; });
    if (document.getElementById('atividadeFinalizadoInline')) document.getElementById('atividadeFinalizadoInline').value = 'false';
    if (document.getElementById('atividadeStatusInline')) document.getElementById('atividadeStatusInline').value = 'pendente';
    // abrir com animação (toggle classe .open)
    el.style.display = 'block';
    // small timeout to allow transition
    setTimeout(() => el.classList.add('open'), 10);
    // foco no primeiro campo
    const first = document.getElementById('atividadeObjetoInline') || document.getElementById('atividadeOrdemInline');
    if (first) first.focus();
    el.scrollIntoView({ behavior: 'smooth' });

    // ativar navegação lateral (links)
    try {
        const anchors = Array.from(el.querySelectorAll('nav a'));
        anchors.forEach(a => {
            a.classList.remove('active');
            a.addEventListener('click', (ev) => {
                anchors.forEach(x=>x.classList.remove('active'));
                a.classList.add('active');
            });
        });
        if (anchors.length) anchors[0].classList.add('active');
    } catch (e) { /* ignore */ }
}

function fecharAbaNovaAtividade() {
    const el = document.getElementById('novaAtividadeInline');
    if (!el) return;
    // animação de fechamento
    el.classList.remove('open');
    // aguardar transição antes de esconder
    setTimeout(() => { try { el.style.display = 'none'; } catch(e){} }, 260);
}

function salvarAtividadeInline() {
    const container = document.getElementById('novaAtividadeInline');
    const editId = container && container.dataset && container.dataset.editId ? container.dataset.editId : null;
    const titulo = (document.getElementById('atividadeObjetoInline') && document.getElementById('atividadeObjetoInline').value.trim()) || 'Nova atividade';
    const newData = {
        titulo: titulo,
        descricao: '',
        responsavel: '',
        prioridade: 'media',
        dataDoc: dateBrToIso(document.getElementById('atividadeDataDocInline') && document.getElementById('atividadeDataDocInline').value) || null,
        tipoDoc: document.getElementById('atividadeTipoDocInline') && document.getElementById('atividadeTipoDocInline').value || '',
        numeroDoc: document.getElementById('atividadeNumeroDocInline') && document.getElementById('atividadeNumeroDocInline').value || '',
        remetente: document.getElementById('atividadeRemetenteInline') && document.getElementById('atividadeRemetenteInline').value || '',
        destinatario: document.getElementById('atividadeDestinatarioInline') && document.getElementById('atividadeDestinatarioInline').value || '',
        acaoRealizar: document.getElementById('atividadeAcaoRealizarInline') && document.getElementById('atividadeAcaoRealizarInline').value || '',
        status: document.getElementById('atividadeStatusInline') && document.getElementById('atividadeStatusInline').value || 'pendente',
        progresso: 0,
        tags: [],
        tempoEstimadoMin: 0,
        tempoGastoMin: 0,
        lembreteDias: 0,
        lembreteHorario: null,
        observacoes: document.getElementById('atividadeObservacoesInline') && document.getElementById('atividadeObservacoesInline').value || '',
        finalizado: (document.getElementById('atividadeFinalizadoInline') && document.getElementById('atividadeFinalizadoInline').value === 'true') || false,
        prazo: dateBrToIso(document.getElementById('atividadePrazoInline') && document.getElementById('atividadePrazoInline').value) || null,
        // calcular dias automaticamente a partir do prazo
        dias: calcularDiasAtePrazo(dateBrToIso(document.getElementById('atividadePrazoInline') && document.getElementById('atividadePrazoInline').value) || null),
        tedPtrab: document.getElementById('atividadeTedPtrabInline') && document.getElementById('atividadeTedPtrabInline').value || '',
        objeto: document.getElementById('atividadeObjetoInline') && document.getElementById('atividadeObjetoInline').value || '',
        processoPrincipal: document.getElementById('atividadeProcessoPrincipalInline') && document.getElementById('atividadeProcessoPrincipalInline').value || '',
        assunto: document.getElementById('atividadeAssuntoInline') && document.getElementById('atividadeAssuntoInline').value || '',
        processoSolicitacao: document.getElementById('atividadeProcessoSolicitacaoInline') && document.getElementById('atividadeProcessoSolicitacaoInline').value || '',
        // Ordem automática ao criar; ao editar, manter a existente
        ordem: (editId ? (document.getElementById('atividadeOrdemInline') && document.getElementById('atividadeOrdemInline').value) : gerarProximoOrdem()) || '',
        observacoesDoc: document.getElementById('atividadeObservacoesInline') && document.getElementById('atividadeObservacoesInline').value || ''
    };

    let list = AppState.dados.atividades || [];
    if (editId) {
        const idx = list.findIndex(x => x.id === editId);
        if (idx >= 0) {
            const existing = list[idx];
            const merged = Object.assign({}, existing, newData);
            merged.atualizadoEm = new Date().toISOString();
            list[idx] = merged;
        }
    } else {
        const obj = Object.assign({ id: 'ativ-' + Date.now(), criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), comentarios: [], anexos: [], subtarefas: [] }, newData);
        list.push(obj);
    }

    AppState.dados.atividades = list;
    AppState.save();
    // limpar editId
    if (container && container.dataset) delete container.dataset.editId;
    fecharAbaNovaAtividade();
    renderizarAtividades();
    Notifications.success(editId ? 'Atividade atualizada (inline)' : 'Atividade criada (inline)');
}

function adicionarSubtaskModal() {
    const txt = (document.getElementById('subtaskInput').value || '').trim();
    if (!txt) return;
    const modal = document.getElementById('modalAtividade');
    const editId = modal && modal.dataset.editId ? modal.dataset.editId : null;
    // if editing existing, push into its subtarefas
    if (editId) {
        const list = AppState.dados.atividades || [];
        const idx = list.findIndex(x => x.id === editId);
        if (idx >= 0) {
            if (!Array.isArray(list[idx].subtarefas)) list[idx].subtarefas = [];
            list[idx].subtarefas.push({ titulo: txt, concluido: false });
            AppState.dados.atividades = list;
            AppState.save();
            abrirModalAtividade(editId); // re-render subtasks
            return;
        }
    }
    // otherwise, add to modal-only list
    const ul = document.getElementById('subtasksList');
    const li = document.createElement('li');
    li.classList.add('activity-card');
    li.innerHTML = `<label><input type="checkbox" /> ${escapeHtml(txt)}</label><button class="btn-secondary btn-icon" onclick="this.parentElement.remove()">${(typeof svgIcon === 'function')? svgIcon('trash', { title: 'Remover item', color: 'currentColor' }) : '🗑️'}</button>`;
    ul.appendChild(li);
    document.getElementById('subtaskInput').value = '';
    // persist in temporary modal store so it will be saved on create
    window.__modalSubtasks = window.__modalSubtasks || {};
    window.__modalSubtasks['new'] = window.__modalSubtasks['new'] || [];
    window.__modalSubtasks['new'].push({ titulo: txt, concluido: false });
}

function toggleSubtask(atividadeId, subIndex, checked) {
    const list = AppState.dados.atividades || [];
    const idx = list.findIndex(x => x.id === atividadeId);
    if (idx < 0) return;
    if (!Array.isArray(list[idx].subtarefas)) return;
    list[idx].subtarefas[subIndex].concluido = !!checked;
    // recalcula progresso automaticamente
    const subt = list[idx].subtarefas;
    const total = subt.length;
    const done = subt.filter(s=>s.concluido).length;
    list[idx].progresso = total ? Math.round((done/total)*100) : list[idx].progresso;
    list[idx].atualizadoEm = new Date().toISOString();
    AppState.dados.atividades = list;
    AppState.save();
    renderizarAtividades();
}

function removerSubtask(atividadeId, subIndex) {
    const list = AppState.dados.atividades || [];
    const idx = list.findIndex(x => x.id === atividadeId);
    if (idx < 0) return;
    list[idx].subtarefas.splice(subIndex,1);
    // recalcula progresso
    const subt = list[idx].subtarefas;
    const total = subt.length;
    const done = subt.filter(s=>s.concluido).length;
    list[idx].progresso = total ? Math.round((done/total)*100) : 0;
    AppState.dados.atividades = list;
    AppState.save();
    abrirModalAtividade(atividadeId);
    renderizarAtividades();
}

// ============= ANEXOS E COMENTÁRIOS (Modal) =============
function adicionarAnexoModal(event) {
    const file = event && event.target && event.target.files && event.target.files[0];
    if (!file) return;
    const modal = document.getElementById('modalAtividade');
    const editId = modal && modal.dataset.editId ? modal.dataset.editId : null;

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        const anexo = { id: 'anx-' + Date.now(), name: file.name, size: file.size, type: file.type, data: dataUrl, criadoEm: new Date().toISOString() };
        if (editId) {
            const list = AppState.dados.atividades || [];
            const idx = list.findIndex(x => x.id === editId);
            if (idx >= 0) {
                if (!Array.isArray(list[idx].anexos)) list[idx].anexos = [];
                list[idx].anexos.push(anexo);
                list[idx].atualizadoEm = new Date().toISOString();
                AppState.dados.atividades = list;
                AppState.save();
                abrirModalAtividade(editId);
                Notifications.success('Anexo adicionado');
            }
        } else {
            window.__modalAnexos = window.__modalAnexos || {};
            window.__modalAnexos['new'] = window.__modalAnexos['new'] || [];
            window.__modalAnexos['new'].push(anexo);
            atualizarListaAnexosModal();
            Notifications.success('Anexo pronto (será salvo ao criar a atividade)');
        }
        // clear input
        if (event && event.target) event.target.value = '';
    };
    reader.readAsDataURL(file);
}

function atualizarListaAnexosModal() {
    const modal = document.getElementById('modalAtividade');
    const editId = modal && modal.dataset.editId ? modal.dataset.editId : null;
    const ul = document.getElementById('anexosList');
    if (!ul) return;
    ul.innerHTML = '';
    if (editId) return; // editing handled by abrirModalAtividade
    const items = (window.__modalAnexos && window.__modalAnexos['new']) || [];
    items.forEach((ax, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${ax.data}" target="_blank">${escapeHtml(ax.name)}</a> <small>(${Math.round((ax.size||0)/1024)} KB)</small> <button class="btn-secondary btn-icon" onclick="removerAnexo(null,${i})">${(typeof svgIcon === 'function')? svgIcon('trash', { title: 'Remover anexo', color: 'currentColor' }) : '🗑️'}</button>`;
        ul.appendChild(li);
    });
}

// ============= MODAL SOLICITAR FÉRIAS =============

// Estado do modal de férias
let _modalFeriasPeriodoIndex = null;

function abrirModalSolicitarFerias(periodoIndex) {
    _modalFeriasPeriodoIndex = periodoIndex;
    const modal = document.getElementById('modalSolicitarFerias');
    if (!modal) {
        console.error('Modal de solicitação de férias não encontrado');
        return;
    }
    
    // Buscar dados do período
    const periodos = (AppState.dados && AppState.dados.periodosAquisitivos) || [];
    const grupo = periodos.filter(p => p.periodoIndex === periodoIndex);
    if (grupo.length === 0) {
        mostrarAlertaGlobal('Período não encontrado.', 'error');
        return;
    }
    
    const first = grupo[0];
    const msDay = 24 * 60 * 60 * 1000;
    
    // Preencher informações do período
    const inicioText = first.inicio ? DateUtils.formatBR(first.inicio) : '';
    const terminoText = first.termino ? DateUtils.formatBR(first.termino) : '';
    const elPeriodoAq = document.getElementById('modalFeriasPeriodoAquisitivo');
    if (elPeriodoAq) elPeriodoAq.textContent = `${inicioText} → ${terminoText}`;
    const elLimite = document.getElementById('modalFeriasLimiteConcessao');
    if (elLimite) elLimite.textContent = first.limite ? DateUtils.formatBR(first.limite) : '';
    
    // Calcular dias disponíveis
    const comFerias = grupo.filter(p => p.feriasInicio && p.feriasFim);
    let totalConcedidos = 0;
    comFerias.forEach(sub => {
        const d = sub.dias && typeof sub.dias === 'number' && sub.dias > 0 ? sub.dias : 0;
        totalConcedidos += d;
    });
    const entitlement = (AppState.dados && AppState.dados.configuracoes && Number(AppState.dados.configuracoes.feriasDias) > 0) 
        ? Number(AppState.dados.configuracoes.feriasDias) : 30;
    const disponiveis = Math.max(0, entitlement - totalConcedidos);
    const elDisponiveis = document.getElementById('modalFeriasDiasDisponiveis');
    if (elDisponiveis) elDisponiveis.textContent = `${disponiveis} dias`;
    
    // Verificar limite de 3 períodos
    if (comFerias.length >= 3) {
        mostrarAlertaGlobal('Limite de 3 períodos de férias atingido para este período aquisitivo.', 'error');
        return;
    }
    
    // Informar qual período será (próximo número)
    const proximoPeriodo = comFerias.length + 1;
    const elProximo = document.getElementById('modalFeriasProximoPeriodo');
    if (elProximo) elProximo.textContent = `${proximoPeriodo}º Período`;
    
    // Ocultar select de subperíodo (não mais necessário)
    const selectPeriodo = document.getElementById('modalFeriasPeriodoSelect');
    if (selectPeriodo) selectPeriodo.style.display = 'none';
    
    // Limpar campos
    const elInicio = document.getElementById('modalFeriasInicio');
    const elFim = document.getElementById('modalFeriasFim');
    const elAdto13 = document.getElementById('modalFeriasAdto13');
    if (elInicio) elInicio.value = '';
    if (elFim) elFim.value = '';
    if (elAdto13) elAdto13.value = '';
    const elDiasCalc = document.getElementById('modalFeriasDiasCalculados');
    if (elDiasCalc) elDiasCalc.textContent = '';
    
    // Calcular dias automaticamente quando as datas mudam
    const inputInicio = document.getElementById('modalFeriasInicio');
    const inputFim = document.getElementById('modalFeriasFim');
    const calcularDiasModal = () => {
        const inicio = inputInicio ? inputInicio.value : '';
        const fim = inputFim ? inputFim.value : '';
        if (inicio && fim) {
            const dtI = DateUtils.parse(inicio);
            const dtF = DateUtils.parse(fim);
            if (dtI && dtF && dtF >= dtI) {
                const dias = Math.floor((dtF - dtI) / msDay) + 1;
                if (elDiasCalc) elDiasCalc.textContent = `Total: ${dias} dia(s)`;
            } else {
                if (elDiasCalc) elDiasCalc.textContent = '';
            }
        } else {
            if (elDiasCalc) elDiasCalc.textContent = '';
        }
    };
    if (inputInicio) inputInicio.onchange = calcularDiasModal;
    if (inputFim) inputFim.onchange = calcularDiasModal;
    inputFim.onchange = calcularDiasModal;
    
    modal.style.display = 'flex';
}

function fecharModalSolicitarFerias() {
    const modal = document.getElementById('modalSolicitarFerias');
    if (modal) modal.style.display = 'none';
    _modalFeriasPeriodoIndex = null;
}

function confirmarSolicitacaoFerias() {
    try {
        const inicio = dateBrToIso(document.getElementById('modalFeriasInicio').value);
        const fim = dateBrToIso(document.getElementById('modalFeriasFim').value);
        const adto13 = document.getElementById('modalFeriasAdto13').value;
        
        if (!inicio || !fim) {
            mostrarAlertaGlobal('Informe as datas de início e término.', 'warning');
            return;
        }
        
        const dtInicio = DateUtils.parse(inicio);
        const dtFim = DateUtils.parse(fim);
        if (!dtInicio || !dtFim) {
            mostrarAlertaGlobal('Datas inválidas.', 'error');
            return;
        }
        if (dtFim < dtInicio) {
            mostrarAlertaGlobal('A data de término deve ser maior ou igual à data de início.', 'error');
            return;
        }
        
        const msDay = 24 * 60 * 60 * 1000;
        const dias = Math.floor((dtFim - dtInicio) / msDay) + 1;
        const periodoIndex = _modalFeriasPeriodoIndex;
        
        if (!periodoIndex) {
            mostrarAlertaGlobal('Período aquisitivo não identificado.', 'error');
            return;
        }
        
        // Buscar todos os registros deste período aquisitivo
        const periodos = AppState.dados.periodosAquisitivos || [];
        const grupo = periodos.filter(p => p.periodoIndex === periodoIndex);
        
        if (grupo.length === 0) {
            mostrarAlertaGlobal('Período aquisitivo não encontrado.', 'error');
            return;
        }
        
        // Contar subperíodos já com férias preenchidas
        const subComFerias = grupo.filter(p => p.feriasInicio && p.feriasFim);
        const entitlement = (AppState.dados && AppState.dados.configuracoes && Number(AppState.dados.configuracoes.feriasDias) > 0) 
            ? Number(AppState.dados.configuracoes.feriasDias) : 30;
        
        // Calcular dias já usados
        let diasUsados = 0;
        subComFerias.forEach(sub => {
            const d = sub.dias && typeof sub.dias === 'number' && sub.dias > 0 ? sub.dias : 0;
            diasUsados += d;
        });
        
        const diasDisponiveis = entitlement - diasUsados;
        
        if (dias > diasDisponiveis) {
            mostrarAlertaGlobal(`Quantidade de dias (${dias}) excede os dias disponíveis (${diasDisponiveis}).`, 'error');
            return;
        }
        
        // Máximo 3 períodos de férias
        if (subComFerias.length >= 3) {
            mostrarAlertaGlobal('Limite de 3 períodos de férias atingido para este período aquisitivo.', 'error');
            return;
        }
        
        // Verificar se há um registro vazio (sem férias) que pode ser preenchido
        const registroVazio = grupo.find(p => !p.feriasInicio && !p.feriasFim);
        
        let targetPeriodo;
        const novoSubIndex = subComFerias.length + 1;
        
        if (registroVazio) {
            // Preencher o registro vazio
            targetPeriodo = registroVazio;
            targetPeriodo.subIndex = novoSubIndex;
        } else {
            // Criar novo subperíodo
            const baseP = grupo[0];
            const novoId = gerarIdUnico();
            targetPeriodo = {
                id: novoId,
                periodoIndex: periodoIndex,
                inicio: baseP.inicio,
                termino: baseP.termino,
                limite: baseP.limite,
                subIndex: novoSubIndex,
                subTotal: null,
                feriasInicio: null,
                feriasFim: null,
                adto13: '',
                dias: null,
                documento: ''
            };
            AppState.dados.periodosAquisitivos.push(targetPeriodo);
        }
        
        // Preencher os dados das férias
        targetPeriodo.feriasInicio = inicio;
        targetPeriodo.feriasFim = fim;
        targetPeriodo.dias = dias;
        targetPeriodo.adto13 = adto13 || '';
        
        // Criar evento de férias
        const evento = {
            tipoEvento: 'ferias',
            descricaoEvento: `Férias - ${novoSubIndex}º Período`,
            dataInicioEvento: inicio,
            dataFimEvento: fim,
            impactoEvento: 'folga',
            periodo: 'dia_todo',
            acordoIndex: null,
            corFundo: '#f0f8ff',
            corTexto: '#000000',
            nomeCSS: ''
        };
        
        const erros = Validators.validateEvento(evento);
        if (erros && erros.length) {
            mostrarAlertaGlobal(erros.join('; '), 'error');
            return;
        }
        
        if (!AppState.dados.eventos) AppState.dados.eventos = [];
        AppState.dados.eventos.push(evento);
        AppState.save();
        
        fecharModalSolicitarFerias();
        renderizarEventos();
        renderizarPeriodosAquisitivosTable();
        try { gerarTimesheetAcordo(); } catch (e) {}
        try { atualizarDashboard(); } catch (e) {}
        
        const labelPeriodo = novoSubIndex === 1 ? '1º Período' : (novoSubIndex === 2 ? '2º Período' : '3º Período');
        mostrarAlertaGlobal(`Férias solicitadas com sucesso! ${labelPeriodo} (${dias} dias)`, 'success');
    } catch (e) {
        console.error('Erro ao confirmar solicitação de férias:', e);
        mostrarAlertaGlobal('Erro ao solicitar férias. Veja console.', 'error');
    }
}

// Edita todos os subperiodos de um mesmo periodoIndex (linha 'Único')
function editarPeriodoGroup(periodoIndex) {
    const rows = (AppState.dados.periodosAquisitivos || []).filter(p => p.periodoIndex === periodoIndex);
    if (!rows || rows.length === 0) {
        mostrarAlertaGlobal('Nenhum período encontrado para edição.');
        return;
    }

    const sample = rows[0];
    const newFeriasInicio = prompt('Férias Início (AAAA-MM-DD):', sample.feriasInicio || '');
    if (newFeriasInicio === null) return;
    const newFeriasFim = prompt('Férias Término (AAAA-MM-DD):', sample.feriasFim || '');
    if (newFeriasFim === null) return;
    const newAdto13 = prompt('Adto 13º (sim/não):', sample.adto13 || '');
    if (newAdto13 === null) return;
    const newDias = prompt('Dias:', sample.dias != null ? String(sample.dias) : '');
    if (newDias === null) return;
    const newDoc = prompt('Documento:', sample.documento || '');
    if (newDoc === null) return;

    rows.forEach(r => {
        r.feriasInicio = newFeriasInicio || null;
        r.feriasFim = newFeriasFim || null;
        r.adto13 = newAdto13 || null;
        r.dias = newDias ? Number(newDias) : null;
        r.documento = newDoc || null;
    });

    AppState.save();
    renderizarPeriodosAquisitivosTable();
    mostrarAlertaGlobal('Período atualizado com sucesso.');
}

// Remove todos os subperiodos de um mesmo periodoIndex (linha 'Único')
function removerPeriodoGroup(periodoIndex) {
    if (!confirm('Deseja limpar as marcações de férias deste período (todos os subperíodos)? Esta ação NÃO removerá os registros dos períodos.')) return;
    const arr = AppState.dados.periodosAquisitivos || [];
    let changed = false;
    arr.forEach(p => {
        if (p && Number(p.periodoIndex) === Number(periodoIndex)) {
            if (p.feriasInicio || p.feriasFim || p.dias || p.documento || p.adto13) {
                p.feriasInicio = '';
                p.feriasFim = '';
                p.dias = null;
                p.documento = '';
                p.adto13 = '';
                changed = true;
            }
        }
    });
    if (changed) {
        AppState.save();
        renderizarPeriodosAquisitivosTable();
        mostrarAlertaGlobal('Marcações de férias limpas para o período.', 'success');
    } else {
        mostrarAlertaGlobal('Nenhuma marcação encontrada para limpar neste período.', 'info');
    }
}

// Solicitar férias a partir de um subperiodo (linha específica)
function solicitarFeriasFromRow(id) {
    try {
        if (!AppState.dados || !Array.isArray(AppState.dados.periodosAquisitivos)) {
            mostrarAlertaGlobal('Nenhum período salvo para solicitar férias.', 'warning');
            return;
        }
        // Localizar o período pelo id
        let periodo = AppState.dados.periodosAquisitivos.find(p2 => p2.id === id);
        if (!periodo) {
            mostrarAlertaGlobal('Período não encontrado para solicitação.', 'error');
            return;
        }

        // usar feriasInicio/feriasFim se preenchidos, senão perguntar (formato DD/MM/AAAA)
        let inicioISO = periodo.feriasInicio || '';
        let fimISO = periodo.feriasFim || '';
        
        // Converter para exibição DD/MM/AAAA
        let inicioDisplay = inicioISO ? DateUtils.formatBR(inicioISO) : '';
        let fimDisplay = fimISO ? DateUtils.formatBR(fimISO) : '';
        
        if (!inicioISO) {
            inicioDisplay = prompt('Data de início das férias (DD/MM/AAAA):', inicioDisplay || '');
            if (inicioDisplay === null) return;
            // Converter de DD/MM/AAAA para ISO
            inicioISO = parseDateBR(inicioDisplay);
        }
        if (!fimISO) {
            fimDisplay = prompt('Data de término das férias (DD/MM/AAAA):', fimDisplay || inicioDisplay || '');
            if (fimDisplay === null) return;
            fimISO = parseDateBR(fimDisplay);
        }

        if (!inicioISO || !fimISO) {
            mostrarAlertaGlobal('Datas inválidas. Use o formato DD/MM/AAAA.', 'error');
            return;
        }

        const evento = {
            tipoEvento: 'ferias',
            descricaoEvento: 'Férias',
            dataInicioEvento: inicioISO,
            dataFimEvento: fimISO,
            impactoEvento: 'folga',
            periodo: 'dia_todo',
            acordoIndex: null,
            corFundo: '#f0f8ff',
            corTexto: '#000000',
            nomeCSS: ''
        };

        const erros = Validators.validateEvento(evento);
        if (erros && erros.length) throw new Error(erros.join('; '));

        // Atualizar o período com as datas de férias solicitadas
        periodo.feriasInicio = inicioISO;
        periodo.feriasFim = fimISO;
        // Calcular dias
        const dtInicio = DateUtils.parse(inicioISO);
        const dtFim = DateUtils.parse(fimISO);
        if (dtInicio && dtFim) {
            periodo.dias = Math.floor((dtFim - dtInicio) / (24 * 60 * 60 * 1000)) + 1;
        }

        if (!AppState.dados.eventos) AppState.dados.eventos = [];
        AppState.dados.eventos.push(evento);
        AppState.save();
        renderizarEventos();
        renderizarPeriodosAquisitivosTable(); // Atualizar o relatório
        try { gerarTimesheetAcordo(); } catch (e) {}
        try { atualizarDashboard(); } catch (e) {}
        mostrarAlertaGlobal('Solicitação de férias criada e período atualizado.', 'success');
    } catch (e) {
        console.error('Erro ao solicitar férias do período:', e);
        mostrarAlertaGlobal(e.message || 'Erro ao solicitar férias.', 'error');
    }
}

// Solicitar férias para todo o período aquisitivo (linha 'Único')
function solicitarFeriasGroup(periodoIndex) {
    try {
        if (!AppState.dados || !Array.isArray(AppState.dados.periodosAquisitivos)) {
            mostrarAlertaGlobal('Nenhum período salvo para solicitar férias.', 'warning');
            return;
        }
        const rows = AppState.dados.periodosAquisitivos.filter(p => p.periodoIndex === periodoIndex);
        if (!rows || rows.length === 0) {
            mostrarAlertaGlobal('Período não encontrado.', 'error');
            return;
        }
        // usar início/término do período (primeiro registro)
        const first = rows[0];
        const defaultInicioISO = first.inicio || '';
        const defaultFimISO = first.termino || '';
        
        // Exibir em formato DD/MM/AAAA
        let inicioDisplay = defaultInicioISO ? DateUtils.formatBR(defaultInicioISO) : '';
        let fimDisplay = defaultFimISO ? DateUtils.formatBR(defaultFimISO) : '';

        inicioDisplay = prompt('Data de início das férias (DD/MM/AAAA):', inicioDisplay || '');
        if (inicioDisplay === null) return;
        fimDisplay = prompt('Data de término das férias (DD/MM/AAAA):', fimDisplay || inicioDisplay || '');
        if (fimDisplay === null) return;
        
        // Converter para ISO
        const inicioISO = parseDateBR(inicioDisplay);
        const fimISO = parseDateBR(fimDisplay);
        
        if (!inicioISO || !fimISO) {
            mostrarAlertaGlobal('Datas inválidas. Use o formato DD/MM/AAAA.', 'error');
            return;
        }

        const evento = {
            tipoEvento: 'ferias',
            descricaoEvento: 'Férias',
            dataInicioEvento: inicioISO,
            dataFimEvento: fimISO,
            impactoEvento: 'folga',
            periodo: 'dia_todo',
            acordoIndex: null,
            corFundo: '#f0f8ff',
            corTexto: '#000000',
            nomeCSS: ''
        };

        const erros = Validators.validateEvento(evento);
        if (erros && erros.length) throw new Error(erros.join('; '));

        // Atualizar todos os subperíodos com as datas de férias
        const dtInicio = DateUtils.parse(inicioISO);
        const dtFim = DateUtils.parse(fimISO);
        const diasTotal = (dtInicio && dtFim) ? Math.floor((dtFim - dtInicio) / (24 * 60 * 60 * 1000)) + 1 : null;
        
        rows.forEach(p => {
            p.feriasInicio = inicioISO;
            p.feriasFim = fimISO;
            p.dias = diasTotal;
        });

        if (!AppState.dados.eventos) AppState.dados.eventos = [];
        AppState.dados.eventos.push(evento);
        AppState.save();
        renderizarEventos();
        renderizarPeriodosAquisitivosTable(); // Atualizar o relatório
        try { gerarTimesheetAcordo(); } catch (e) {}
        try { atualizarDashboard(); } catch (e) {}
        mostrarAlertaGlobal('Solicitação de férias criada e período atualizado.', 'success');
    } catch (e) {
        console.error('Erro ao solicitar férias em grupo:', e);
        mostrarAlertaGlobal(e.message || 'Erro ao solicitar férias em grupo.', 'error');
    }
}

function removerAnexo(atividadeId, index) {
    if (atividadeId) {
        const list = AppState.dados.atividades || [];
        const idx = list.findIndex(x => x.id === atividadeId);
        if (idx < 0) return;
        if (!Array.isArray(list[idx].anexos)) return;
        list[idx].anexos.splice(index,1);
        AppState.dados.atividades = list;
        AppState.save();
        abrirModalAtividade(atividadeId);
        renderizarAtividades();
        Notifications.info('Anexo removido');
    } else {
        window.__modalAnexos = window.__modalAnexos || {};
        const arr = window.__modalAnexos['new'] || [];
        arr.splice(index,1);
        window.__modalAnexos['new'] = arr;
        atualizarListaAnexosModal();
        Notifications.info('Anexo removido (modal)');
    }
}

function adicionarComentarioModal() {
    const txt = (document.getElementById('comentarioInput').value || '').trim();
    if (!txt) return;
    const modal = document.getElementById('modalAtividade');
    const editId = modal && modal.dataset.editId ? modal.dataset.editId : null;
    const comment = { id: 'cmt-' + Date.now(), texto: txt, autor: '', criadoEm: new Date().toISOString() };
    if (editId) {
        const list = AppState.dados.atividades || [];
        const idx = list.findIndex(x => x.id === editId);
        if (idx >= 0) {
            if (!Array.isArray(list[idx].comentarios)) list[idx].comentarios = [];
            list[idx].comentarios.push(comment);
            list[idx].atualizadoEm = new Date().toISOString();
            AppState.dados.atividades = list;
            AppState.save();
            abrirModalAtividade(editId);
            Notifications.success('Comentário adicionado');
        }
    } else {
        window.__modalComentarios = window.__modalComentarios || {};
        window.__modalComentarios['new'] = window.__modalComentarios['new'] || [];
        window.__modalComentarios['new'].push(comment);
        atualizarListaComentariosModal();
        Notifications.success('Comentário pronto (será salvo ao criar a atividade)');
    }
    document.getElementById('comentarioInput').value = '';
}

function atualizarListaComentariosModal() {
    const modal = document.getElementById('modalAtividade');
    const editId = modal && modal.dataset.editId ? modal.dataset.editId : null;
    const ul = document.getElementById('comentariosList');
    if (!ul) return;
    ul.innerHTML = '';
    if (editId) return; // editing handled by abrirModalAtividade
    const items = (window.__modalComentarios && window.__modalComentarios['new']) || [];
    items.forEach((c, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<div><small>${DateUtils.formatDateTime(c.criadoEm)}</small></div><div>${escapeHtml(c.texto)}</div><button class="btn-secondary btn-icon" onclick="removerComentario(null,${i})">${(typeof svgIcon === 'function')? svgIcon('trash', { title: 'Remover comentário', color: 'currentColor' }) : '🗑️'}</button>`;
        ul.appendChild(li);
    });
}

function removerComentario(atividadeId, index) {
    if (atividadeId) {
        const list = AppState.dados.atividades || [];
        const idx = list.findIndex(x => x.id === atividadeId);
        if (idx < 0) return;
        if (!Array.isArray(list[idx].comentarios)) return;
        list[idx].comentarios.splice(index,1);
        AppState.dados.atividades = list;
        AppState.save();
        abrirModalAtividade(atividadeId);
        Notifications.info('Comentário removido');
    } else {
        window.__modalComentarios = window.__modalComentarios || {};
        const arr = window.__modalComentarios['new'] || [];
        arr.splice(index,1);
        window.__modalComentarios['new'] = arr;
        atualizarListaComentariosModal();
        Notifications.info('Comentário removido (modal)');
    }
}

function editarAtividade(idOrIdx) {
    // accept id string or numeric index
    const id = idOrIdx;
    // if passed an index number, resolve to id
    const list = AppState.dados.atividades || [];
    if (typeof id === 'number') {
        const a = list[id];
        if (a) abrirModalAtividade(a.id);
        return;
    }
    abrirModalAtividade(id);
}

function removerAtividade(idOrIdx) {
    let list = AppState.dados.atividades || [];
    if (!list.length) return;
    const id = idOrIdx;
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) {
        Notifications.confirm('Deseja excluir esta atividade?', () => {
            list.splice(idx, 1);
            AppState.dados.atividades = list;
            AppState.save();
            renderizarAtividades();
        });
    }
}

function toggleAtividadesKanban() {
    AppState.dados.atividadesKanbanView = !AppState.dados.atividadesKanbanView;
    AppState.save();
    AppState.atividadesKanbanView = AppState.dados.atividadesKanbanView;
    renderizarAtividades();
    Notifications.info('Visão Kanban ' + (AppState.dados.atividadesKanbanView ? 'ativada' : 'desativada'));
}

function toggleAtividadesTable() {
    const cont = document.getElementById('atividadesTableContainer');
    if (!cont) return;
    cont.style.display = cont.style.display === 'none' || cont.style.display === '' ? 'block' : 'none';
    renderizarAtividades();
}

/**
 * Wrapper para exportação via data-action
 */
function exportarAtividadesExcelAction() {
    exportarAtividadesExcel();
}

/**
 * Wrapper para importação via data-action
 */
function importarAtividadesExcelAction() {
    importarAtividadesExcel();
}

// ============= LEMBRETES / CHECK DEADLINES =============
function checkAtividadesDeadlines() {
    try {
        const list = AppState.dados.atividades || [];
        const now = new Date();
        list.forEach(a => {
            if (!a.prazo || !a.lembreteDias) return;
            if (a.status === 'concluida') return;
            const prazo = new Date(a.prazo);
            const diffDays = Math.ceil((prazo - now) / (1000*60*60*24));
            if (diffDays <= a.lembreteDias && diffDays >= 0) {
                Notifications.warning(`Lembrete: atividade "${a.titulo}" vence em ${diffDays} dia(s)`);
            }
            if (diffDays < 0) {
                Notifications.error(`Atenção: atividade "${a.titulo}" está vencida!`);
            }
        });
    } catch (e) {
        console.error('Erro ao checar lembretes:', e);
    }
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>\"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]; });
}

document.addEventListener('DOMContentLoaded', () => {
    migrarDatasParaISO(); // Migra dados antigos para formato ISO
    inicializar();
    initDateFieldsBR(); // Inicializa campos de data com formato brasileiro
});

/**
 * Migra todas as datas salvas para o formato ISO (YYYY-MM-DD)
 * Isso garante compatibilidade com dados antigos
 */
function migrarDatasParaISO() {
    try {
        if (!AppState.dados) return;
        
        let modificado = false;
        
        // Migrar datas de atividades
        if (AppState.dados.atividades) {
            AppState.dados.atividades.forEach(a => {
                if (a.prazo && DateUtils.normalize) {
                    const normalizado = DateUtils.normalize(a.prazo);
                    if (normalizado !== a.prazo) {
                        a.prazo = normalizado;
                        modificado = true;
                    }
                }
                if (a.dataDoc && DateUtils.normalize) {
                    const normalizado = DateUtils.normalize(a.dataDoc);
                    if (normalizado !== a.dataDoc) {
                        a.dataDoc = normalizado;
                        modificado = true;
                    }
                }
            });
        }
        
        // Migrar datas de registros
        if (AppState.dados.registros) {
            AppState.dados.registros.forEach(r => {
                if (r.data && DateUtils.normalize) {
                    const normalizado = DateUtils.normalize(r.data);
                    if (normalizado !== r.data) {
                        r.data = normalizado;
                        modificado = true;
                    }
                }
            });
        }
        
        // Migrar data de admissão
        if (AppState.dados.admissao && DateUtils.normalize) {
            const normalizado = DateUtils.normalize(AppState.dados.admissao);
            if (normalizado !== AppState.dados.admissao) {
                AppState.dados.admissao = normalizado;
                modificado = true;
            }
        }
        
        if (modificado) {
            AppState.save();
            console.log('Datas migradas para formato ISO com sucesso');
        }
    } catch (e) {
        console.error('Erro ao migrar datas:', e);
    }
}

// Pergunta ao carregar a página se o usuário deseja restaurar períodos (opcional)
function perguntarRestaurarPeriodosOnLoad() {
    try {
        // Só perguntar se existem poucos ou nenhum período salvo
        if (!AppState.dados) return;
        const arr = AppState.dados.periodosAquisitivos || [];
        // Se existir menos de 3 subperíodos, sugerir restauração
        if (arr.length < 3 && AppState.dados.admissao) {
            setTimeout(() => {
                try {
                    if (confirm('Detectei poucos períodos aquisitivos salvos. Deseja restaurar os períodos a partir da data de admissão agora?')) {
                        restaurarPeriodosFromAdmissao();
                    }
                } catch (e) { /* ignore */ }
            }, 500);
        }
    } catch (e) { console.warn('Erro ao checar restauração automática de períodos:', e); }
}

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
            // Se abrirmos o timesheet, gerar automaticamente
            if (alvo === 'ponto-timesheet') {
                try { if (typeof gerarTimesheetAcordo === 'function') gerarTimesheetAcordo(); } catch(e){ console.error('Erro ao gerar timesheet ao abrir subaba:', e); }
            }
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

/**
 * Popula o filtro de acordos do dashboard
 */
function popularFiltroAcordosDashboard() {
    const select = document.getElementById('dashboardFilterAcordo');
    if (!select) return;

    select.innerHTML = '<option value="">Todos os Acordos</option>';
    
    AppState.dados.acordos.forEach((acordo, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = acordo.nome;
        select.appendChild(option);
    });
}

/**
 * Configura os event listeners dos filtros do dashboard
 */
/**
 * Popula o filtro de acordos do dashboard
 */
function popularFiltroAcordosDashboard() {
    const select = document.getElementById('dashboardFilterAcordo');
    if (!select) return;
    
    // Limpa e adiciona opção padrão
    select.innerHTML = '<option value="">Todos os acordos</option>';
    
    // Adiciona acordos ativos
    if (AppState.dados && AppState.dados.acordos && AppState.dados.acordos.length > 0) {
        AppState.dados.acordos.forEach((acordo, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = acordo.nome || `Acordo ${index + 1}`;
            select.appendChild(option);
        });
    }
}

function configurarFiltrosDashboard() {
    const periodSelect = document.getElementById('dashboardFilterPeriodo');
    if (periodSelect) {
        // Sincroniza o estado com o valor do select (importante na primeira carga)
        AppState.dashboardFilters.periodo = periodSelect.value || 'todos';
        
        periodSelect.addEventListener('change', function() {
            AppState.dashboardFilters.periodo = this.value;
            
            const customInputs = document.getElementById('customRangeInputs');
            if (customInputs) {
                if (this.value === 'customizado') {
                    customInputs.classList.add('active');
                } else {
                    customInputs.classList.remove('active');
                }
            }
            
            // Aplicar filtros ao mudar período
            atualizarDashboard();
            mostrarInfoFiltros();
        });
    }
}

/**
 * Calcula o intervalo de datas baseado no período selecionado
 */
function calcularIntervaloPeriodo(periodo) {
    const hoje = new Date();
    let inicio, fim;

    switch (periodo) {
        case 'mesAtual':
            inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
            break;
        
        case 'mesAnterior':
            inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
            fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
            break;
        
        case 'ultimosTresMeses':
            inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
            fim = hoje;
            break;
        
        case 'ultimosSeisMeses':
            inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
            fim = hoje;
            break;
        
        case 'anoAtual':
            inicio = new Date(hoje.getFullYear(), 0, 1);
            fim = new Date(hoje.getFullYear(), 11, 31);
            break;
        
        case 'customizado':
            const dataInicioInput = document.getElementById('dashboardDataInicio');
            const dataFimInput = document.getElementById('dashboardDataFim');
            if (dataInicioInput && dataInicioInput.value && dataFimInput && dataFimInput.value) {
                inicio = DateUtils.parse(dateBrToIso(dataInicioInput.value));
                fim = DateUtils.parse(dateBrToIso(dataFimInput.value));
            }
            break;
        
        case 'todos':
        default:
            return null; // Sem filtro de período
    }

    return inicio && fim ? { inicio, fim } : null;
}

/**
 * Filtra registros baseado nos filtros ativos
 */
function filtrarRegistros() {
    let registrosFiltrados = [...AppState.dados.registros];

    // Filtro por acordo
    if (AppState.dashboardFilters.acordoIndex !== null) {
        registrosFiltrados = registrosFiltrados.filter(r => {
            const calc = Calculations.calculateDayWithContext(
                AppState.dados.registros,
                AppState.dados.eventos,
                AppState.dados.acordos,
                r.data,
                r
            );
            const acordoAtivo = calc.acordo;
            const acordoIndex = AppState.dados.acordos.findIndex(a => a === acordoAtivo);
            return acordoIndex === AppState.dashboardFilters.acordoIndex;
        });
    }

    // Filtro por período
    const intervalo = calcularIntervaloPeriodo(AppState.dashboardFilters.periodo);
    if (intervalo) {
        registrosFiltrados = registrosFiltrados.filter(r => {
            // Tenta vários campos de data
            const dateStr = r.dataRegistroIso || r.data || r.dataStr || r.dataRegistro;
            const dataReg = DateUtils.parse(dateStr);
            return dataReg && dataReg >= intervalo.inicio && dataReg <= intervalo.fim;
        });
    }

    return registrosFiltrados;
}

/**
 * Aplica os filtros selecionados no dashboard
 */
function aplicarFiltrosDashboard() {
    const acordoSelect = document.getElementById('dashboardFilterAcordo');
    const periodoSelect = document.getElementById('dashboardFilterPeriodo');

    // Atualiza o estado dos filtros
    const acordoVal = acordoSelect ? acordoSelect.value : '';
    if (acordoVal === '' || acordoVal === 'todos') {
        AppState.dashboardFilters.acordoIndex = null;
    } else {
        const parsed = Number.parseInt(acordoVal, 10);
        AppState.dashboardFilters.acordoIndex = Number.isNaN(parsed) ? null : parsed;
    }
    AppState.dashboardFilters.periodo = periodoSelect.value;

    // Valida datas customizadas
    if (AppState.dashboardFilters.periodo === 'customizado') {
        const dataInicioInput = document.getElementById('dashboardDataInicio');
        const dataFimInput = document.getElementById('dashboardDataFim');
        
        if (!dataInicioInput.value || !dataFimInput.value) {
            Notifications.warning('Por favor, selecione as datas inicial e final');
            return;
        }

        const inicio = DateUtils.parse(dateBrToIso(dataInicioInput.value));
        const fim = DateUtils.parse(dateBrToIso(dataFimInput.value));

        if (inicio > fim) {
            Notifications.warning('A data inicial deve ser anterior à data final');
            return;
        }
    }

    // Recalcula o dashboard com os filtros
    atualizarDashboard();

    // Mostra informação sobre os filtros ativos
    mostrarInfoFiltros();
}

/**
 * Mostra informação sobre os filtros ativos
 */
function mostrarInfoFiltros() {
    const filterInfo = document.getElementById('filtroInfo');
    if (!filterInfo) return;

    const acordoSelect = document.getElementById('dashboardFilterAcordo');
    const periodoSelect = document.getElementById('dashboardFilterPeriodo');

    const temFiltros = AppState.dashboardFilters.acordoIndex !== null || 
                       AppState.dashboardFilters.periodo !== 'todos';

    if (!temFiltros) {
        filterInfo.classList.remove('active');
        return;
    }

    let texto = '<strong>Filtros ativos:</strong> ';
    const partes = [];

    if (AppState.dashboardFilters.acordoIndex !== null) {
        const acordo = AppState.dados.acordos[AppState.dashboardFilters.acordoIndex];
        partes.push(`Acordo: ${acordo.nome}`);
    }

    if (AppState.dashboardFilters.periodo !== 'todos') {
        const periodoTexto = periodoSelect.options[periodoSelect.selectedIndex].text;
        partes.push(`Período: ${periodoTexto}`);
    }

    texto += partes.join(' | ');
    filterInfo.innerHTML = texto;
    filterInfo.classList.add('active');
}

/**
 * Limpa todos os filtros do dashboard
 */
function limparFiltrosDashboard() {
    // Reset dos selects
    const acordoSelect = document.getElementById('dashboardFilterAcordo');
    const periodoSelect = document.getElementById('dashboardFilterPeriodo');
    const customInputs = document.getElementById('customRangeInputs');

    if (acordoSelect) acordoSelect.value = '';
    if (periodoSelect) periodoSelect.value = 'todos';
    if (customInputs) customInputs.classList.remove('active');

    // Reset dos inputs de data
    const dataInicioInput = document.getElementById('dashboardDataInicio');
    const dataFimInput = document.getElementById('dashboardDataFim');
    if (dataInicioInput) dataInicioInput.value = '';
    if (dataFimInput) dataFimInput.value = '';

    // Reset do estado
    AppState.dashboardFilters = {
        acordoIndex: null,
        periodo: 'todos',
        dataInicio: null,
        dataFim: null
    };

    // Recalcula o dashboard sem filtros
    atualizarDashboard();

    // Esconde a info de filtros
    const filterInfo = document.getElementById('filtroInfo');
    if (filterInfo) filterInfo.classList.remove('active');

    Notifications.success('Filtros limpos com sucesso');
}

function atualizarDashboard() {
    try {
        // Pega os registros filtrados
        const registrosFiltrados = filtrarRegistros();

        const totais = Calculations.calculatePeriodTotals(
            registrosFiltrados,
            AppState.dados.eventos,
            AppState.dados.acordos
        );

        document.getElementById('horasPeriodo').textContent = DateUtils.minutesToTime(totais.totalTrabalhadas);
        
        // MODIFICAÇÃO: Saldo de Banco de Horas = saldo acumulado do último registro do mês atual
        const hoje = DateUtils.parse(DateUtils.today());
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        // Encontrar o último registro do mês atual
        const registrosMes = registrosFiltrados.filter(r => {
            const d = DateUtils.parse(r.data || r.dataRegistro || r.dataStr || r.dataRegistroIso);
            return d && d >= inicioMes && d <= hoje;
        }).sort((a, b) => {
            const dA = DateUtils.parse(a.data || a.dataRegistro || a.dataStr || a.dataRegistroIso);
            const dB = DateUtils.parse(b.data || b.dataRegistro || b.dataStr || b.dataRegistroIso);
            return dB - dA; // Descending order
        });
        
        // Se há registros no mês, usar o saldo do último registro
        let saldoMes = 0;
        if (registrosMes.length > 0) {
            const ultimoRegistroMes = registrosMes[0];
            const calcUltimo = Calculations.calculateDayWithContext(
                registrosFiltrados,
                AppState.dados.eventos,
                AppState.dados.acordos,
                ultimoRegistroMes.data || ultimoRegistroMes.dataRegistro || ultimoRegistroMes.dataStr,
                ultimoRegistroMes
            );
            saldoMes = calcUltimo.saldo || 0;
        }
        
        document.getElementById('saldoBancoHoras').textContent = DateUtils.minutesToTime(saldoMes);
        
        document.getElementById('horasExtras').textContent = DateUtils.minutesToTime(totais.horasExtras);
        document.getElementById('horasAcordo').textContent = DateUtils.minutesToTime(totais.horasAcordo);

        // KPIs essenciais
        const diasTrabalhados = new Set(registrosFiltrados.map(r => r.data || r.dataRegistro || r.dataStr)).size;
        const mediaDiariaMin = diasTrabalhados > 0 ? Math.round(totais.totalTrabalhadas / diasTrabalhados) : 0;
        const mediaHorasDiaEl = document.getElementById('mediaHorasDia');
        if (mediaHorasDiaEl) mediaHorasDiaEl.textContent = DateUtils.minutesToTime(mediaDiariaMin);
        const diasTrabalhadosEl = document.getElementById('diasTrabalhados');
        if (diasTrabalhadosEl) diasTrabalhadosEl.textContent = diasTrabalhados.toString();

        // Tendência 30d
        const start30 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 29);
        const start60 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 59);
        const endPrev = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 30);

        const registros30 = registrosFiltrados.filter(r => {
            const d = DateUtils.parse(r.data || r.dataRegistro || r.dataStr || r.dataRegistroIso);
            return d && d >= start30 && d <= hoje;
        });
        const registrosPrev30 = registrosFiltrados.filter(r => {
            const d = DateUtils.parse(r.data || r.dataRegistro || r.dataStr || r.dataRegistroIso);
            return d && d >= start60 && d <= endPrev;
        });

        const totals30 = Calculations.calculatePeriodTotals(registros30, AppState.dados.eventos, AppState.dados.acordos);
        const totalsPrev30 = Calculations.calculatePeriodTotals(registrosPrev30, AppState.dados.eventos, AppState.dados.acordos);

        const saldo30El = document.getElementById('saldo30d');
        if (saldo30El) saldo30El.textContent = DateUtils.minutesToTime(totals30.totalSaldo);

        const diff = totals30.totalSaldo - totalsPrev30.totalSaldo;
        const tendenciaEl = document.getElementById('tendenciaSaldo');
        if (tendenciaEl) {
            const sign = diff > 0 ? '+' : '';
            tendenciaEl.textContent = `${sign}${DateUtils.minutesToTime(diff)} vs 30d ant.`;
            tendenciaEl.style.color = diff >= 0 ? 'var(--positive)' : 'var(--negative)';
        }
        
        // Atualiza os gráficos com os dados filtrados
        if (typeof renderAnalytics === 'function') {
            renderAnalytics();
        }

        // --- FÉRIAS: resumo e avisos ---
        try {
            function computeVacationOverview(eventos, acordos) {
                const today = DateUtils.parse(DateUtils.today());
                const msDay = 24 * 60 * 60 * 1000;

                const ferias = (Array.isArray(eventos) ? eventos : []).filter(e => String(e.tipoEvento).toLowerCase() === 'ferias')
                    .map(e => {
                        const start = DateUtils.parse(e.dataInicioEvento || e.inicio || e.dataInicio || '');
                        const end = DateUtils.parse(e.dataFimEvento || e.fim || e.dataFim || '');
                        const days = (start && end) ? (Math.floor((end - start) / msDay) + 1) : 0;
                        return { raw: e, start, end, days };
                    }).filter(f => f.start && f.end)
                    .sort((a,b) => a.start - b.start);

                const upcoming = ferias.filter(f => f.end >= today);
                const next = upcoming.find(f => f.start >= today) || upcoming[0] || null;
                const daysUntilNext = next ? Math.max(0, Math.ceil((next.start - today) / msDay)) : null;

                // Função auxiliar para calcular dias sobrepostos
                function overlapDays(aStart,aEnd,bStart,bEnd){
                    const s = aStart > bStart ? aStart : bStart;
                    const e = aEnd < bEnd ? aEnd : bEnd;
                    if (!s || !e || e < s) return 0;
                    return Math.floor((e - s) / msDay) + 1;
                }

                // Procurar pelo PERÍODO MAIS ANTIGO que ainda tem dias disponíveis
                let acquisitionStart = null, acquisitionEnd = null, acquisitionAcordo = null;
                let bestPeriod = null; // Melhor período encontrado (mais antigo com dias)
                
                try {
                    // Limpar períodos duplicados/inválidos primeiro
                    limparPeriodosInvalidos();
                    
                    // Iterar por TODOS os períodos aquisitivos em ordem (mais antigo primeiro)
                    // MAS apenas aqueles que ainda não expiraram (termino >= hoje)
                    const periodosOrdenados = (AppState.dados?.periodosAquisitivos || [])
                        .filter(p => p.inicio && p.termino)
                        .filter(p => {
                            const pe = DateUtils.parse(p.termino);
                            return pe && pe >= today; // Apenas períodos ainda válidos
                        })
                        .sort((a, b) => {
                            const aStart = DateUtils.parse(a.inicio);
                            const bStart = DateUtils.parse(b.inicio);
                            return aStart - bStart; // Ordem crescente (mais antigo primeiro)
                        });
                    
                    for (let p of periodosOrdenados) {
                        try {
                            const ps = DateUtils.parse(p.inicio);
                            const pe = DateUtils.parse(p.termino);
                            
                            if (!ps || !pe) continue;
                            
                            // Contar dias de férias já marcadas NESTE período
                            let scheduledDaysInThisPeriod = 0;
                            ferias.forEach(f => {
                                const overlap = overlapDays(f.start, f.end, ps, pe);
                                if (overlap > 0) {
                                    scheduledDaysInThisPeriod += overlap;
                                }
                            });
                            
                            // Calcular dias restantes (assumindo 30 dias de direito)
                            const entitlementDays = 30;
                            const remainingDaysInPeriod = Math.max(0, entitlementDays - scheduledDaysInThisPeriod);
                            
                            
                            // Se este período tem dias disponíveis E é o primeiro a ter (mais antigo)
                            if (remainingDaysInPeriod > 0 && !bestPeriod) {
                                bestPeriod = {
                                    start: ps,
                                    end: pe,
                                    entitlement: entitlementDays,
                                    scheduled: scheduledDaysInThisPeriod,
                                    remaining: remainingDaysInPeriod
                                };
                                // Encontrou o mais antigo, pode sair do loop
                                break;
                            }
                        } catch (err) {
                            console.warn('Erro ao processar período:', err);
                        }
                    }
                } catch (err) {
                    console.warn('Erro ao determinar acordo para período aquisitivo', err);
                }
                
                // Sempre pegar o acordo para referência
                try {
                    acquisitionAcordo = Calculations.getAcordoByData(acordos, DateUtils.today());
                } catch (err) {
                    console.warn('Erro ao pegar acordo', err);
                }

                // Se encontrou um período com dias disponíveis, usar esse
                if (bestPeriod) {
                    acquisitionStart = bestPeriod.start;
                    acquisitionEnd = bestPeriod.end;
                } else {
                    // Fallback: período que contém hoje
                    try {
                        acquisitionAcordo = Calculations.getAcordoByData(acordos, DateUtils.today());
                        if (acquisitionAcordo && Array.isArray(acquisitionAcordo.periodos)) {
                            const p = acquisitionAcordo.periodos.find(p => {
                                const ps = DateUtils.parse(p.inicio);
                                const pe = DateUtils.parse(p.fim || p.termino || p.inicio);
                                return ps && pe && ps <= today && pe >= today;
                            });
                            if (p) {
                                acquisitionStart = DateUtils.parse(p.inicio);
                                acquisitionEnd = DateUtils.parse(p.fim || p.termino || p.inicio);
                            }
                        }
                    } catch (err) {
                        console.warn('Erro ao determinar período atual', err);
                    }

                    // Fallback final: últimos 12 meses
                    if (!acquisitionStart) {
                        acquisitionEnd = today;
                        acquisitionStart = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
                    }
                }

                // Sum scheduled vacation days inside acquisition period
                let scheduledDaysInPeriod = 0;
                const scheduledList = [];
                ferias.forEach(f => {
                    const overlap = overlapDays(f.start, f.end, acquisitionStart, acquisitionEnd);
                    if (overlap > 0) {
                        scheduledDaysInPeriod += overlap;
                    }
                    scheduledList.push({start: f.start, end: f.end, days: f.days});
                });

                // Default entitlement (configurable later): 30 days
                const entitlement = 30;
                const remaining = Math.max(0, entitlement - scheduledDaysInPeriod);

                return {
                    next,
                    daysUntilNext,
                    acquisitionStart,
                    acquisitionEnd,
                    scheduledDaysInPeriod,
                    remaining,
                    scheduledList,
                    entitlement,
                    acquisitionAcordo
                };
            }

            const overview = computeVacationOverview(AppState.dados.eventos, AppState.dados.acordos);

            // Update DOM (guarded)
            const nextInfo = document.getElementById('nextVacationInfo');
            const warningEl = document.getElementById('vacationWarning');
            const acqInfo = document.getElementById('acquisitionInfo');
            const remInfo = document.getElementById('remainingVacationDays');
            const schedListEl = document.getElementById('scheduledVacationsList');
            const usedDaysEl = document.getElementById('usedVacationDays');
            const statusEl = document.getElementById('vacationStatus');

            if (nextInfo) {
                if (overview.next) {
                    const startStr = DateUtils.formatBR(overview.next.start);
                    const endStr = DateUtils.formatBR(overview.next.end);
                    const days = overview.next.days;
                    const untilText = overview.daysUntilNext === 0 ? 'começa hoje' : `${overview.daysUntilNext} dia(s)`;
                    nextInfo.textContent = `${startStr} → ${endStr} (${days} dia(s)) — em ${untilText}`;
                } else {
                    nextInfo.textContent = 'Nenhuma férias agendada';
                }
            }

            if (warningEl) {
                if (overview.daysUntilNext !== null && overview.daysUntilNext <= 14) {
                    warningEl.style.display = 'block';
                    warningEl.textContent = `Atenção: próxima férias em ${overview.daysUntilNext} dia(s)`;
                } else {
                    warningEl.style.display = 'none';
                    warningEl.textContent = '';
                }
            }

            if (acqInfo) {
                const start = overview.acquisitionStart ? DateUtils.formatBR(overview.acquisitionStart) : '-';
                const end = overview.acquisitionEnd ? DateUtils.formatBR(overview.acquisitionEnd) : '-';
                const acordName = overview.acquisitionAcordo ? ` (Acordo: ${overview.acquisitionAcordo.nome || '—'})` : '';
                acqInfo.textContent = `${start} → ${end}${acordName}`;
            }

            if (remInfo) {
                remInfo.textContent = `${overview.remaining} / ${overview.entitlement} dia(s)`;
            }

            if (schedListEl) {
                if (overview.scheduledList.length) {
                    // Use a non-breaking separator instead of HTML <br> so cells don't wrap
                    schedListEl.textContent = overview.scheduledList.map(s => `${DateUtils.formatBR(s.start)} → ${DateUtils.formatBR(s.end)} (${s.days}d)`).join(' • ');
                } else {
                    schedListEl.textContent = '-';
                }
            }

            // Adicionar novos campos
            if (usedDaysEl) {
                const usedDays = overview.entitlement - overview.remaining;
                usedDaysEl.textContent = `${usedDays} / ${overview.entitlement} dia(s)`;
            }

            if (statusEl) {
                let status = '✅ OK';
                let statusColor = 'var(--positive)';
                
                if (overview.remaining <= 0) {
                    status = '⚠️ Sem dias';
                    statusColor = 'var(--negative)';
                } else if (overview.remaining <= 5) {
                    status = '⚡ Poucos dias';
                    statusColor = 'var(--warning)';
                } else if (overview.daysUntilNext !== null && overview.daysUntilNext <= 7) {
                    status = '📅 Férias próximas';
                    statusColor = 'var(--info)';
                }
                
                statusEl.textContent = status;
                statusEl.style.color = statusColor;
            }
        } catch (err) {
            console.warn('Erro ao calcular/atualizar resumo de férias:', err);
        }
        
        // Atualizar Abono e Horas a Pagar no dashboard
        try {
            const abonoEl = document.getElementById('dashboardAbono');
            const horasEl = document.getElementById('dashboardHorasPagar');
            
            if (abonoEl || horasEl) {
                // Buscar o acordo vigente (mais recente ou com período atual)
                const hoje = DateUtils.today();
                let acordoAtual = null;
                let acordoIndex = -1;
                
                // Tentar encontrar acordo que cobre a data atual
                AppState.dados.acordos.forEach((ac, idx) => {
                    if (ac.periodos && ac.periodos.length > 0) {
                        const periodoAtivo = ac.periodos.find(p => {
                            const inicio = DateUtils.parse(p.dataInicio);
                            const fim = DateUtils.parse(p.dataFim);
                            return inicio && fim && hoje >= inicio && hoje <= fim;
                        });
                        if (periodoAtivo) {
                            acordoAtual = ac;
                            acordoIndex = idx;
                        }
                    }
                });
                
                // Se não encontrou por período, usar o mais recente
                if (!acordoAtual && AppState.dados.acordos.length > 0) {
                    acordoIndex = AppState.dados.acordos.length - 1;
                    acordoAtual = AppState.dados.acordos[acordoIndex];
                }
                
                if (acordoAtual) {
                    const uso = calcularUsoBeneficiosAcordo(acordoIndex, acordoAtual);
                    const totalAbono = uso.usadoAbono + uso.restanteAbono;
                    const totalHoras = uso.usadoPagarHora + uso.restantePagarHora;
                    
                    if (abonoEl) {
                        abonoEl.textContent = `${uso.usadoAbono} / ${totalAbono}`;
                    }
                    if (horasEl) {
                        horasEl.textContent = `${uso.usadoPagarHora}h / ${totalHoras}h`;
                    }
                } else {
                    if (abonoEl) abonoEl.textContent = '-';
                    if (horasEl) horasEl.textContent = '-';
                }
            }
        } catch (err) {
            console.warn('Erro ao calcular abono/horas no dashboard:', err);
        }
        
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

            // Mostrar período marcado no registro (curto)
            let periodoDisplay = '';
            if (r.periodoEvento) {
                switch (r.periodoEvento) {
                    case 'matutino': periodoDisplay = '☀️ Mat.'; break;
                    case 'vespertino': periodoDisplay = '🌙 Ves.'; break;
                    case 'dia_todo': periodoDisplay = '⛶ Todo'; break;
                    default: periodoDisplay = r.periodoEvento;
                }
            }

            const colunas = [
                { content: DateUtils.formatBR(r.data), className: '' },
                { content: r.entrada || '', className: '' },
                { content: r.saidaAlmoco || '', className: '' },
                { content: r.retornoAlmoco || '', className: '' },
                { content: r.saida || '', className: '' },
                { content: periodoDisplay, className: '' },
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
            btnEdit.className = 'btn-secondary btn-icon';
            btnEdit.setAttribute('title', 'Editar registro');
            btnEdit.innerHTML = (typeof svgIcon === 'function')? svgIcon('edit', { title: 'Editar registro', color: 'currentColor' }) : '✏️';
            btnEdit.addEventListener('click', () => editarRegistro(r._idx));
            tdActions.appendChild(btnEdit);

            const btnDel = document.createElement('button');
            btnDel.type = 'button';
            btnDel.className = 'btn-error btn-icon';
            btnDel.setAttribute('title', 'Deletar registro');
            btnDel.innerHTML = (typeof svgIcon === 'function')? svgIcon('trash', { title: 'Remover', color: 'currentColor' }) : '🗑️';
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
    const per = document.getElementById('registroPeriodoEvento');
    if (per) per.value = '';
    const tipoReg = document.getElementById('registroTipoEvento');
    if (tipoReg && AppState.dados.tiposEvento && AppState.dados.tiposEvento.length > 0) {
        tipoReg.value = AppState.dados.tiposEvento[0].id;
    }
    const criarChk = document.getElementById('registroCriarEvento');
    if (criarChk) criarChk.checked = true;
    document.getElementById('modalRegistro').classList.add('active');
}

function fecharModalRegistro() {
    document.getElementById('modalRegistro').classList.remove('active');
}

/**
 * Abre o modal de registro para um dia específico do timesheet.
 * Preenche campos se já houver registro e foca no campo desejado.
 * @param {string} dataStr - Data no formato YYYY-MM-DD
 * @param {('entrada'|'saidaAlmoco'|'retornoAlmoco'|'saida'|null)} focusField
 */
function abrirEdicaoDiaTimesheet(dataStr, focusField = null) {
    try {
        const r = AppState.dados.registros.find(x => x.data === dataStr) || null;

        // Preencher/limpar campos
        document.getElementById('dataRegistro').value = dateIsoToBr(dataStr);
        document.getElementById('entradaRegistro').value = (r && r.entrada) || '';
        document.getElementById('saidaAlmocoRegistro').value = (r && r.saidaAlmoco) || '';
        document.getElementById('retornoAlmocoRegistro').value = (r && r.retornoAlmoco) || '';
        document.getElementById('saidaRegistro').value = (r && r.saida) || '';
        document.getElementById('observacoesRegistro').value = (r && r.observacoes) || '';
        const perSel = document.getElementById('registroPeriodoEvento');
        if (perSel) perSel.value = (r && r.periodoEvento) || '';
        const tipoRegSel = document.getElementById('registroTipoEvento');
        if (tipoRegSel) tipoRegSel.value = (r && r.tipoEventoRegistro) || (AppState.dados.tiposEvento && AppState.dados.tiposEvento[0] && AppState.dados.tiposEvento[0].id) || '';
        const criarChk = document.getElementById('registroCriarEvento');
        if (criarChk) criarChk.checked = (r && typeof r.createLinkedEvent !== 'undefined') ? Boolean(r.createLinkedEvent) : true;

        document.getElementById('modalRegistro').classList.add('active');

        // Focar campo solicitado
        const fieldIdMap = {
            entrada: 'entradaRegistro',
            saidaAlmoco: 'saidaAlmocoRegistro',
            retornoAlmoco: 'retornoAlmocoRegistro',
            saida: 'saidaRegistro',
            observacoes: 'observacoesRegistro'
        };
        if (focusField && fieldIdMap[focusField]) {
            const el = document.getElementById(fieldIdMap[focusField]);
            if (el) el.focus();
        }
    } catch (error) {
        console.error('Erro ao abrir edição de dia no timesheet:', error);
        Notifications.error('Erro ao abrir edição: ' + error.message);
    }
}
function salvarRegistro() {
    try {
        const data = dateBrToIso(document.getElementById('dataRegistro').value);
        const entrada = document.getElementById('entradaRegistro').value;
        const saidaAlmoco = document.getElementById('saidaAlmocoRegistro').value;
        const retornoAlmoco = document.getElementById('retornoAlmocoRegistro').value;
        const saida = document.getElementById('saidaRegistro').value;
        const observacoes = document.getElementById('observacoesRegistro').value;
        const periodoEvento = document.getElementById('registroPeriodoEvento') ? document.getElementById('registroPeriodoEvento').value : '';
        const tipoEventoRegistro = document.getElementById('registroTipoEvento') ? document.getElementById('registroTipoEvento').value : '';
        const createLinkedEvent = document.getElementById('registroCriarEvento') ? Boolean(document.getElementById('registroCriarEvento').checked) : true;

        const registro = { data, entrada, saidaAlmoco, retornoAlmoco, saida, observacoes, periodoEvento, tipoEventoRegistro, createLinkedEvent };

        // Validar
        const erros = Validators.validateRegistro(registro);
        if (erros.length > 0) {
            Notifications.error(erros.join(' • '));
            return;
        }

        // Salvar ou atualizar registro
        const idxExistente = AppState.dados.registros.findIndex(r => r.data === data);
        if (idxExistente >= 0) {
            AppState.dados.registros[idxExistente] = registro;
        } else {
            AppState.dados.registros.push(registro);
        }

        // Gerenciar evento persistente vinculado ao registro (opção A)
        // Identifica evento por propriedade `linkedRegistroDate`
        const findLinkedIndex = () => AppState.dados.eventos.findIndex(ev => ev.linkedRegistroDate === data);
        const linkedIdx = findLinkedIndex();

        // Determinar índice de acordo aplicável para o dia
        let acordoIndexForDay = null;
        try {
            const acordoObj = Calculations.getAcordoByData(AppState.dados.acordos, data);
            if (acordoObj) acordoIndexForDay = AppState.dados.acordos.indexOf(acordoObj);
        } catch (e) {
            acordoIndexForDay = null;
        }

        if (periodoEvento && createLinkedEvent) {
            const descricao = observacoes || `Registro: ${periodoEvento}`;
            const tipoValido = (AppState.dados.tiposEvento || []).some(t => t.id === tipoEventoRegistro) ? tipoEventoRegistro : 'outro';
            const novoEvento = {
                tipoEvento: tipoValido,
                descricaoEvento: descricao,
                dataInicioEvento: data,
                dataFimEvento: data,
                impactoEvento: 'trabalho',
                acordoIndex: acordoIndexForDay,
                corFundo: '#f3f4f6',
                corTexto: '#374151',
                nomeCSS: 'evento-registro',
                periodo: periodoEvento,
                linkedRegistroDate: data
            };

            if (linkedIdx >= 0) {
                AppState.dados.eventos[linkedIdx] = { ...AppState.dados.eventos[linkedIdx], ...novoEvento };
            } else {
                AppState.dados.eventos.push(novoEvento);
            }
            console.debug('salvarRegistro - criado/atualizado evento vinculado:', novoEvento, 'linkedIdx:', linkedIdx);
        } else {
            // Se opção de criar evento está desmarcada ou periodo removido, remover evento vinculado (se existir)
            if (linkedIdx >= 0) {
                AppState.dados.eventos.splice(linkedIdx, 1);
            }
        }

        console.debug('salvarRegistro - registro salvo:', registro);
        AppState.save();
        atualizarDashboard();
        renderizarTabelaRegistros();
        gerarTimesheetAcordo(); // Atualiza timesheet automaticamente
        fecharModalRegistro();
        Notifications.success('✅ Registro salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar registro:', error);
        Notifications.error('Erro ao salvar: ' + error.message);
    }
}

function editarRegistro(index) {
    try {
        const r = AppState.dados.registros[index];
        if (!r) throw new Error('Registro não encontrado');

        document.getElementById('dataRegistro').value = dateIsoToBr(r.data);
        document.getElementById('entradaRegistro').value = r.entrada || '';
        document.getElementById('saidaAlmocoRegistro').value = r.saidaAlmoco || '';
        document.getElementById('retornoAlmocoRegistro').value = r.retornoAlmoco || '';
        document.getElementById('saidaRegistro').value = r.saida || '';
        document.getElementById('observacoesRegistro').value = r.observacoes || '';
        const perSel = document.getElementById('registroPeriodoEvento');
        if (perSel) perSel.value = r.periodoEvento || '';

        document.getElementById('modalRegistro').classList.add('active');
    } catch (error) {
        console.error('Erro ao editar registro:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function excluirRegistro(index) {
    try {
        Notifications.confirm(
            'Deseja realmente excluir este registro?',
            () => {
                // Antes de remover registro, também remover evento persistente vinculado (se existir)
                const reg = AppState.dados.registros[index];
                if (reg && reg.data) {
                    const evIdx = AppState.dados.eventos.findIndex(ev => ev.linkedRegistroDate === reg.data);
                    if (evIdx >= 0) AppState.dados.eventos.splice(evIdx, 1);
                }

                AppState.dados.registros.splice(index, 1);
                Storage.saveDebounced(AppState.dados);
                atualizarDashboard();
                renderizarTabelaRegistros();
                gerarTimesheetAcordo(); // Atualiza timesheet automaticamente
                Notifications.success('🗑️ Registro deletado.');
            }
        );
    } catch (error) {
        console.error('Erro ao excluir registro:', error);
        Notifications.error('Erro ao deletar: ' + error.message);
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

    // Seleciona automaticamente o acordo mais recente (por maior data de fim nos períodos
    // ou por ano final no nome) e gera o timesheet
    try {
        if (AppState.dados.acordos.length) {
            function _parseDateLocal(s) {
                if (!s) return null;
                const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
                const d = new Date(s);
                return isNaN(d.getTime()) ? null : d;
            }

            let bestIdx = 0;
            let bestScore = -Infinity;
            AppState.dados.acordos.forEach((ac, i) => {
                let score = -Infinity;
                if (ac.periodos && ac.periodos.length) {
                    let maxEnd = null;
                    ac.periodos.forEach(p => {
                        const d = _parseDateLocal(p.fim || p.inicio);
                        if (d && (!maxEnd || d > maxEnd)) maxEnd = d;
                    });
                    if (maxEnd) score = Math.max(score, maxEnd.getTime());
                }
                if (!isFinite(score) && ac.nome) {
                    const m = String(ac.nome).match(/(\d{4})\s*[-\/]\s*(\d{4})/);
                    if (m) {
                        const endYear = Number(m[2]) || Number(m[1]);
                        if (!isNaN(endYear)) score = Math.max(score, endYear * 365 * 24 * 3600 * 1000);
                    }
                }
                if (!isFinite(score)) score = i;
                if (score > bestScore) {
                    bestScore = score; bestIdx = i;
                }
            });

            select.value = String(bestIdx);
            if (typeof gerarTimesheetAcordo === 'function') gerarTimesheetAcordo();
        }
    } catch (err) {
        console.warn('Erro ao selecionar acordo mais recente automaticamente:', err);
    }
    
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
            Notifications.error('Elemento de seleção de acordo não encontrado.');
            return;
        }

        const idx = Number(select.value);
        if (isNaN(idx) || !AppState.dados.acordos[idx]) {
            Notifications.warning('Selecione um acordo válido.');
            return;
        }

        const acordo = AppState.dados.acordos[idx];
        if (!acordo.periodos || !acordo.periodos.length) {
            Notifications.warning('Acordo sem períodos de compensação.');
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
            // marcar com ano/mês para facilitar navegação ao mês atual
            wrapper.dataset.year = ano;
            wrapper.dataset.month = mes;

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

            const numRows = 10;
            const labels = [
                'Entrada',
                'Saída (Almoço)',
                'Duração (Almoço)',
                'Retorno (Almoço)',
                'Saída',
                '',
                'Observações',
                'Ponto da Saída',
                'Horas Trabalhadas',
                'Saldo do Dia'
            ];

            const eventos = dias.map(d => {
                const reg = mapaReg[d.dataStr];
                const evFromData = Calculations.getEventoByData(AppState.dados.eventos, d.dataStr);

                // Se existe um registro com periodo marcado e o usuário permitiu a marcação (ou não definiu a preferência),
                // criamos/mesclamos um evento sintético que prioriza o periodo do evento persistente quando disponível,
                // caso contrário usa o periodo vindo do registro.
                if (reg && reg.periodoEvento && (typeof reg.createLinkedEvent === 'undefined' || reg.createLinkedEvent)) {
                    const periodoFinal = (evFromData && evFromData.periodo) ? evFromData.periodo : reg.periodoEvento;

                    const tipoEscolhido = (reg.tipoEventoRegistro && (AppState.dados.tiposEvento || []).some(t => t.id === reg.tipoEventoRegistro))
                        ? reg.tipoEventoRegistro
                        : (evFromData && evFromData.tipoEvento) ? evFromData.tipoEvento : 'outro';

                    const tipoInfo = (AppState.dados.tiposEvento || []).find(t => t.id === tipoEscolhido) || null;

                        return {
                            tipoEvento: tipoEscolhido,
                            descricaoEvento: reg.observacoes || (evFromData && evFromData.descricaoEvento) || 'Evento (registro)',
                            periodo: periodoFinal,
                            impactoEvento: (evFromData && evFromData.impactoEvento) ? evFromData.impactoEvento : 'trabalho',
                            corFundo: (evFromData && evFromData.corFundo) ? evFromData.corFundo : (tipoInfo ? tipoInfo.cor : undefined),
                            corTexto: (evFromData && evFromData.corTexto) ? evFromData.corTexto : (tipoInfo ? (tipoInfo.corTexto || '#ffffff') : undefined)
                        };
                }

                // Se não houver registro com marcação, retorna o evento persistente (se houver)
                return evFromData;
            });
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
                    // Eventos do tipo "compensar_acordo" devem permitir preenchimento normal.
                    // Não tratar `impactoEvento === 'trabalho'` como bloqueador — eventos de trabalho
                    // (criados a partir de registro) ainda devem renderizar blocos parciais quando tiverem `periodo`.
                    const isCompensar = ev && (
                        ev.tipoEvento === 'compensar_acordo' ||
                        ev.tipoEvento === 'compensacao_acordo' ||
                        ev.tipoEvento === 'compensação_acordo'
                    );

                    // Evento com bloqueio visual (exceto compensar_acordo, que deve permitir registro)
                    if (ev && !isCompensar) {
                        // Suporta marcação de período parcial do evento (matutino/vespertino/dia todo)
                        const periodoEv = (ev.periodo || 'dia_todo');
                        let startRow = 0;
                        let span = numRows;
                        // Mapear períodos para as linhas específicas do timesheet
                        // original behavior: matutino cobre Entrada..Retorno (linhas 0..3), vespertino Retorno..separador (3..5)
                        if (periodoEv === 'matutino') {
                            startRow = 0; // Entrada .. Retorno (0..3)
                            span = 4;
                        } else if (periodoEv === 'vespertino') {
                            startRow = 3; // Retorno .. separador (3..5)
                            span = 3;
                        } else {
                            startRow = 0;
                            span = numRows;
                        }

                        // Criar célula vertical apenas na primeira linha do período
                        if (!eventoSpanCriado[colIdx] && rowIndex === startRow) {
                            const td = document.createElement('td');
                            td.rowSpan = span;

                            let classeEvento = 'evento-outro';
                            switch (ev.tipoEvento) {
                                case 'feriado': classeEvento = 'evento-feriado'; break;
                                case 'ferias': classeEvento = 'evento-ferias'; break;
                                case 'afastamento': classeEvento = 'evento-afastamento'; break;
                                case 'viagem': classeEvento = 'evento-viagem'; break;
                                case 'abono_acordo': classeEvento = 'evento-abono-acordo'; break;
                            }

                            td.className = `${classeEvento} evento-vertical evento-periodo-${periodoEv}`;
                            // Para eventos de férias, exibir apenas "Férias"
                            if (ev.tipoEvento === 'ferias') {
                                td.textContent = 'Férias';
                            } else {
                                td.textContent = ev.descricaoEvento || ev.tipoEvento;
                            }

                            tr.appendChild(td);
                            eventoSpanCriado[colIdx] = true;

                            if (ev.tipoEvento === 'feriado') {
                                totalFeriados++;
                            }
                        }

                        // Se a linha atual pertence ao intervalo coberto pelo evento, pular renderização normal
                        if (rowIndex >= startRow && rowIndex < (startRow + span)) {
                            return;
                        }
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
                    if (rowIndex === 5) {
                        // Separador vazio
                        td.textContent = '';
                    }
                    if (rowIndex === 6) {
                        // Observações: editável — permitir quebras de linha
                        td.textContent = r && r.observacoes || '';
                        td.classList.add('ts-clickable');
                        td.classList.add('timesheet-observacao');
                        td.title = 'Clique para editar observações';
                        td.addEventListener('click', () => abrirEdicaoDiaTimesheet(dia.dataStr, 'observacoes'));
                    }
                    if (rowIndex === 7) {
                        // Ponto da Saída: entrada + duração almoço + expediente (8h) + minutos extras do acordo
                        if (r && r.entrada) {
                            const calc = obterCalcDia(dia);
                            if (calc && calc.acordo) {
                                // Buscar regra de horário para obter duração do almoço
                                const regra = calc.regra || {};
                                const duracaoAlmoco = regra.duracaoAlmoco || 60; // padrão 60 minutos
                                
                                // Buscar minutos extras do acordo (minutosExtras no período)
                                const periodo = (calc.acordo.periodos || []).find(p => {
                                    const ini = DateUtils.parse(p.inicio);
                                    const fim = DateUtils.parse(p.fim);
                                    return ini && fim && dia.data >= ini && dia.data <= fim;
                                });
                                const minutosExtrasAcordo = (periodo && periodo.minutosExtras) || 0;
                                
                                // Cálculo: entrada + almoço + expediente (8h = 480min) + extras do acordo
                                const entrada = DateUtils.timeToMinutes(r.entrada);
                                if (entrada !== null) {
                                    const expediente = 480; // 8 horas fixas
                                    const pontoDaSaida = entrada + duracaoAlmoco + expediente + minutosExtrasAcordo;
                                    td.textContent = DateUtils.minutesToTime(pontoDaSaida);
                                }
                            }
                        }
                    }

                    // Tornar células de horário clicáveis para edição
                    const focusByRow = {
                        0: 'entrada',
                        1: 'saidaAlmoco',
                        2: null, // duração não é editável diretamente
                        3: 'retornoAlmoco',
                        4: 'saida'
                    };
                    if ([0,1,2,3,4].includes(rowIndex)) {
                        td.classList.add('ts-clickable');
                        td.title = 'Clique para editar este dia';
                        td.addEventListener('click', () => abrirEdicaoDiaTimesheet(dia.dataStr, focusByRow[rowIndex]));
                    }

                    if (rowIndex === 8 || rowIndex === 9) {
                        const calc = obterCalcDia(dia);

                        if (calc && calc.temRegistro) {
                            if (rowIndex === 8) {
                                td.textContent = DateUtils.minutesToTime(calc.trabalhadas);
                                if (calc.status === 'extra') td.classList.add('saldo-positivo');
                                if (calc.status === 'falta') td.classList.add('saldo-negativo');
                            } else if (rowIndex === 9) {
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
            // Exibir saldo anterior somente se TODO o mês anterior estiver preenchido
            (function(){
                try {
                    const prevDate = new Date(ano, mes, 0); // último dia do mês anterior
                    const prevYear = prevDate.getFullYear();
                    const prevMonth = prevDate.getMonth();
                    const lastDayPrev = prevDate.getDate();
                    let prevComplete = true;
                    for (let d = 1; d <= lastDayPrev; d++) {
                        const iso = `${prevYear}-${String(prevMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                        const reg = mapaReg[iso];
                        const dateObj = new Date(prevYear, prevMonth, d);
                        const dow = dateObj.getDay();
                        // Considera fins de semana como preenchidos automaticamente
                        if (dow === 0 || dow === 6) continue;

                        // Se existir registro com algum horário preenchido, ok
                        if (reg && (reg.entrada || reg.saida || reg.saidaAlmoco || reg.retornoAlmoco)) continue;

                        // Caso exista evento que torne o dia não-trabalho (feriado/abono/afastamento/ferias), considerar preenchido
                        try {
                            const ev = Calculations.getEventoByData(AppState.dados.eventos, iso);
                            const nonWorkingTypes = ['feriado','ferias','afastamento','abono_acordo','abono','folga'];
                            if (ev) {
                                if ((ev.impactoEvento && ev.impactoEvento !== 'trabalho') || (ev.tipoEvento && nonWorkingTypes.includes(ev.tipoEvento))) {
                                    continue; // dia aceito como preenchido
                                }
                            }
                        } catch (ee) { /* ignore and treat as not filled */ }

                        // Se chegou aqui, não está preenchido
                        prevComplete = false;
                        break;
                    }
                    if (prevComplete) {
                        tdSaldoAnteriorMes.textContent = DateUtils.minutesToTime(saldoAnterior);
                        if (saldoAnterior > 0) tdSaldoAnteriorMes.classList.add('saldo-positivo');
                        if (saldoAnterior < 0) tdSaldoAnteriorMes.classList.add('saldo-negativo');
                    } else {
                        // deixar em branco até o mês anterior estar completo
                        tdSaldoAnteriorMes.textContent = '';
                    }
                } catch (e) {
                    // Em caso de erro, mostrar o valor como fallback
                    tdSaldoAnteriorMes.textContent = DateUtils.minutesToTime(saldoAnterior);
                    if (saldoAnterior > 0) tdSaldoAnteriorMes.classList.add('saldo-positivo');
                    if (saldoAnterior < 0) tdSaldoAnteriorMes.classList.add('saldo-negativo');
                }
            })();
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
        
        // Após gerar todos os meses, rolar automaticamente para o mês atual
        try {
            const now = new Date();
            const cur = content.querySelector(`.timesheet-mes[data-year="${now.getFullYear()}"][data-month="${now.getMonth()}"]`);
            if (cur) {
                // adicionar classe para possível destaque visual
                cur.classList.add('timesheet-current');
                // rolar ao elemento (suave quando suportado)
                cur.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (e) {
            // não crítico — evitar quebrar renderização
            console.warn('Não foi possível rolar para o mês atual no timesheet:', e);
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

// Sincroniza um evento do tipo 'ferias' com os períodos aquisitivos salvos
function sincronizarFeriasComPeriodos(evento) {
    try {
        if (!evento || !evento.dataInicioEvento) return;
        const evStart = DateUtils.parse(evento.dataInicioEvento);
        const evEnd = DateUtils.parse(evento.dataFimEvento || evento.dataInicioEvento);
        if (!evStart || !evEnd) return;
        const msDay = 24 * 60 * 60 * 1000;
        if (!AppState.dados) AppState.dados = {};
        if (!Array.isArray(AppState.dados.periodosAquisitivos)) return;

        let changed = false;
        AppState.dados.periodosAquisitivos.forEach(p => {
            try {
                const pInicio = DateUtils.parse(p.inicio);
                const pTerm = DateUtils.parse(p.termino);
                if (!pInicio || !pTerm) return;
                // Se o intervalo do evento intersecta o período/subperíodo
                if (evStart <= pTerm && evEnd >= pInicio) {
                    // Marcar o subperíodo com as datas do evento
                    p.feriasInicio = DateUtils.getIsoDate(evStart);
                    p.feriasFim = DateUtils.getIsoDate(evEnd);
                    p.dias = Math.floor((evEnd - evStart) / msDay) + 1;
                    changed = true;
                }
            } catch (e) { /* ignore per-item errors */ }
        });

        if (changed) AppState.save();
    } catch (e) {
        console.error('Erro em sincronizarFeriasComPeriodos:', e);
    }
}

// Restaura todos os períodos aquisitivos a partir da data de admissão
function restaurarPeriodosFromAdmissao() {
    try {
        if (!AppState.dados || !AppState.dados.admissao) {
            mostrarAlertaGlobal('Não há data de admissão salva para restaurar períodos.', 'warning');
            return false;
        }

        const isoAdmissao = AppState.dados.admissao;
        const dtAd = DateUtils.parse(isoAdmissao);
        if (!dtAd) {
            mostrarAlertaGlobal('Data de admissão inválida.', 'error');
            return false;
        }

        // Se não houver períodos salvos, gerar sem pedir confirmação
        const existePeriodos = Array.isArray(AppState.dados.periodosAquisitivos) && AppState.dados.periodosAquisitivos.length > 0;
        if (existePeriodos) {
            // Perguntar confirmação para substituir; se o usuário cancelar, oferecer mesclagem
            const substituir = confirm('Já existem períodos salvos. Deseja substituir todos os períodos aquisitivos pela versão gerada a partir da data de admissão? (OK = Substituir, Cancel = Mesclar entradas faltantes)');
            if (!substituir) {
                // Perguntar se deseja mesclar (OK = mesclar, Cancel = cancelar)
                const mesclar = confirm('Deseja mesclar períodos faltantes a partir da data de admissão (não duplicará períodos já existentes)? OK = Mesclar, Cancel = Cancelar');
                if (!mesclar) return false; // usuário cancelou
                // Gerar, mas apenas adicionar períodos que ainda não existem
                const existentes = AppState.dados.periodosAquisitivos.slice();
                const chaveExists = (p) => existentes.some(ep => (Number(ep.periodoIndex) === Number(p.periodoIndex) && Number(ep.subIndex) === Number(p.subIndex)));
                let added = 0;
                result.forEach(p => {
                    if (!chaveExists(p)) {
                        existentes.push(p);
                        added++;
                    }
                });
                AppState.dados.periodosAquisitivos = existentes;
                AppState.save();
                renderizarPeriodosAquisitivosTable();
                mostrarAlertaGlobal(`Mesclagem concluída. ${added} períodos adicionados.`, 'success');
                return true;
            }
            // caso substituir == true, continua abaixo para substituir por completo
        }

        const divSel = document.getElementById('divisoesPeriodo');
        const divis = divSel && divSel.value ? Math.max(1, Math.min(3, Number(divSel.value))) : 3;

        const result = [];
        const now = new Date();
        const maxYear = now.getFullYear() + 2; // gerar até 2 anos à frente

        let periodoIndex = 1;
        // Gerar períodos enquanto inicio.year <= maxYear
        for (let y = dtAd.getFullYear(); y <= maxYear; y++) {
            const inicio = new Date(dtAd.getFullYear() + (periodoIndex - 1), dtAd.getMonth(), dtAd.getDate());
            if (!inicio) break;
            const termino = new Date(inicio.getFullYear() + 1, inicio.getMonth(), inicio.getDate());
            termino.setDate(termino.getDate() - 1);
            const limite = new Date(termino.getFullYear() + 1, termino.getMonth(), termino.getDate());

            for (let s = 1; s <= divis; s++) {
                result.push({
                    id: gerarIdUnico(),
                    periodoIndex: periodoIndex,
                    inicio: DateUtils.getIsoDate(inicio),
                    termino: DateUtils.getIsoDate(termino),
                    limite: DateUtils.getIsoDate(limite),
                    subIndex: s,
                    subTotal: divis,
                    feriasInicio: '',
                    feriasFim: '',
                    adto13: '',
                    dias: null,
                    documento: ''
                });
            }

            periodoIndex++;
            // condição de parada: se já ultrapassou maxYear pela data de inicio
            if (inicio.getFullYear() + 1 > maxYear + 1) break;
        }

        // Substituir completamente (ou gerar pela primeira vez)
        AppState.dados.periodosAquisitivos = result;
        AppState.save();
        renderizarPeriodosAquisitivosTable();
        mostrarAlertaGlobal('Períodos restaurados a partir da data de admissão.', 'success');
        return true;
    } catch (e) {
        console.error('Erro ao restaurar períodos:', e);
        mostrarAlertaGlobal('Erro ao restaurar períodos. Veja console.', 'error');
        return false;
    }
}


function renderizarEventos() {
    try {
        const tbody = document.querySelector('#tabelaEventos tbody');
        if (!tbody) {
            console.error('Tabela de eventos não encontrada');
            return;
        }

        tbody.innerHTML = '';

        console.log('Renderizando eventos:', AppState.dados.eventos.length, 'eventos');
        console.log('Tipos de evento disponíveis:', AppState.dados.tiposEvento);

        // Garantir que tiposEvento existe
        if (!AppState.dados.tiposEvento || !Array.isArray(AppState.dados.tiposEvento)) {
            console.warn('tiposEvento não existe, criando padrão');
            AppState.dados.tiposEvento = [
                { id: 'feriado', nome: 'Feriado', cor: '#dc2626' },
                { id: 'ferias', nome: 'Férias', cor: '#d97706' },
                { id: 'afastamento', nome: 'Afastamento', cor: '#0891b2' },
                { id: 'viagem', nome: 'Viagem', cor: '#7c3aed' },
                { id: 'abono_acordo', nome: 'Abono (acordo)', cor: '#059669' },
                { id: 'compensar_acordo', nome: 'Pagar Hora (acordo)', cor: '#db2777' },
                { id: 'outro', nome: 'Outro', cor: '#64748b' }
            ];
            AppState.save();
        }

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

        console.log('Eventos filtrados:', eventosFiltrados.length);

        if (eventosFiltrados.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 7;
            td.style.textAlign = 'center';
            td.style.padding = '20px';
            td.style.color = 'var(--text-muted)';
            td.textContent = 'Nenhum evento cadastrado';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        eventosFiltrados.forEach((e, idx) => {
            // Encontrar índice original para editar/deletar
            const idxOriginal = AppState.dados.eventos.indexOf(e);

            const tr = document.createElement('tr');

            // Coluna do tipo de evento com badge colorido
            const tdTipo = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = `evento-badge ${e.tipoEvento}`;
            const tipoInfo = AppState.dados.tiposEvento.find(t => t.id === e.tipoEvento);
            badge.textContent = tipoInfo ? tipoInfo.nome : e.tipoEvento;
            tdTipo.appendChild(badge);
            tr.appendChild(tdTipo);

            const colunas = [
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
            btnEdit.className = 'btn-secondary btn-icon';
            btnEdit.setAttribute('title', 'Editar evento');
            btnEdit.innerHTML = (typeof svgIcon === 'function')? svgIcon('edit', { title: 'Editar evento', color: 'currentColor' }) : '✏️';
            btnEdit.addEventListener('click', () => abrirEditarEvento(idxOriginal));
            tdActions.appendChild(btnEdit);

            const btnDel = document.createElement('button');
            btnDel.type = 'button';
            btnDel.className = 'btn-error btn-icon';
            btnDel.setAttribute('title', 'Deletar evento');
            btnDel.innerHTML = (typeof svgIcon === 'function')? svgIcon('trash', { title: 'Remover', color: 'currentColor' }) : '🗑️';
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

        // Bloquear criação de eventos do tipo 'ferias' pela aba Eventos
        if (String(tipoEvento).toLowerCase() === 'ferias') {
            throw new Error('Férias devem ser marcadas na aba Férias, não na aba Eventos.');
        }

        const descricaoEvento = document.getElementById('descricaoEvento').value;
        const dataInicioEvento = document.getElementById('dataInicioEvento').value;
        const dataFimEvento = document.getElementById('dataFimEvento').value;
        const impactoEvento = document.getElementById('impactoEvento').value;
        const periodoEvento = document.getElementById('eventoPeriodo') ? document.getElementById('eventoPeriodo').value : 'dia_todo';
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
            periodo: periodoEvento,
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

        // Se for um evento de férias, tentar sincronizar com os períodos aquisitivos
        try {
            if (String(evento.tipoEvento).toLowerCase() === 'ferias') {
                sincronizarFeriasComPeriodos(evento);
            }
        } catch (syncErr) { console.warn('Erro ao sincronizar férias com períodos:', syncErr); }

        AppState.save();
        renderizarEventos();
        renderizarAcordos();
        // Atualizar relatório de períodos aquisitivos caso o evento seja Férias
        try { renderizarPeriodosAquisitivosTable(); } catch(e) { /* ignore */ }
        gerarTimesheetAcordo(); // Atualiza timesheet automaticamente
        limparEvento();
        fecharModalEvento();
        mostrarAlertaGlobal('Evento salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar evento:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

function limparEvento() {
    const tipoEl = document.getElementById('tipoEvento'); if (tipoEl) tipoEl.value = 'feriado';
    const descEl = document.getElementById('descricaoEvento'); if (descEl) descEl.value = '';
    const inicioEl = document.getElementById('dataInicioEvento'); if (inicioEl) inicioEl.value = '';
    const fimEl = document.getElementById('dataFimEvento'); if (fimEl) fimEl.value = '';
    const impactoEl = document.getElementById('impactoEvento'); if (impactoEl) impactoEl.value = 'folga';
    const corFundoEl = document.getElementById('eventoCorFundo'); if (corFundoEl) corFundoEl.value = '#ffe4e6';
    const corTextoEl = document.getElementById('eventoCorTexto'); if (corTextoEl) corTextoEl.value = '#9f1239';
    const nomeCssEl = document.getElementById('eventoNomeCSS'); if (nomeCssEl) nomeCssEl.value = '';
    const periodoEl = document.getElementById('eventoPeriodo'); if (periodoEl) periodoEl.value = 'dia_todo';
    const acordoSel = document.getElementById('acordoEventoSelect');
    if (acordoSel) {
        if (AppState.eventoAcordoPreselected != null) {
            acordoSel.value = String(AppState.eventoAcordoPreselected);
        } else {
            try { acordoSel.selectedIndex = 0; } catch(e) { acordoSel.value = acordoSel.value || ''; }
        }
    }
    AppState.eventoEmEdicao = null;
    AppState.eventoAcordoPreselected = null;
}

// Salva um pedido de férias a partir da aba de Férias
function salvarFeriasFromTab() {
    try {
        const acordoSelect = document.getElementById('feriasAcordoSelect');
        const inicioEl = document.getElementById('feriasInicio');
        const fimEl = document.getElementById('feriasFim');
        const motivoEl = document.getElementById('feriasMotivo');

        if (!acordoSelect) throw new Error('Selecione um acordo antes de solicitar férias.');
        const acordoIdxRaw = acordoSelect.value;
        if (acordoIdxRaw === '' || acordoIdxRaw == null) throw new Error('Selecione um acordo válido.');

        const dataInicio = inicioEl ? inicioEl.value : '';
        if (!dataInicio) throw new Error('Informe a data de início das férias.');
        const dataFim = fimEl ? (fimEl.value || dataInicio) : dataInicio;
        const descricao = (motivoEl && motivoEl.value) ? `Férias: ${motivoEl.value}` : 'Férias solicitadas';

        const evento = {
            tipoEvento: 'ferias',
            descricaoEvento: descricao,
            dataInicioEvento: dataInicio,
            dataFimEvento: dataFim || dataInicio,
            impactoEvento: 'folga',
            periodo: 'dia_todo',
            acordoIndex: Number(acordoIdxRaw),
            corFundo: '',
            corTexto: '',
            nomeCSS: ''
        };

        // Validar usando validators existentes
        const erros = Validators.validateEvento(evento);
        if (erros && erros.length) throw new Error(erros.join('; '));

        AppState.dados.eventos.push(evento);
        try { if (String(evento.tipoEvento).toLowerCase() === 'ferias') sincronizarFeriasComPeriodos(evento); } catch(e){ console.warn('Erro sincronizando ferias:', e); }
        AppState.save();

        // Atualiza UI
        renderizarEventos();
        try { if (typeof gerarTimesheetAcordo === 'function') gerarTimesheetAcordo(); } catch(e){ console.warn('Erro ao gerar timesheet após criar férias:', e); }
        try { if (typeof atualizarDashboard === 'function') atualizarDashboard(); } catch(e){ console.warn('Erro ao atualizar dashboard após criar férias:', e); }

        // limpar formulário
        const form = document.getElementById('formFerias');
        if (form) form.reset();

        mostrarAlertaGlobal('Pedido de férias salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar férias:', error);
        mostrarAlertaGlobal(error.message || 'Erro ao salvar férias.', 'error');
    }
}

/**
 * Gera automaticamente o próximo período aquisitivo quando o período atual expira.
 * Validações:
 * - Verifica se a data de admissão existe
 * - Encontra o período com a data de término mais recente
 * - Se esse período expirou (término < hoje), cria um novo período
 * - Garante que não haja sobreposições de períodos
 */
function gerarProximoPeriodoSeNecessario() {
    try {
        if (!AppState.dados || !AppState.dados.admissao) {
            // Sem data de admissão, não pode gerar
            return;
        }

        const periodos = AppState.dados.periodosAquisitivos || [];
        if (periodos.length === 0) {
            // Nenhum período ainda
            return;
        }

        // Encontrar o período com maior periodoIndex e verificar sua data de término
        let maxIndex = 0;
        let ultimoPeriodo = null;
        periodos.forEach(p => {
            if (p.periodoIndex && p.periodoIndex > maxIndex) {
                maxIndex = p.periodoIndex;
                ultimoPeriodo = p;
            }
        });

        if (!ultimoPeriodo || !ultimoPeriodo.termino) {
            // Sem período válido
            return;
        }

        // Converter data de término para Date para comparação
        const dtTermino = DateUtils.parse(ultimoPeriodo.termino);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Se a data de término ainda não expirou, não gerar
        if (dtTermino >= hoje) {
            return;
        }

        // Data de término expirou - verificar se já existe próximo período
        const proximoIndex = maxIndex + 1;
        const jaExisteProximo = periodos.some(p => p.periodoIndex === proximoIndex);

        if (jaExisteProximo) {
            // Próximo período já foi gerado
            return;
        }

        // Gerar o próximo período
        // Início: dia seguinte ao término do período anterior (ou data de aniversário)
        const dtAdmissao = DateUtils.parse(AppState.dados.admissao);
        const inicio = new Date(dtAdmissao.getFullYear() + proximoIndex - 1, dtAdmissao.getMonth(), dtAdmissao.getDate());
        const termino = new Date(inicio.getFullYear() + 1, inicio.getMonth(), inicio.getDate());
        termino.setDate(termino.getDate() - 1);
        const limite = new Date(termino.getFullYear() + 1, termino.getMonth(), termino.getDate());

        // Criar novo período
        AppState.dados.periodosAquisitivos.push({
            id: gerarIdUnico(),
            periodoIndex: proximoIndex,
            inicio: DateUtils.getIsoDate(inicio),
            termino: DateUtils.getIsoDate(termino),
            limite: DateUtils.getIsoDate(limite),
            subIndex: null,
            subTotal: null,
            feriasInicio: null,
            feriasFim: null,
            adto13: '',
            dias: null,
            documento: ''
        });

        // Salvar e atualizar UI
        AppState.save();
        renderizarPeriodosAquisitivosTable();

        console.log(`Período aquisitivo ${proximoIndex} gerado automaticamente: ${DateUtils.formatBR(DateUtils.getIsoDate(inicio))} → ${DateUtils.formatBR(DateUtils.getIsoDate(termino))}`);
    } catch (e) {
        console.warn('Erro ao gerar próximo período automaticamente:', e);
    }
}

/**
 * Gera o PRÓXIMO período aquisitivo a partir da data de admissão.
 * Se já existirem períodos, gera o próximo após o último existente.
 * Se não houver períodos, gera o primeiro a partir da data de admissão.
 * Cada período tem 12 meses e pode ser dividido em N subperíodos (1..3).
 * O período gerado é salvo automaticamente.
 */
function gerarPeriodosAquisitivosFromAdmissao() {
    try {
        const dataAd = document.getElementById('dataAdmissao');
        const divSel = document.getElementById('divisoesPeriodo');
        if (!dataAd || !dataAd.value) {
            mostrarAlertaGlobal('Informe a data de admissão para gerar os períodos.', 'warning');
            return;
        }

        const divis = divSel && divSel.value ? Math.max(1, Math.min(3, Number(divSel.value))) : 3;
        const rawVal = (dataAd.value || '').trim();
        const isoVal = dateBrToIso(rawVal);
        const dt = DateUtils.parse(isoVal);
        if (!dt) {
            mostrarAlertaGlobal('Data de admissão inválida. Use o formato DD/MM/AAAA.', 'error');
            return;
        }

        // Inicializar array de períodos se não existir
        if (!AppState.dados) AppState.dados = {};
        if (!Array.isArray(AppState.dados.periodosAquisitivos)) {
            AppState.dados.periodosAquisitivos = [];
        }

        // Determinar qual será o próximo periodoIndex
        let nextPeriodoIndex = 1;
        if (AppState.dados.periodosAquisitivos.length > 0) {
            const maxIndex = Math.max(...AppState.dados.periodosAquisitivos.map(p => p.periodoIndex || 0));
            nextPeriodoIndex = maxIndex + 1;
        }

        // Calcular datas do próximo período
        // início: data de admissão + (nextPeriodoIndex - 1) anos
        const inicio = new Date(dt.getFullYear() + (nextPeriodoIndex - 1), dt.getMonth(), dt.getDate());
        // término: 12 meses depois, menos 1 dia
        const termino = new Date(inicio.getFullYear() + 1, inicio.getMonth(), inicio.getDate());
        termino.setDate(termino.getDate() - 1);
        // limite de concessão: um ano após o término
        const limite = new Date(termino.getFullYear() + 1, termino.getMonth(), termino.getDate());

        // Gerar apenas UMA linha inicial para este período (subperíodos serão criados dinamicamente ao solicitar férias)
        AppState.dados.periodosAquisitivos.push({
            id: gerarIdUnico(),
            periodoIndex: nextPeriodoIndex,
            inicio: DateUtils.getIsoDate(inicio),
            termino: DateUtils.getIsoDate(termino),
            limite: DateUtils.getIsoDate(limite),
            subIndex: null,  // null indica que ainda não há férias solicitadas
            subTotal: null,  // será atualizado dinamicamente
            feriasInicio: null,
            feriasFim: null,
            adto13: '',
            dias: null,
            documento: ''
        });

        // Salvar data de admissão também
        AppState.dados.admissao = DateUtils.getIsoDate(dt);

        // Persistir automaticamente
        AppState.save();

        // Atualizar tabela
        renderizarPeriodosAquisitivosTable();

        mostrarAlertaGlobal(`Período ${nextPeriodoIndex} gerado e salvo com sucesso!`, 'success');
    } catch (e) {
        console.error('Erro ao gerar período aquisitivo:', e);
        mostrarAlertaGlobal('Erro ao gerar período aquisitivo. Veja console.', 'error');
    }
}

function renderizarPeriodosAquisitivosTable(rows) {
    try {
        const tb = document.querySelector('#tablePeriodosAquisitivos tbody');
        console.debug('renderizarPeriodosAquisitivosTable called, tbody=', tb);
        if (!tb) {
            console.warn('Tabela de períodos aquisitivos não encontrada no DOM (#tablePeriodosAquisitivos tbody).');
            return;
        }
        tb.innerHTML = '';
        // Se não foram passadas linhas, carregar do estado persistido
        if (!rows) {
            try {
                rows = (AppState.dados && Array.isArray(AppState.dados.periodosAquisitivos)) ? AppState.dados.periodosAquisitivos.map(p => ({
                    id: p.id,
                    periodoIndex: p.periodoIndex,
                    inicio: DateUtils.parse(p.inicio),
                    termino: DateUtils.parse(p.termino),
                    limite: DateUtils.parse(p.limite),
                    subIndex: p.subIndex,
                    subTotal: p.subTotal,
                    feriasInicio: p.feriasInicio ? DateUtils.parse(p.feriasInicio) : null,
                    feriasFim: p.feriasFim ? DateUtils.parse(p.feriasFim) : null,
                    adto13: p.adto13 || '',
                    dias: typeof p.dias !== 'undefined' ? p.dias : null,
                    documento: p.documento || '',
                    idRaw: p.id
                })) : [];
            } catch (e) { rows = []; }
        }

        // Se não houver linhas para renderizar, mostrar linha informativa
        if (!rows || rows.length === 0) {
            const trEmpty = document.createElement('tr');
            const tdEmpty = document.createElement('td');
            tdEmpty.colSpan = 11;
            tdEmpty.style.textAlign = 'center';
            tdEmpty.style.padding = '12px';
            tdEmpty.textContent = 'Nenhum período aquisitivo salvo.';
            trEmpty.appendChild(tdEmpty);
            tb.appendChild(trEmpty);
            console.debug('Nenhum período aquisitivo encontrado; renderizada linha vazia.');
            return;
        }

        // Agrupar por período aquisitivo (periodoIndex)
        const grupos = {};
        rows.forEach(r => {
            if (!grupos[r.periodoIndex]) grupos[r.periodoIndex] = [];
            grupos[r.periodoIndex].push(r);
        });

        const fragment = document.createDocumentFragment();
        Object.keys(grupos).sort((a,b) => Number(a) - Number(b)).forEach(key => {
            const grupo = grupos[key];
            // Separar em: registros com férias (subIndex != null e feriasInicio preenchido) e registros sem férias
            const comFerias = grupo.filter(p => p.feriasInicio && p.feriasFim);
            const semFerias = grupo.filter(p => !p.feriasInicio || !p.feriasFim);
            
            // Ordenar por subIndex para garantir ordem 1º, 2º, 3º
            comFerias.sort((a, b) => (a.subIndex || 0) - (b.subIndex || 0));
            
            // Se não há nenhum período com férias, mostrar apenas 1 linha (registro base)
            // Se há períodos com férias, mostrar uma linha para cada
            const renderList = comFerias.length > 0 ? comFerias : [grupo[0]];
            const rowspan = renderList.length;

            renderList.forEach((r, idx) => {
                const tr = document.createElement('tr');

                // Para a primeira linha do grupo, inserir as colunas que abrangem todas as sublinhas (rowspan)
                if (idx === 0) {
                    // column Período Aquisitivo (single cell with range) - CLICÁVEL
                    const tdPeriodoAq = document.createElement('td');
                    const inicioText = r.inicio ? DateUtils.formatBR(DateUtils.getIsoDate(r.inicio)) : '';
                    const terminoText = r.termino ? DateUtils.formatBR(DateUtils.getIsoDate(r.termino)) : '';
                    const periodoText = inicioText && terminoText ? `${inicioText} → ${terminoText}` : (inicioText || terminoText || '');
                    
                    // Criar link clicável
                    const linkPeriodo = document.createElement('a');
                    linkPeriodo.href = '#';
                    linkPeriodo.textContent = periodoText;
                    linkPeriodo.style.color = '#2563eb';
                    linkPeriodo.style.textDecoration = 'underline';
                    linkPeriodo.style.cursor = 'pointer';
                    linkPeriodo.title = 'Clique para solicitar férias';
                    linkPeriodo.addEventListener('click', (e) => {
                        e.preventDefault();
                        abrirModalSolicitarFerias(r.periodoIndex);
                    });
                    tdPeriodoAq.appendChild(linkPeriodo);
                    tdPeriodoAq.rowSpan = rowspan;
                    tr.appendChild(tdPeriodoAq);

                    const tdLimite = document.createElement('td');
                    tdLimite.textContent = DateUtils.formatBR(DateUtils.getIsoDate(r.limite));
                    tdLimite.rowSpan = rowspan;
                    tr.appendChild(tdLimite);
                    
                    // calcular Total Dias já Concedidos e Quantidade de Dias Disponíveis para o período
                    // Baseado nos subperíodos que têm férias preenchidas (feriasInicio/feriasFim)
                    let totalConcedidos = 0;
                    let periodosJaProgramados = [];
                    try {
                        const msDay = 24 * 60 * 60 * 1000;
                        
                        // Somar os dias de cada subperíodo que tem férias solicitadas
                        grupo.forEach(sub => {
                            if (sub.feriasInicio && sub.feriasFim) {
                                const dtInicio = sub.feriasInicio instanceof Date ? sub.feriasInicio : DateUtils.parse(sub.feriasInicio);
                                const dtFim = sub.feriasFim instanceof Date ? sub.feriasFim : DateUtils.parse(sub.feriasFim);
                                if (dtInicio && dtFim) {
                                    const dias = sub.dias && typeof sub.dias === 'number' && sub.dias > 0 
                                        ? sub.dias 
                                        : Math.floor((dtFim - dtInicio) / msDay) + 1;
                                    if (dias > 0) {
                                        totalConcedidos += dias;
                                        // Adicionar à lista de períodos programados
                                        const inicioFmt = DateUtils.formatBR(DateUtils.getIsoDate(dtInicio));
                                        const fimFmt = DateUtils.formatBR(DateUtils.getIsoDate(dtFim));
                                        periodosJaProgramados.push(`${inicioFmt} - ${fimFmt}`);
                                    }
                                }
                            } else if (sub.dias && typeof sub.dias === 'number' && sub.dias > 0) {
                                totalConcedidos += sub.dias;
                            }
                        });
                        
                        const entitlement = (AppState.dados && AppState.dados.configuracoes && Number(AppState.dados.configuracoes.feriasDias) > 0) ? Number(AppState.dados.configuracoes.feriasDias) : 30;
                        const disponiveis = Math.max(0, entitlement - totalConcedidos);

                        const tdTotal = document.createElement('td');
                        tdTotal.textContent = String(totalConcedidos);
                        tdTotal.rowSpan = rowspan;
                        tr.appendChild(tdTotal);

                        const tdDispon = document.createElement('td');
                        tdDispon.textContent = String(disponiveis);
                        tdDispon.rowSpan = rowspan;
                        tr.appendChild(tdDispon);
                        
                        // (programados column removed)
                    } catch (err) {
                        const tdTotal = document.createElement('td'); tdTotal.textContent = ''; tdTotal.rowSpan = rowspan; tr.appendChild(tdTotal);
                        const tdDispon = document.createElement('td'); tdDispon.textContent = ''; tdDispon.rowSpan = rowspan; tr.appendChild(tdDispon);
                    }
                }

                const tdPeriodo = document.createElement('td');
                // Exibir label baseado no subIndex
                if (r.subIndex === 1) {
                    tdPeriodo.textContent = '1º Período';
                } else if (r.subIndex === 2) {
                    tdPeriodo.textContent = '2º Período';
                } else if (r.subIndex === 3) {
                    tdPeriodo.textContent = '3º Período';
                } else {
                    // Sem férias ainda ou único período
                    tdPeriodo.textContent = comFerias.length === 0 ? 'Único' : '';
                }
                tr.appendChild(tdPeriodo);

                // colunas de férias
                const tdFerInicio = document.createElement('td'); tdFerInicio.textContent = r.feriasInicio ? DateUtils.formatBR(DateUtils.getIsoDate(r.feriasInicio)) : ''; tr.appendChild(tdFerInicio);
                const tdFerFim = document.createElement('td'); tdFerFim.textContent = r.feriasFim ? DateUtils.formatBR(DateUtils.getIsoDate(r.feriasFim)) : ''; tr.appendChild(tdFerFim);
                const tdAdto = document.createElement('td'); tdAdto.textContent = r.adto13 || ''; tr.appendChild(tdAdto);
                const tdDias = document.createElement('td'); tdDias.textContent = (r.dias !== null && typeof r.dias !== 'undefined') ? String(r.dias) : ''; tr.appendChild(tdDias);

                // documento
                const tdDoc = document.createElement('td'); tdDoc.textContent = r.documento || ''; tr.appendChild(tdDoc);

                // ações (editar / solicitar férias / remover)
                const tdActions = document.createElement('td');
                tdActions.style.whiteSpace = 'nowrap';
                
                // Botão editar período individual
                if (r.feriasInicio && r.feriasFim) {
                    // Período com férias: pode editar e remover
                    const btnEdit = document.createElement('button');
                    btnEdit.type = 'button';
                    btnEdit.className = 'btn-secondary btn-icon';
                    btnEdit.title = 'Editar férias';
                    btnEdit.innerHTML = (typeof svgIcon === 'function') ? svgIcon('edit', { title: 'Editar férias', color: 'currentColor' }) : '✏️';
                    btnEdit.addEventListener('click', () => editarPeriodo(r.id || r.idRaw));
                    tdActions.appendChild(btnEdit);
                    
                    const btnDel = document.createElement('button');
                    btnDel.type = 'button';
                    btnDel.className = 'btn-secondary btn-icon';
                    btnDel.title = 'Remover férias';
                    btnDel.innerHTML = (typeof svgIcon === 'function') ? svgIcon('trash', { title: 'Remover férias', color: 'currentColor' }) : '🗑️';
                    btnDel.addEventListener('click', () => removerPeriodo(r.id || r.idRaw));
                    tdActions.appendChild(btnDel);
                } else {
                    // Período sem férias: apenas solicitar
                    const btnSolic = document.createElement('button');
                    btnSolic.type = 'button';
                    btnSolic.className = 'btn-primary btn-icon';
                    btnSolic.title = 'Solicitar férias';
                    btnSolic.innerHTML = (typeof svgIcon === 'function') ? svgIcon('plus', { title: 'Solicitar férias', color: 'currentColor' }) : '➕ Solicitar';
                    btnSolic.addEventListener('click', () => abrirModalSolicitarFerias(r.periodoIndex));
                    tdActions.appendChild(btnSolic);
                }
                tr.appendChild(tdActions);

                fragment.appendChild(tr);
            });
        });

        tb.appendChild(fragment);
    } catch (e) {
        console.error('Erro ao renderizar tabela de períodos aquisitivos:', e);
    }
}

function abrirAbaFeriasFromDashboard() {
    try {
        // Abrir aba principal Ponto
        const tab = document.querySelector('.tab-btn[data-tab="ponto"]');
        if (tab) tab.click();

        // abrir subaba Férias após pequeno delay para garantir DOM atualizado
        setTimeout(() => {
            try {
                atualizarSelectAcordosFerias();
                const sub = document.querySelector('.subtab-btn[data-subtab="ponto-ferias"]');
                if (sub) sub.click();
                const inicio = document.getElementById('feriasInicio');
                if (inicio) inicio.focus();
            } catch (e) { console.warn('Erro ao abrir subaba Férias:', e); }
        }, 60);
    } catch (error) {
        console.error('Erro ao abrir aba Férias a partir do dashboard:', error);
    }
}

// Editar um período salvo (edição simples via prompts)
function editarPeriodo(id) {
    try {
        if (!AppState.dados || !Array.isArray(AppState.dados.periodosAquisitivos)) {
            mostrarAlertaGlobal('Nenhum período salvo para editar.', 'warning');
            return;
        }
        const idx = AppState.dados.periodosAquisitivos.findIndex(p => p.id === id);
        if (idx === -1) {
            mostrarAlertaGlobal('Período não encontrado.', 'error');
            return;
        }
        const p = AppState.dados.periodosAquisitivos[idx];
        // editar campos principais: feriasInicio, feriasFim, adto13, dias, documento
        const novoFerInicio = prompt('Férias - Início (YYYY-MM-DD). Deixe vazio para limpar.', p.feriasInicio || '');
        if (novoFerInicio === null) return; // cancel
        const novoFerFim = prompt('Férias - Término (YYYY-MM-DD). Deixe vazio para limpar.', p.feriasFim || '');
        if (novoFerFim === null) return;
        const novoAdto = prompt('Adto 13º (texto livre)', p.adto13 || '');
        if (novoAdto === null) return;
        const novoDias = prompt('Dias (número)', p.dias !== null && typeof p.dias !== 'undefined' ? String(p.dias) : '');
        if (novoDias === null) return;
        const novoDoc = prompt('Documento (referência)', p.documento || '');
        if (novoDoc === null) return;

        p.feriasInicio = novoFerInicio ? DateUtils.normalize(novoFerInicio) : '';
        p.feriasFim = novoFerFim ? DateUtils.normalize(novoFerFim) : '';
        p.adto13 = novoAdto || '';
        p.dias = novoDias ? Number(novoDias) : null;
        p.documento = novoDoc || '';

        AppState.save();
        renderizarPeriodosAquisitivosTable();
        mostrarAlertaGlobal('Período atualizado.', 'success');
    } catch (e) {
        console.error('Erro ao editar período:', e);
        mostrarAlertaGlobal('Erro ao editar período.', 'error');
    }
}

function removerPeriodo(id) {
    try {
        if (!AppState.dados || !Array.isArray(AppState.dados.periodosAquisitivos)) return;
        const idx = AppState.dados.periodosAquisitivos.findIndex(p => p.id === id);
        if (idx === -1) return;
        if (!confirm('Deseja limpar as marcações de férias deste subperíodo? (Não removerá o registro do período)')) return;
        const p = AppState.dados.periodosAquisitivos[idx];
        if (p) {
            p.feriasInicio = '';
            p.feriasFim = '';
            p.dias = null;
            p.documento = '';
            p.adto13 = '';
            AppState.save();
            renderizarPeriodosAquisitivosTable();
            mostrarAlertaGlobal('Marcações de férias limpas para o subperíodo.', 'success');
        }
    } catch (e) {
        console.error('Erro ao remover período:', e);
        mostrarAlertaGlobal('Erro ao remover período.', 'error');
    }
}

function abrirEditarEvento(index) {
    try {
        const e = AppState.dados.eventos[index];
        if (!e) throw new Error('Evento não encontrado');
        const tipoEl = document.getElementById('tipoEvento'); if (tipoEl) tipoEl.value = e.tipoEvento || 'feriado';
        const descEl = document.getElementById('descricaoEvento'); if (descEl) descEl.value = e.descricaoEvento || '';
        const inicioEl = document.getElementById('dataInicioEvento'); if (inicioEl) inicioEl.value = e.dataInicioEvento || '';
        const fimEl = document.getElementById('dataFimEvento'); if (fimEl) fimEl.value = e.dataFimEvento || '';
        const impactoEl = document.getElementById('impactoEvento'); if (impactoEl) impactoEl.value = e.impactoEvento || 'folga';
        const corFundoEl = document.getElementById('eventoCorFundo'); if (corFundoEl) corFundoEl.value = e.corFundo || '#ffe4e6';
        const corTextoEl = document.getElementById('eventoCorTexto'); if (corTextoEl) corTextoEl.value = e.corTexto || '#9f1239';
        const nomeCssEl = document.getElementById('eventoNomeCSS'); if (nomeCssEl) nomeCssEl.value = e.nomeCSS || '';

        const periodoEl = document.getElementById('eventoPeriodo'); if (periodoEl) periodoEl.value = e.periodo || 'dia_todo';

        const acordoSel = document.getElementById('acordoEventoSelect'); if (acordoSel) acordoSel.value = (e.acordoIndex != null) ? String(e.acordoIndex) : '';

        AppState.eventoEmEdicao = index;
        const modalEl = document.getElementById('modalEvento'); if (modalEl) modalEl.classList.add('active');
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
        // Antes de remover o evento, se for do tipo 'ferias', limpar marcações nos períodos
        const ev = AppState.dados.eventos[AppState.eventoSelecionado];
        if (ev && String(ev.tipoEvento).toLowerCase() === 'ferias') {
            try { limparMarcacoesDeFeriasPorEvento(ev); } catch(e) { console.warn('Erro ao limpar marcações de férias:', e); }
        }
        AppState.dados.eventos.splice(AppState.eventoSelecionado, 1);
        AppState.eventoSelecionado = null;
        AppState.save();
        renderizarEventos();
        // Atualizar tabela de períodos para refletir remoção de marcações
        try { renderizarPeriodosAquisitivosTable(); } catch(e) { /* ignore */ }
        gerarTimesheetAcordo(); // Atualiza timesheet automaticamente
        fecharModalEvento();
        mostrarAlertaGlobal('Evento deletado.', 'success');
    } catch (error) {
        console.error('Erro ao deletar evento:', error);
        mostrarAlertaGlobal(error.message, 'error');
    }
}

// Limpa marcações de férias nos períodos que correspondem a um evento (ao excluir o evento)
function limparMarcacoesDeFeriasPorEvento(evento) {
    try {
        if (!evento || !evento.dataInicioEvento) return;
        const startIso = evento.dataInicioEvento;
        const endIso = evento.dataFimEvento || evento.dataInicioEvento;
        if (!AppState.dados || !Array.isArray(AppState.dados.periodosAquisitivos)) return;

        let changed = false;
        AppState.dados.periodosAquisitivos.forEach(p => {
            try {
                if (!p) return;
                // Limpar marcações quando as datas coincidirem exatamente
                // ou quando houver intersecção entre as datas do evento e o subperíodo marcado
                const pStart = p.feriasInicio || '';
                const pEnd = p.feriasFim || '';
                // Se não houver marcação, pular
                if (!pStart && !pEnd) return;

                // comparar como datas usando DateUtils (mais robusto)
                const evStart = DateUtils.parse(startIso);
                const evEnd = DateUtils.parse(endIso);
                const subStart = DateUtils.parse(pStart);
                const subEnd = DateUtils.parse(pEnd);
                let intersects = false;
                if (subStart && subEnd && evStart && evEnd) {
                    // interseção: subStart <= evEnd && subEnd >= evStart
                    if (subStart <= evEnd && subEnd >= evStart) intersects = true;
                }

                const exactMatch = (pStart === startIso && pEnd === endIso);
                if (exactMatch || intersects) {
                    p.feriasInicio = '';
                    p.feriasFim = '';
                    p.dias = null;
                    p.documento = '';
                    p.adto13 = '';
                    changed = true;
                }
            } catch(e) { /* ignore per-item errors */ }
        });

        if (changed) {
            AppState.save();
        }
    } catch (e) {
        console.error('Erro em limparMarcacoesDeFeriasPorEvento:', e);
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

function atualizarSelectAcordosFerias() {
    const select = document.getElementById('feriasAcordoSelect');
    if (!select) return;

    select.innerHTML = '';

    if (!AppState.dados.acordos || !AppState.dados.acordos.length) {
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

    // default to first acordo
    try { select.value = '0'; } catch(e){}
}

function salvarFeriasFromTab() {
    try {
        const acordoSel = document.getElementById('feriasAcordoSelect');
        const inicioEl = document.getElementById('feriasInicio');
        const fimEl = document.getElementById('feriasFim');
        const motivoEl = document.getElementById('feriasMotivo');

        if (!acordoSel) throw new Error('Selecione um acordo válido.');
        const acordoIdx = acordoSel.value;
        if (acordoIdx === '' || isNaN(Number(acordoIdx))) throw new Error('Selecione um acordo antes de enviar.');
        if (!inicioEl || !inicioEl.value) throw new Error('Informe a data de início.');

        const dataInicio = inicioEl.value;
        const dataFim = (fimEl && fimEl.value) ? fimEl.value : dataInicio;
        const motivo = motivoEl ? motivoEl.value.trim() : '';

        const evento = {
            tipoEvento: 'ferias',
            descricaoEvento: motivo || 'Férias',
            dataInicioEvento: dataInicio,
            dataFimEvento: dataFim,
            impactoEvento: 'folga',
            periodo: 'dia_todo',
            acordoIndex: Number(acordoIdx),
            corFundo: '#f0f8ff',
            corTexto: '#000000',
            nomeCSS: ''
        };

        const erros = Validators.validateEvento(evento);
        if (erros && erros.length) throw new Error(erros.join('; '));

        AppState.dados.eventos.push(evento);
        try { if (String(evento.tipoEvento).toLowerCase() === 'ferias') sincronizarFeriasComPeriodos(evento); } catch(e){ console.warn('Erro sincronizando ferias:', e); }
        AppState.save();
        renderizarEventos();
        // Atualizar relatório de períodos aquisitivos para refletir a nova solicitação
        try { renderizarPeriodosAquisitivosTable(); } catch(e) { /* ignore */ }
        try { gerarTimesheetAcordo(); } catch(e){}
        try { atualizarDashboard(); } catch(e){}

        const form = document.getElementById('formFerias');
        if (form) form.reset();

        mostrarAlertaGlobal('Férias solicitadas e salvas.', 'success');
    } catch (error) {
        console.error('Erro ao salvar férias:', error);
        mostrarAlertaGlobal(error.message || 'Erro ao salvar férias', 'error');
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
    const acordoNomeEl = document.getElementById('acordoNome'); if (acordoNomeEl) acordoNomeEl.value = (AppState.acordoEmEdicao && AppState.acordoEmEdicao.nome) ? AppState.acordoEmEdicao.nome : '';
    const periodoInicioEl = document.getElementById('periodoInicio'); if (periodoInicioEl) periodoInicioEl.value = '';
    const periodoFimEl = document.getElementById('periodoFim'); if (periodoFimEl) periodoFimEl.value = '';
    const periodoMinExtrasEl = document.getElementById('periodoMinutosExtras'); if (periodoMinExtrasEl) periodoMinExtrasEl.value = '';

    const regraInicioEl = document.getElementById('regraInicio'); if (regraInicioEl) regraInicioEl.value = '';
    const regraFimEl = document.getElementById('regraFim'); if (regraFimEl) regraFimEl.value = '';
    const regraMinExtrasEl = document.getElementById('regraMinutosExtras'); if (regraMinExtrasEl) regraMinExtrasEl.value = '';
    const regraInicioExpEl = document.getElementById('regraInicioExpediente'); if (regraInicioExpEl) regraInicioExpEl.value = '';
    const regraAlmocoEl = document.getElementById('regraAlmoco'); if (regraAlmocoEl) regraAlmocoEl.value = 60;
    const regraTolAlmocoEl = document.getElementById('regraTolAlmoco'); if (regraTolAlmocoEl) regraTolAlmocoEl.value = 5;
    const regraTolSaidaEl = document.getElementById('regraTolSaida'); if (regraTolSaidaEl) regraTolSaidaEl.value = 5;
    const regraTipoEl = document.getElementById('regraTipo'); if (regraTipoEl) regraTipoEl.value = '';
    const regraValeEl = document.getElementById('regraVale'); if (regraValeEl) regraValeEl.value = '';

    // Preencher campos de Abono e Pagar Hora
    const qtdAbonoEl = document.getElementById('acordoQtdAbono');
    const qtdPagarHoraEl = document.getElementById('acordoQtdPagarHora');
    if (qtdAbonoEl) qtdAbonoEl.value = AppState.acordoEmEdicao.qtdAbono || 0;
    if (qtdPagarHoraEl) qtdPagarHoraEl.value = AppState.acordoEmEdicao.qtdPagarHora || 0;

    // Calcular e exibir uso atual
    atualizarExibicaoUsoBeneficios();

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
                        <button type="button" class="btn-secondary btn-icon" onclick="editarPeriodoAcordo(${idx})" title="Editar">${(typeof svgIcon === 'function')? svgIcon('edit', { title: 'Editar período', color: 'currentColor' }) : '✏️'}</button>
                        <button type="button" class="btn-error btn-icon" onclick="removerPeriodoAcordo(${idx})" title="Deletar">${(typeof svgIcon === 'function')? svgIcon('trash', { title: 'Remover período', color: 'currentColor' }) : '🗑️'}</button>
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
                    <button type="button" class="btn-secondary btn-icon" onclick="editarRegraHorario(${idx})" title="Editar">${(typeof svgIcon === 'function')? svgIcon('edit', { title: 'Editar regra', color: 'currentColor' }) : '✏️'}</button>
                    <button type="button" class="btn-error btn-icon" onclick="removerRegraHorario(${idx})" title="Deletar">${(typeof svgIcon === 'function')? svgIcon('trash', { title: 'Remover regra', color: 'currentColor' }) : '🗑️'}</button>
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
        document.getElementById('periodoInicio').value = dateIsoToBr(p.inicio);
        document.getElementById('periodoFim').value = dateIsoToBr(p.fim);
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
        const inicio = dateBrToIso(document.getElementById('periodoInicio').value);
        const fim = dateBrToIso(document.getElementById('periodoFim').value);
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

function salvarAcordoComRefreshTimesheet() {
    salvarAcordo();
    gerarTimesheetAcordo(); // Atualiza timesheet automaticamente
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

        // Salvar quantidades de Abono e Pagar Hora
        const qtdAbonoEl = document.getElementById('acordoQtdAbono');
        const qtdPagarHoraEl = document.getElementById('acordoQtdPagarHora');
        AppState.acordoEmEdicao.qtdAbono = qtdAbonoEl ? Number(qtdAbonoEl.value) || 0 : 0;
        AppState.acordoEmEdicao.qtdPagarHora = qtdPagarHoraEl ? Number(qtdPagarHoraEl.value) || 0 : 0;

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
        atualizarSelectAcordosFerias();
        atualizarSelectAcordosRegistros();
        gerarTimesheetAcordo(); // Atualiza timesheet automaticamente
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

/**
 * Calcula e exibe o uso de abono e pagar hora para o acordo em edição.
 * Conta os eventos do tipo 'abono_acordo' e 'compensar_acordo' vinculados a este acordo.
 */
function atualizarExibicaoUsoBeneficios() {
    try {
        const abonoUsadoEl = document.getElementById('acordoAbonoUsado');
        const pagarHoraUsadoEl = document.getElementById('acordoPagarHoraUsado');
        
        if (!AppState.acordoEmEdicao) return;

        const acordoIndex = AppState.acordoEmEdicaoIndex;
        const eventos = AppState.dados.eventos || [];
        
        // Calcular dias de abono usados (eventos tipo 'abono_acordo')
        let diasAbonoUsados = 0;
        // Calcular horas pagas usadas (eventos tipo 'compensar_acordo' ou 'pagar_hora')
        let horasPagasUsadas = 0;
        
        eventos.forEach(ev => {
            // Verificar se o evento pertence a este acordo
            if (ev.acordoIndex !== acordoIndex && acordoIndex !== null) return;
            
            const tipo = String(ev.tipoEvento || '').toLowerCase();
            const periodo = String(ev.periodo || '').toLowerCase();
            // Fator: meio período (matutino/vespertino) conta como 0.5
            const fatorPeriodo = (periodo === 'matutino' || periodo === 'vespertino') ? 0.5 : 1;
            
            if (tipo === 'abono_acordo' || tipo === 'abono') {
                // Contar períodos (meio período = 0.5, dia todo = 1)
                const inicio = DateUtils.parse(ev.dataInicioEvento);
                const fim = DateUtils.parse(ev.dataFimEvento);
                if (inicio && fim) {
                    const dias = Math.floor((fim - inicio) / (24 * 60 * 60 * 1000)) + 1;
                    diasAbonoUsados += dias * fatorPeriodo;
                }
            }
            
            if (tipo === 'compensar_acordo' || tipo === 'pagar_hora') {
                // Contar horas (usar campo horas se disponível, ou calcular pelos dias)
                if (ev.horas) {
                    horasPagasUsadas += Number(ev.horas) || 0;
                } else {
                    const inicio = DateUtils.parse(ev.dataInicioEvento);
                    const fim = DateUtils.parse(ev.dataFimEvento);
                    if (inicio && fim) {
                        const dias = Math.floor((fim - inicio) / (24 * 60 * 60 * 1000)) + 1;
                        // Meio período = 4h, dia todo = 8h
                        const horasPorDia = (periodo === 'matutino' || periodo === 'vespertino') ? 4 : 8;
                        horasPagasUsadas += dias * horasPorDia;
                    }
                }
            }
        });
        
        const qtdAbono = AppState.acordoEmEdicao.qtdAbono || 0;
        const qtdPagarHora = AppState.acordoEmEdicao.qtdPagarHora || 0;
        const restanteAbono = Math.max(0, qtdAbono - diasAbonoUsados);
        const restantePagarHora = Math.max(0, qtdPagarHora - horasPagasUsadas);
        
        if (abonoUsadoEl) {
            abonoUsadoEl.textContent = `Utilizado: ${diasAbonoUsados} período(s) | Restante: ${restanteAbono} período(s)`;
            abonoUsadoEl.style.color = restanteAbono <= 0 && qtdAbono > 0 ? 'var(--error)' : 'var(--text-secondary)';
        }
        if (pagarHoraUsadoEl) {
            pagarHoraUsadoEl.textContent = `Utilizado: ${horasPagasUsadas}h | Restante: ${restantePagarHora}h`;
            pagarHoraUsadoEl.style.color = restantePagarHora <= 0 && qtdPagarHora > 0 ? 'var(--error)' : 'var(--text-secondary)';
        }
    } catch (e) {
        console.warn('Erro ao atualizar exibição de benefícios:', e);
    }
}

/**
 * Calcula o uso de abono e pagar hora para um acordo específico.
 * @param {number} acordoIndex - Índice do acordo
 * @param {object} acordo - Objeto do acordo
 * @returns {object} { usadoAbono, restanteAbono, usadoPagarHora, restantePagarHora }
 */
function calcularUsoBeneficiosAcordo(acordoIndex, acordo) {
    const eventos = AppState.dados.eventos || [];
    let diasAbonoUsados = 0;
    let horasPagasUsadas = 0;
    
    eventos.forEach(ev => {
        // Verificar se o evento pertence a este acordo
        if (ev.acordoIndex !== acordoIndex) return;
        
        const tipo = String(ev.tipoEvento || '').toLowerCase();
        const periodo = String(ev.periodo || '').toLowerCase();
        // Fator: meio período (matutino/vespertino) conta como 0.5
        const fatorPeriodo = (periodo === 'matutino' || periodo === 'vespertino') ? 0.5 : 1;
        
        if (tipo === 'abono_acordo' || tipo === 'abono') {
            const inicio = DateUtils.parse(ev.dataInicioEvento);
            const fim = DateUtils.parse(ev.dataFimEvento);
            if (inicio && fim) {
                const dias = Math.floor((fim - inicio) / (24 * 60 * 60 * 1000)) + 1;
                diasAbonoUsados += dias * fatorPeriodo;
            }
        }
        
        if (tipo === 'compensar_acordo' || tipo === 'pagar_hora') {
            if (ev.horas) {
                horasPagasUsadas += Number(ev.horas) || 0;
            } else {
                const inicio = DateUtils.parse(ev.dataInicioEvento);
                const fim = DateUtils.parse(ev.dataFimEvento);
                if (inicio && fim) {
                    const dias = Math.floor((fim - inicio) / (24 * 60 * 60 * 1000)) + 1;
                    // Meio período = 4h, dia todo = 8h
                    const horasPorDia = (periodo === 'matutino' || periodo === 'vespertino') ? 4 : 8;
                    horasPagasUsadas += dias * horasPorDia;
                }
            }
        }
    });
    
    const qtdAbono = acordo.qtdAbono || 0;
    const qtdPagarHora = acordo.qtdPagarHora || 0;
    
    return {
        usadoAbono: diasAbonoUsados,
        restanteAbono: Math.max(0, qtdAbono - diasAbonoUsados),
        usadoPagarHora: horasPagasUsadas,
        restantePagarHora: Math.max(0, qtdPagarHora - horasPagasUsadas)
    };
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

            // Exibir resumo de Abono e Pagar Hora
            if (a.qtdAbono > 0 || a.qtdPagarHora > 0) {
                const subtBenef = document.createElement('div');
                subtBenef.className = 'acordo-subtitulo';
                subtBenef.textContent = 'Abono / Pagar Hora:';
                div.appendChild(subtBenef);

                const benefInfo = calcularUsoBeneficiosAcordo(idx, a);
                const ulBenef = document.createElement('ul');
                ulBenef.className = 'acordo-lista';
                
                if (a.qtdAbono > 0) {
                    const liAbono = document.createElement('li');
                    liAbono.innerHTML = `Abono: <strong>${benefInfo.restanteAbono}</strong> dia(s) disponível (${benefInfo.usadoAbono} usado de ${a.qtdAbono})`;
                    if (benefInfo.restanteAbono <= 0) liAbono.style.color = 'var(--error)';
                    ulBenef.appendChild(liAbono);
                }
                if (a.qtdPagarHora > 0) {
                    const liPH = document.createElement('li');
                    liPH.innerHTML = `Pagar Hora: <strong>${benefInfo.restantePagarHora}</strong>h disponível (${benefInfo.usadoPagarHora}h usado de ${a.qtdPagarHora}h)`;
                    if (benefInfo.restantePagarHora <= 0) liPH.style.color = 'var(--error)';
                    ulBenef.appendChild(liPH);
                }
                div.appendChild(ulBenef);
            }

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
        atualizarSelectAcordosFerias();
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
            Notifications.warning('Nenhum registro para exportar.');
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
function exportarRegistrosPDF() { Notifications.info('📄 Exportação PDF em desenvolvimento'); }
function exportarTimesheetCSV() { Notifications.info('📊 Exportação de timesheet em desenvolvimento'); }

function exportarTimesheetPDF() {
    try {
        const cont = document.getElementById('timesheetContent');
        if (!cont || !cont.innerHTML.trim()) {
            Notifications.warning('Gere o timesheet antes de exportar.');
            return;
        }

        // Descobrir o stylesheet principal (styles.css) para manter a aparência
        const cssLink = (document.querySelector('link[href="styles.css"]')?.href) || 'styles.css';

        const printStyles = `
            @page { size: A4 landscape; margin: 10mm; }
            body { padding: 12px; }
            table { width: 100% !important; border-collapse: collapse; }
            th, td { page-break-inside: avoid; }
            .timesheet-container, .timesheet-wrapper { width: 100%; overflow: visible; }
        `;

        const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Timesheet</title><link rel="stylesheet" href="${cssLink}"><style>${printStyles}</style></head><body>${cont.innerHTML}</body></html>`;

        const win = window.open('', '_blank');
        if (!win) {
            Notifications.error('Não foi possível abrir a janela de exportação.');
            return;
        }

        win.document.write(html);
        win.document.close();
        win.focus();

        // Pequena espera para garantir renderização antes de imprimir
        setTimeout(() => {
            win.print();
            win.close();
        }, 300);
    } catch (err) {
        console.error('Erro ao exportar timesheet PDF:', err);
        Notifications.error('Erro ao exportar timesheet para PDF.');
    }
}

// ============= BACKUP E RESTAURAÇÃO LOCAL =============

/**
 * Salva todos os dados em um arquivo JSON local
 */
function salvarBackupLocal() {
    try {
        // Criar objeto com todos os dados
        const backup = {
            versao: '2.0',
            dataBackup: new Date().toISOString(),
            dados: AppState.dados
        };

        // Converter para JSON formatado
        const json = JSON.stringify(backup, null, 2);
        
        // Criar blob e download
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        // Nome do arquivo com data/hora
        const dataHora = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const nomeArquivo = `gestao-atividades-backup-${dataHora}.json`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', nomeArquivo);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Notifications.success(`💾 Backup salvo: ${nomeArquivo}`);
    } catch (error) {
        console.error('Erro ao salvar backup:', error);
        Notifications.error('Erro ao salvar backup: ' + error.message);
    }
}

/**
 * Restaura todos os dados de um arquivo JSON local
 */
function restaurarBackupLocal(event) {
    try {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        // Confirmar antes de restaurar
        Notifications.confirm(
            'Restaurar backup irá substituir todos os dados atuais. Deseja continuar?',
            () => {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    try {
                        const backup = JSON.parse(e.target.result);
                        
                        // Validar estrutura do backup
                        if (!backup.dados || !backup.dados.registros || !backup.dados.configuracoes) {
                            throw new Error('Arquivo de backup inválido');
                        }

                        // Verificar versão
                        if (backup.versao) {
                            console.log('Restaurando backup versão:', backup.versao);
                        }

                        // Restaurar dados
                        AppState.dados = backup.dados;
                        
                        // Garantir que tiposEvento existe
                        if (!AppState.dados.tiposEvento || !Array.isArray(AppState.dados.tiposEvento)) {
                            AppState.dados.tiposEvento = [
                                { id: 'feriado', nome: 'Feriado', cor: '#dc2626' },
                                { id: 'ferias', nome: 'Férias', cor: '#d97706' },
                                { id: 'afastamento', nome: 'Afastamento', cor: '#0891b2' },
                                { id: 'viagem', nome: 'Viagem', cor: '#7c3aed' },
                                { id: 'abono_acordo', nome: 'Abono (acordo)', cor: '#059669' },
                                { id: 'compensar_acordo', nome: 'Pagar Hora (acordo)', cor: '#db2777' },
                                { id: 'outro', nome: 'Outro', cor: '#64748b' }
                            ];
                        }

                        // Salvar no localStorage
                        AppState.save();

                        // Atualizar interface
                        atualizarDashboard();
                        renderizarTabelaRegistros();
                        renderizarEventos();
                        renderizarAcordos();
                        atualizarSelectAcordosTimesheet();
                        atualizarSelectAcordosRegistros();
                        atualizarSelectAcordosFerias();
                        atualizarSelectAcordosEventos();
                        atualizarSelectTiposEventos();

                        const dataBackup = backup.dataBackup ? new Date(backup.dataBackup).toLocaleString('pt-BR') : 'desconhecida';
                        Notifications.success(`✅ Backup restaurado com sucesso! (Data: ${dataBackup})`);
                        
                        console.log('Backup restaurado:', {
                            registros: AppState.dados.registros.length,
                            eventos: AppState.dados.eventos.length,
                            acordos: AppState.dados.acordos.length
                        });
                    } catch (error) {
                        console.error('Erro ao processar backup:', error);
                        Notifications.error('Erro ao restaurar backup: ' + error.message);
                    } finally {
                        event.target.value = '';
                    }
                };

                reader.onerror = function() {
                    Notifications.error('Erro ao ler o arquivo.');
                    event.target.value = '';
                };

                reader.readAsText(file, 'utf-8');
            },
            () => {
                event.target.value = '';
            }
        );
    } catch (error) {
        console.error('Erro ao restaurar backup:', error);
        Notifications.error('Erro: ' + error.message);
        event.target.value = '';
    }
}

function exportarDados() { Notifications.info('💾 Use o botão "Backup" para salvar os dados'); }
function importarDados(event) { Notifications.info('📥 Use o botão "Restaurar" para carregar os dados'); }
function salvarConfiguracoes() { Notifications.info('⚙️ Configurações em desenvolvimento'); }
function carregarConfiguracoes() { Notifications.info('⚙️ Carregamento de configurações em desenvolvimento'); }

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

// Wrapper versions that can be called via delegated `data-action` without an Event
function scrollTableLeftNoEvent() {
    const container = document.getElementById('tableScrollContainer');
    if (container) container.scrollLeft -= 200;
}

function scrollTableRightNoEvent() {
    const container = document.getElementById('tableScrollContainer');
    if (container) container.scrollLeft += 200;
}

// Trigger a click on a target element by id (used by data-action="triggerClick")
function triggerClick(targetId) {
    try {
        const t = document.getElementById(targetId || (this && this.dataset && this.dataset.target));
        if (t) t.click();
        else console.warn('triggerClick: alvo não encontrado', targetId);
    } catch (e) { console.error('Erro em triggerClick', e); }
}

// ============= EXPORT/IMPORT EVENTOS EXCEL =============

function exportarEventosExcel() {
    try {
        if (!AppState.dados.eventos.length) {
            Notifications.warning('Nenhum evento para exportar.');
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

// ============= EXPORTAR/IMPORTAR ACORDOS =============

/**
 * Exporta acordos em formato JSON
 */
function exportarAcordosJSON() {
    try {
        if (!AppState.dados.acordos || AppState.dados.acordos.length === 0) {
            Notifications.warning('Nenhum acordo para exportar.');
            return;
        }

        const acordos = AppState.dados.acordos.map(a => ({
            id: a.id,
            nome: a.nome,
            horasPorDia: a.horasPorDia,
            diaInicio: a.diaInicio,
            diaFim: a.diaFim,
            descricao: a.descricao || '',
            ativo: a.ativo !== false
        }));

        const blob = new Blob([JSON.stringify(acordos, null, 2)], { type: 'application/json;charset=utf-8' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `acordos_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Notifications.success(`✅ ${acordos.length} acordo(s) exportado(s)!`);
    } catch (error) {
        console.error('Erro ao exportar acordos:', error);
        Notifications.error('Erro ao exportar: ' + error.message);
    }
}

/**
 * Importa acordos a partir de arquivo JSON
 */
function importarAcordosJSON(event) {
    try {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        
        reader.onload = function (e) {
            try {
                const acordos = JSON.parse(e.target.result);
                
                if (!Array.isArray(acordos)) {
                    Notifications.error('Arquivo inválido: deve conter um array de acordos');
                    return;
                }

                let importados = 0;
                let duplicados = 0;

                acordos.forEach(acordo => {
                    // Verificar se já existe
                    const existe = AppState.dados.acordos.some(a => a.nome === acordo.nome);
                    
                    if (existe) {
                        duplicados++;
                        return;
                    }

                    // Validar campos obrigatórios
                    if (!acordo.nome || typeof acordo.horasPorDia !== 'number') {
                        console.warn('Acordo inválido:', acordo);
                        return;
                    }

                    // Adicionar novo acordo
                    AppState.dados.acordos.push({
                        id: acordo.id || gerarIdUnico(),
                        nome: acordo.nome,
                        horasPorDia: acordo.horasPorDia,
                        diaInicio: acordo.diaInicio || 1,
                        diaFim: acordo.diaFim || 28,
                        descricao: acordo.descricao || '',
                        ativo: acordo.ativo !== false
                    });

                    importados++;
                });

                AppState.save();
                atualizarSelectAcordosRegistros();
                atualizarSelectAcordosEventos();
                atualizarSelectAcordosFerias();
                renderizarAcordos();

                let mensagem = `✅ ${importados} acordo(s) importado(s)`;
                if (duplicados > 0) mensagem += ` (${duplicados} duplicado(s) ignorado(s))`;
                
                Notifications.success(mensagem);
                console.log(`Acordos importados: ${importados}, duplicados: ${duplicados}`);
            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                Notifications.error('Arquivo inválido: ' + error.message);
            }
        };

        reader.readAsText(file);
        event.target.value = ''; // Reset para permitir reselecionar mesmo arquivo
    } catch (error) {
        console.error('Erro ao importar acordos:', error);
        Notifications.error('Erro ao importar: ' + error.message);
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
        editBtn.className = 'btn-secondary btn-icon';
        editBtn.innerHTML = (typeof svgIcon === 'function') ? svgIcon('edit', { title: 'Editar', color: 'currentColor' }) : '✏️';
        editBtn.onclick = () => abrirEditarTipoEvento(index);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-error btn-icon';
        deleteBtn.innerHTML = (typeof svgIcon === 'function') ? svgIcon('trash', { title: 'Deletar', color: 'currentColor' }) : '🗑️';
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
    
    // Excluir o tipo 'ferias' do select de eventos (férias devem ser marcadas na aba Férias)
    tipos.filter(tipo => tipo.id !== 'ferias').forEach(tipo => {
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

    // Também popular select no modal de registro, se existir (sem 'ferias')
    const selectReg = document.getElementById('registroTipoEvento');
    if (selectReg) {
        const valReg = selectReg.value;
        selectReg.innerHTML = '';
        tipos.filter(tipo => tipo.id !== 'ferias').forEach(tipo => {
            const opt = document.createElement('option');
            opt.value = tipo.id;
            opt.textContent = tipo.nome;
            selectReg.appendChild(opt);
        });
        const tiposFiltrados = tipos.filter(t => t.id !== 'ferias');
        if (tiposFiltrados.some(t => t.id === valReg)) selectReg.value = valReg;
        else if (tiposFiltrados.length > 0) selectReg.value = tiposFiltrados[0].id;
    }
}

// ============= ANALYTICS E GRÁFICOS =============

function toggleAnalytics() {
    const section = document.getElementById('analyticsSection');
    const toggleText = document.getElementById('analyticsToggleText');
    
    if (!section) return;
    
    const isVisible = section.style.display !== 'none';
    
    if (isVisible) {
        section.style.display = 'none';
        toggleText.textContent = 'Mostrar Gráficos';
        Charts.destroyAll();
    } else {
        section.style.display = 'block';
        toggleText.textContent = 'Ocultar Gráficos';
        renderAnalytics();
    }
}

function renderAnalytics() {
    try {
        if (typeof Chart === 'undefined') {
            Notifications.warning('Chart.js não foi carregado. Recarregue a página.');
            return;
        }

        // Usa os registros filtrados pelo dashboard
        const registros = filtrarRegistros();
        const eventos = AppState.dados.eventos || [];
        const acordos = AppState.dados.acordos || [];
        const tiposEvento = AppState.dados.tiposEvento || [];

        if (registros.length === 0) {
            Notifications.info('Nenhum registro encontrado com os filtros aplicados');
            return;
        }

        // Filtra eventos pelo mesmo período dos registros
        let eventosFiltrados = eventos;
        const intervalo = calcularIntervaloPeriodo(AppState.dashboardFilters.periodo);
        if (intervalo) {
            eventosFiltrados = eventos.filter(e => {
                const dataEvento = DateUtils.parse(e.data);
                if (!dataEvento) return false;
                return dataEvento >= intervalo.inicio && dataEvento <= intervalo.fim;
            });
        }

        // Criar gráficos com dados filtrados
        Charts.createHoursChart('chartHours', registros);
        Charts.createBalanceChart('chartBalance', registros, acordos);
        Charts.createWeeklyHeatmap('chartWeekly', registros);
        
        if (eventosFiltrados.length > 0) {
            Charts.createEventTypesChart('chartEvents', eventosFiltrados, tiposEvento);
        } else {
            // Limpa o gráfico de eventos se não houver dados
            const canvas = document.getElementById('chartEvents');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        Notifications.success('📊 Gráficos atualizados!');
    } catch (error) {
        console.error('Erro ao renderizar analytics:', error);
        Notifications.error('Erro ao gerar gráficos: ' + error.message);
    }
}

// ============= VALIDAÇÃO EM TEMPO REAL =============

function setupRealtimeValidation() {
    // Validar campos do modal de registro
    RealtimeValidation.enableForField('dataRegistro', ['required', 'date'], {
        debounceTime: 300
    });

    RealtimeValidation.enableForField('entradaRegistro', ['required', 'time'], {
        debounceTime: 300
    });

    RealtimeValidation.enableForField('saidaAlmocoRegistro', ['time'], {
        debounceTime: 300
    });

    RealtimeValidation.enableForField('retornoAlmocoRegistro', ['time'], {
        debounceTime: 300
    });

    RealtimeValidation.enableForField('saidaRegistro', ['required', 'time'], {
        debounceTime: 300
    });

    // Validação comparativa: saída > entrada
    const entradaField = document.getElementById('entradaRegistro');
    const saidaField = document.getElementById('saidaRegistro');
    
    if (entradaField && saidaField) {
        saidaField.addEventListener('blur', () => {
            RealtimeValidation.validateComparison(
                'saidaRegistro',
                'entradaRegistro',
                '>',
                'Saída deve ser posterior à entrada'
            );
        });
    }
}

// Chamar no init
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof RealtimeValidation !== 'undefined') {
            setupRealtimeValidation();
        }
    }, 500);
});

// Verificação adicional ao carregar: oferecer restauração de períodos a partir da admissão
document.addEventListener('DOMContentLoaded', () => {
    // aguardar inicialização principal
    setTimeout(() => {
        try {
            if (!window.AppState || !AppState.dados) return;
            const adm = AppState.dados.admissao;
            const periodos = Array.isArray(AppState.dados.periodosAquisitivos) ? AppState.dados.periodosAquisitivos : [];
            if (adm) {
                if (periodos.length === 0) {
                    const want = confirm('Detectei uma data de admissão salva, mas não há períodos aquisitivos. Deseja restaurar os períodos a partir da data de admissão agora?');
                    if (want) {
                        try { restaurarPeriodosFromAdmissao(); } catch(e) { console.error('Erro ao restaurar periodos via prompt inicial:', e); }
                    }
                } else {
                    // detectar subperiodos faltantes por período
                    try {
                        const map = {};
                        periodos.forEach(p => {
                            const idx = Number(p.periodoIndex) || 0;
                            if (!map[idx]) map[idx] = new Set();
                            map[idx].add(Number(p.subIndex) || 0);
                        });
                        // determinar divisões esperadas: preferir select 'divisoesPeriodo' se disponível
                        const divSel = document.getElementById('divisoesPeriodo');
                        const expectedDiv = divSel && divSel.value ? Math.max(1, Math.min(3, Number(divSel.value))) : null;
                        let missingFound = false;
                        Object.keys(map).forEach(k => {
                            const present = map[k];
                            const need = expectedDiv || Math.max(...Array.from(present)) || 1;
                            for (let s = 1; s <= need; s++) {
                                if (!present.has(s)) missingFound = true;
                            }
                        });
                        if (missingFound) {
                            const want = confirm('Foram detectados subperíodos faltantes em alguns Períodos. Deseja reconstruir apenas os subperíodos faltantes agora?');
                            if (want) {
                                try { reconstruirSubperiodosFaltantes(); } catch(e) { console.error('Erro ao reconstruir subperiodos:', e); }
                            }
                        }
                    } catch(e) { /* ignore */ }
                }
            }
        } catch(e) { /* ignore */ }
    }, 600);
});

// Reconstruir subperíodos que estiverem faltando para cada periodoIndex, preservando marcacoes existentes
function reconstruirSubperiodosFaltantes() {
    try {
        if (!AppState.dados || !AppState.dados.admissao) {
            mostrarAlertaGlobal('Não há data de admissão salva para reconstruir subperíodos.', 'warning');
            return false;
        }
        if (!Array.isArray(AppState.dados.periodosAquisitivos)) AppState.dados.periodosAquisitivos = [];

        const isoAdmissao = AppState.dados.admissao;
        const dtAd = DateUtils.parse(isoAdmissao);
        if (!dtAd) {
            mostrarAlertaGlobal('Data de admissão inválida.', 'error');
            return false;
        }

        // determinar divisões esperadas
        const divSel = document.getElementById('divisoesPeriodo');
        const expectedDiv = divSel && divSel.value ? Math.max(1, Math.min(3, Number(divSel.value))) : null;

        // mapa de periodoIndex -> Set(subIndex)
        const map = {};
        AppState.dados.periodosAquisitivos.forEach(p => {
            const pi = Number(p.periodoIndex) || 0;
            if (!map[pi]) map[pi] = new Set();
            map[pi].add(Number(p.subIndex) || 0);
        });

        const now = new Date();
        const maxYear = now.getFullYear() + 2;
        let added = 0;

        // para cada periodoIndex presente ou calculável, reconstruir subperiodos faltantes
        const periodoIndices = Object.keys(map).map(k => Number(k)).filter(n => n > 0).sort((a,b) => a-b);
        if (periodoIndices.length === 0) {
            mostrarAlertaGlobal('Nenhum período existente para reconstruir subperíodos.', 'info');
            return false;
        }

        periodoIndices.forEach(periodoIndex => {
            const present = map[periodoIndex] || new Set();
            const divis = expectedDiv || Math.max(...Array.from(present)) || 1;
            // calcular datas baseadas na admissão
            const inicio = new Date(dtAd.getFullYear() + (periodoIndex - 1), dtAd.getMonth(), dtAd.getDate());
            const termino = new Date(inicio.getFullYear() + 1, inicio.getMonth(), inicio.getDate());
            termino.setDate(termino.getDate() - 1);
            const limite = new Date(termino.getFullYear() + 1, termino.getMonth(), termino.getDate());

            for (let s = 1; s <= divis; s++) {
                if (!present.has(s)) {
                    AppState.dados.periodosAquisitivos.push({
                        id: gerarIdUnico(),
                        periodoIndex: periodoIndex,
                        inicio: DateUtils.getIsoDate(inicio),
                        termino: DateUtils.getIsoDate(termino),
                        limite: DateUtils.getIsoDate(limite),
                        subIndex: s,
                        subTotal: divis,
                        feriasInicio: '',
                        feriasFim: '',
                        adto13: '',
                        dias: null,
                        documento: ''
                    });
                    added++;
                }
            }
        });

        if (added > 0) {
            // ordenar por periodoIndex, subIndex
            AppState.dados.periodosAquisitivos.sort((a,b) => {
                if (a.periodoIndex !== b.periodoIndex) return Number(a.periodoIndex) - Number(b.periodoIndex);
                return Number(a.subIndex) - Number(b.subIndex);
            });
            AppState.save();
            renderizarPeriodosAquisitivosTable();
            mostrarAlertaGlobal(`Reconstruídos ${added} subperíodos faltantes.`, 'success');
            return true;
        } else {
            mostrarAlertaGlobal('Nenhum subperíodo faltante encontrado.', 'info');
            return false;
        }
    } catch (e) {
        console.error('Erro em reconstruirSubperiodosFaltantes:', e);
        mostrarAlertaGlobal('Erro ao reconstruir subperíodos. Veja console.', 'error');
        return false;
    }
}

// expor para console/debug
window.reconstruirSubperiodosFaltantes = reconstruirSubperiodosFaltantes;

// --- API grouping: expose a single namespace `App` with common action handlers.
// This groups previously-global functions under `App.actions` while keeping
// backward-compatible references on `window` for now. Later we can remove
// the legacy globals and call only `App.actions.*` from the UI.
(function(){
    try {
        window.App = window.App || {};
        App.actions = App.actions || {};
        const keys = [
            'limparFiltrosDashboard', 'toggleAnalytics', 'gerarTimesheetAcordo',
            'exportarTimesheetCSV','exportarTimesheetPDF','abrirModalRegistro',
            'exportarRegistrosCSV','exportarRegistrosPDF','salvarBackupLocal',
            'novoAcordo','abrirModalEvento','abrirModalNovoTipoEvento','exportarEventosExcel',
            'fecharModalRegistro','salvarRegistro','fecharModalAcordo','salvarAcordo',
            'scrollTableLeft','scrollTableRight','scrollTableLeftNoEvent','scrollTableRightNoEvent',
            'salvarEvento','fecharModalTiposEvento','adicionarNovoTipoEvento','triggerClick'
        ];

        // Copy originals to App.actions and keep legacy references under App.legacy
        App.legacy = App.legacy || {};
        keys.forEach(k => {
            if (typeof window[k] === 'function') {
                App.actions[k] = window[k];
                App.legacy[k] = window[k];
                try {
                    // remove from global scope to reduce surface area
                    try { delete window[k]; } catch(e) { window[k] = undefined; }
                } catch(e) { /* ignore */ }
            }
        });

        // Also expose a convenience entry point for delegated actions
        App.handleAction = function(actionName, id){
            try {
                if (App.actions && typeof App.actions[actionName] === 'function') {
                    if (typeof id !== 'undefined' && id !== null && id !== '') return App.actions[actionName](id);
                    return App.actions[actionName]();
                }
                // fallback: try window
                if (typeof window[actionName] === 'function') {
                    if (typeof id !== 'undefined' && id !== null && id !== '') return window[actionName](id);
                    return window[actionName]();
                }
                console.warn('App.handleAction: ação não encontrada', actionName);
            } catch (e) { console.error('Erro em App.handleAction', e); }
        };

        // Theme toggle action: toggles data-theme on the root element and persists choice
        App.actions.toggleTheme = function() {
            try {
                const cur = document.documentElement.getAttribute('data-theme');
                const next = cur === 'dark' ? 'light' : 'dark';
                if (next === 'dark') {
                    document.documentElement.setAttribute('data-theme','dark');
                    localStorage.setItem('theme','dark');
                } else {
                    document.documentElement.removeAttribute('data-theme');
                    localStorage.setItem('theme','light');
                }
                // update toggle button text (if present)
                const btn = document.getElementById('themeToggle');
                if (btn) btn.textContent = next === 'dark' ? 'Tema: Escuro' : 'Tema: Claro';
            } catch (e) { console.error('Erro ao alternar tema', e); }
        };

        // Apply saved theme on load
        try {
            const saved = localStorage.getItem('theme');
            if (saved === 'dark') document.documentElement.setAttribute('data-theme','dark');
        } catch(e){/* ignore */}

        // Accessibility: make non-interactive elements with `data-action` keyboard-focusable
        try {
            const actionEls = Array.from(document.querySelectorAll('[data-action]'));
            actionEls.forEach(el => {
                const tag = (el.tagName || '').toLowerCase();
                const isNativeFocusable = ['a','button','input','textarea','select'].includes(tag) || el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1';
                if (!isNativeFocusable) {
                    el.setAttribute('tabindex', '0');
                    if (!el.hasAttribute('role')) el.setAttribute('role','button');
                }
            });
        } catch (e) { /* ignore */ }

        // Accessibility: activate elements with `data-action` via Enter or Space keys
        document.addEventListener('keydown', function(ev){
            try {
                const key = ev.key || ev.code;
                if (!(key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Space')) return;
                const active = document.activeElement;
                if (!active) return;
                // skip if focus is in an input-like control
                const tag = (active.tagName || '').toLowerCase();
                if (['input','textarea','select'].includes(tag) || active.isContentEditable) return;
                const actionEl = active.closest ? active.closest('[data-action]') : (active.hasAttribute && active.hasAttribute('data-action') ? active : null);
                if (!actionEl) return;
                ev.preventDefault();
                const act = actionEl.dataset && actionEl.dataset.action;
                const id = actionEl.dataset && actionEl.dataset.id;
                if (!act) return;
                if (window.App && typeof window.App.handleAction === 'function') {
                    window.App.handleAction(act, id);
                } else if (typeof window[act] === 'function') {
                    if (typeof id !== 'undefined' && id !== null && id !== '') window[act](id);
                    else window[act]();
                }
            } catch (e) { /* ignore */ }
        });

        // We removed the direct globals above and kept originals under `App.legacy`.
        // The delegated handler added earlier now calls `App.handleAction`, so UI
        // attributes `data-action` will resolve against the names stored in `App.actions`.
    } catch (e) { console.error('Erro ao configurar namespace App:', e); }
})();

/**
 * Exportar atividades para Excel com TODOS os dados
 */
function exportarAtividadesExcel() {
    try {
        const atividades = AppState.dados.atividades || [];

        // If SheetJS (XLSX) is not available, fallback to CSV download
        if (typeof window.XLSX === 'undefined') {
            try {
                const headers = [
                    'ID','Ordem','TED/PTRAB','Objeto','Processo Principal','Assunto','Processo Solicitação',
                    'Data Doc','Tipo Doc','Nº Doc','Remetente','Destinatário','Ação a Realizar',
                    'Título','Descrição','Responsável','Prioridade','Prazo','Dias até prazo','Status',
                    'Progresso (%)','Tags','Tempo Estimado (min)','Tempo Gasto (min)','Nº Subtarefas',
                    'Nº Anexos','Nº Comentários','Lembrete (dias)','Lembrete (data/hora)','Observações','Finalizado',
                    'Criado em','Atualizado em'
                ];
                const rows = atividades.map(a => [
                    a.id || '',
                    a.ordem || '',
                    a.tedPtrab || '',
                    a.objeto || '',
                    a.processoPrincipal || '',
                    a.assunto || '',
                    a.processoSolicitacao || '',
                    a.dataDoc ? DateUtils.formatBR(a.dataDoc) : '',
                    a.tipoDoc || '',
                    a.numeroDoc || '',
                    a.remetente || '',
                    a.destinatario || '',
                    a.acaoRealizar || '',
                    a.titulo || '',
                    (a.descricao || '').replace(/\r?\n/g, ' '),
                    a.responsavel || '',
                    a.prioridade || '',
                    a.prazo ? DateUtils.formatBR(a.prazo) : '',
                    (typeof a.dias !== 'undefined' ? a.dias : ''),
                    a.status || '',
                    a.progresso || '',
                    (Array.isArray(a.tags) ? a.tags.join(';') : a.tags || ''),
                    a.tempoEstimadoMin || '',
                    a.tempoGastoMin || '',
                    (Array.isArray(a.subtarefas) ? a.subtarefas.length : ''),
                    (Array.isArray(a.anexos) ? a.anexos.length : ''),
                    (Array.isArray(a.comentarios) ? a.comentarios.length : ''),
                    a.lembreteDias || '',
                    a.lembreteHorario || '',
                    (a.observacoes || '').replace(/\r?\n/g, ' '),
                    a.finalizado ? 'Sim' : 'Não',
                    a.criadoEm || '',
                    a.atualizadoEm || ''
                ]);
                const all = [headers].concat(rows);
                const csv = all.map(r => r.map(cell => {
                    if (cell === null || typeof cell === 'undefined') return '';
                    const s = String(cell);
                    // escape quotes
                    if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
                        return '"' + s.replace(/"/g, '""') + '"';
                    }
                    return s;
                }).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const name = 'atividades_export_' + (new Date()).toISOString().slice(0,19).replace(/[:T]/g,'-') + '.csv';
                if (navigator.msSaveBlob) { navigator.msSaveBlob(blob, name); }
                else {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.setAttribute('download', name);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
                return;
            } catch (e) {
                console.error('Erro ao exportar atividades (fallback CSV):', e);
                alert('Erro ao exportar atividades: ' + (e && e.message ? e.message : e));
                return;
            }
        }

        // Criar worksheets separadas
        const wb = XLSX.utils.book_new();
        
        // ====== WORKSHEET 1: RESUMO (dados principais) - NA ORDEM DO FORMULÁRIO ======
        const dadosResumo = [
            ['ID', 'Ordem', 'TED/PTRAB', 'Objeto', 'Processo Principal', 'Assunto', 'Processo Solicitação', 
             'Data Doc', 'Tipo Doc', 'Nº Doc', 'Remetente', 'Destinário', 'Ação a Realizar',
             'Título', 'Descrição', 'Responsável', 'Prioridade', 'Prazo', 'Dias até prazo', 'Status', 
             'Progresso (%)', 'Tags', 'Tempo Estimado (min)', 'Tempo Gasto (min)', 'Nº Subtarefas', 
             'Nº Anexos', 'Nº Comentários', 'Lembrete (dias)', 'Lembrete (data/hora)', 'Observações', 'Finalizado', 
             'Criado em', 'Atualizado em'],
            ...atividades.map(a => [
                a.id || '',
                a.ordem || '',
                a.tedPtrab || '',
                a.objeto || '',
                a.processoPrincipal || '',
                a.assunto || '',
                a.processoSolicitacao || '',
                a.dataDoc ? DateUtils.formatBR(a.dataDoc) : '',
                a.tipoDoc || '',
                a.numeroDoc || '',
                a.remetente || '',
                a.destinatario || '',
                a.acaoRealizar || '',
                a.titulo || '',
                a.descricao || '',
                a.responsavel || '',
                a.prioridade || '',
                a.prazo ? DateUtils.formatBR(a.prazo) : '',
                a.dias || '',
                a.status || '',
                a.progresso || 0,
                (a.tags || []).join('; '),
                a.tempoEstimadoMin || 0,
                a.tempoGastoMin || 0,
                (a.subtarefas || []).length,
                (a.anexos || []).length,
                (a.comentarios || []).length,
                a.lembreteDias || '',
                a.lembreteHorario ? DateUtils.formatDateTime(a.lembreteHorario) : '',
                a.observacoes || '',
                a.finalizado ? 'Sim' : 'Não',
                a.criadoEm ? DateUtils.formatDateTime(a.criadoEm) : '',
                a.atualizadoEm ? DateUtils.formatDateTime(a.atualizadoEm) : ''
            ])
        ];
        
        const wsResumo = XLSX.utils.aoa_to_sheet(dadosResumo);
        wsResumo['!cols'] = [
            { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
            { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
            { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
            { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
            { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 16 }
        ];
        XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
        
        // ====== WORKSHEET 2: SUBTAREFAS ======
        const linhasSubtarefas = [];
        linhasSubtarefas.push(['ID Atividade', 'Título Atividade', 'Subtarefa', 'Concluída']);
        atividades.forEach(a => {
            if (a.subtarefas && a.subtarefas.length > 0) {
                a.subtarefas.forEach(sub => {
                    linhasSubtarefas.push([
                        a.id || '',
                        a.titulo || '',
                        sub.texto || (sub.label && sub.label.textContent) || '',
                        sub.concluida ? 'Sim' : 'Não'
                    ]);
                });
            }
        });
        if (linhasSubtarefas.length > 1) {
            const wsSubtarefas = XLSX.utils.aoa_to_sheet(linhasSubtarefas);
            wsSubtarefas['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 40 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, wsSubtarefas, 'Subtarefas');
        }
        
        // ====== WORKSHEET 3: ANEXOS ======
        const linhasAnexos = [];
        linhasAnexos.push(['ID Atividade', 'Título Atividade', 'Nome Arquivo', 'Tamanho (KB)', 'Link']);
        atividades.forEach(a => {
            if (a.anexos && a.anexos.length > 0) {
                a.anexos.forEach(anexo => {
                    linhasAnexos.push([
                        a.id || '',
                        a.titulo || '',
                        anexo.name || '',
                        Math.round((anexo.size || 0) / 1024),
                        anexo.data || ''
                    ]);
                });
            }
        });
        if (linhasAnexos.length > 1) {
            const wsAnexos = XLSX.utils.aoa_to_sheet(linhasAnexos);
            wsAnexos['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 40 }];
            XLSX.utils.book_append_sheet(wb, wsAnexos, 'Anexos');
        }
        
        // ====== WORKSHEET 4: COMENTÁRIOS ======
        const linhasComentarios = [];
        linhasComentarios.push(['ID Atividade', 'Título Atividade', 'Comentário', 'Criado em']);
        atividades.forEach(a => {
            if (a.comentarios && a.comentarios.length > 0) {
                a.comentarios.forEach(com => {
                    linhasComentarios.push([
                        a.id || '',
                        a.titulo || '',
                        com.texto || (com.textContent) || '',
                        com.criadoEm ? DateUtils.formatDateTime(com.criadoEm) : ''
                    ]);
                });
            }
        });
        if (linhasComentarios.length > 1) {
            const wsComentarios = XLSX.utils.aoa_to_sheet(linhasComentarios);
            wsComentarios['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 50 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(wb, wsComentarios, 'Comentários');
        }
        
        // Fazer download
        const nomeArquivo = `atividades_completo_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, nomeArquivo);
        console.log('Atividades exportadas com sucesso (completo)');
        Notifications.success(`${atividades.length} atividade(s) exportada(s)`);
    } catch (error) {
        console.error('Erro ao exportar atividades:', error);
        alert('Erro ao exportar atividades: ' + error.message);
    }
}

/**
 * Importar atividades do Excel
 */
function importarAtividadesExcel() {
    try {
        const input = document.getElementById('importarAtividadesInput');
        if (!input) {
            const newInput = document.createElement('input');
            newInput.type = 'file';
            newInput.id = 'importarAtividadesInput';
            newInput.accept = '.xlsx,.xls';
            newInput.style.display = 'none';
            newInput.onchange = procesarArquivoAtividadesExcel;
            document.body.appendChild(newInput);
            newInput.click();
        } else {
            input.onchange = procesarArquivoAtividadesExcel;
            input.click();
        }
    } catch (error) {
        console.error('Erro ao abrir diálogo de importação:', error);
        alert('Erro ao abrir arquivo: ' + error.message);
    }
}

/**
 * Processar arquivo Excel importado
 */
function procesarArquivoAtividadesExcel(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dados = e.target.result;
                const workbook = XLSX.read(dados, { type: 'binary' });
                const nomeAba = workbook.SheetNames[0];
                const ws = workbook.Sheets[nomeAba];
                const linhas = XLSX.utils.sheet_to_json(ws, { header: 1 });
                
                if (linhas.length < 2) {
                    alert('Arquivo Excel vazio ou inválido');
                    return;
                }
                
                // Mapear colunas pelo cabeçalho (case-insensitive, sem acentos)
                const cabecalho = linhas[0] || [];
                const normalizeHeader = (s) => {
                    if (s === undefined || s === null) return '';
                    return String(s).toLowerCase().trim()
                        .normalize('NFD').replace(/\p{Diacritic}/gu, '')
                        .replace(/[^a-z0-9]/g, '');
                };

                const headerMap = {};
                cabecalho.forEach((col, idx) => {
                    const key = normalizeHeader(col);
                    if (key) headerMap[key] = idx;
                });

                // Função auxiliar para obter índice a partir de múltiplas variantes
                const idxOf = (variants) => {
                    for (const v of variants) {
                        const k = normalizeHeader(v);
                        if (k && (k in headerMap)) return headerMap[k];
                    }
                    return -1;
                };

                // Colunas obrigatórias (aceitamos variantes sem acento)
                const obrigatorias = [ ['título','titulo','title'], ['status'], ['prioridade'] ];
                const faltando = [];
                obrigatorias.forEach(group => {
                    if (idxOf(group) === -1) faltando.push(group[0]);
                });
                if (faltando.length > 0) {
                    alert('Colunas obrigatórias faltando no arquivo: ' + faltando.join(', '));
                    return;
                }
                
                // Helpers para datas do Excel - converter DD/MM/AAAA ou DD-MM-AAAA para AAAA-MM-DD
                const brToIsoDate = (val) => {
                    if (val === undefined || val === null || val === '') return '';
                    const str = String(val).trim();
                    
                    // Tenta formatos: DD/MM/AAAA, DD-MM-AAAA, AAAA-MM-DD
                    let matches = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                    if (matches) {
                        const dia = String(matches[1]).padStart(2, '0');
                        const mes = String(matches[2]).padStart(2, '0');
                        const ano = matches[3];
                        return `${ano}-${mes}-${dia}`;
                    }
                    
                    // Se for AAAA-MM-DD já, devolve como está
                    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        return str;
                    }
                    
                    // Se for número (serial Excel)
                    if (!isNaN(val)) {
                        const d = new Date((val - 25569) * 86400 * 1000);
                        if (!isNaN(d.getTime())) {
                            const ano = d.getFullYear();
                            const mes = String(d.getMonth() + 1).padStart(2, '0');
                            const dia = String(d.getDate()).padStart(2, '0');
                            return `${ano}-${mes}-${dia}`;
                        }
                    }
                    
                    return '';
                };
                const brToIsoDateTime = (val) => {
                    if (val === undefined || val === null || val === '') return null;
                    const str = String(val).trim();
                    
                    // Tenta converter para data válida
                    let d = new Date(str);
                    if (isNaN(d.getTime())) {
                        // Se for número (serial Excel)
                        if (!isNaN(val)) {
                            d = new Date((val - 25569) * 86400 * 1000);
                        }
                    }
                    
                    return !isNaN(d.getTime()) ? d.toISOString() : null;
                };

                // Processar dados - IMPORTAR TODOS OS CAMPOS
                const novasAtividades = [];
                for (let i = 1; i < linhas.length; i++) {
                    const linha = linhas[i];
                    // considerar linha válida se existir qualquer célula com conteúdo
                    const rowHasData = (linha || []).some(c => c !== undefined && c !== null && String(c).toString().trim() !== '');
                    if (!rowHasData) continue;

                    // obter título a partir de variantes (com fallback em objeto/assunto/ted/ordem)
                    const idxTitulo = idxOf(['título','titulo','title']);
                    const valorTitulo = idxTitulo !== -1 ? linha[idxTitulo] : null;

                    const get = (variants) => {
                        const idx = idxOf(variants);
                        return idx === -1 ? undefined : linha[idx];
                    };

                    const tituloFallback = (get(['objeto','assunto','ted/ptrab','tedptrab','ordem']) || '').toString().trim();
                    const tituloFinal = (valorTitulo && String(valorTitulo).toString().trim()) ? String(valorTitulo).toString().trim() : (tituloFallback || `Atividade ${i}`);

                    const atividade = {
                        id: get(['id']) || generateId(),
                        ordem: String(get(['ordem']) || '').trim(),
                        tedPtrab: String(get(['ted/ptrab','tedptrab','tedptrab']) || '').trim(),
                        objeto: String(get(['objeto']) || '').trim(),
                        processoPrincipal: String(get(['processo principal','processoprincipal','processo']) || '').trim(),
                        assunto: String(get(['assunto']) || '').trim(),
                        processoSolicitacao: String(get(['processo solicitação','processosolicitacao']) || '').trim(),
                        dataDoc: brToIsoDate(get(['data doc','datadoc','data_documento']) || ''),
                        tipoDoc: String(get(['tipo doc','tipodoc']) || '').trim(),
                        numeroDoc: String(get(['nº doc','ndoc','numero','numdoc']) || '').trim(),
                        remetente: String(get(['remetente']) || '').trim(),
                        destinatario: String(get(['destinatario','destinario']) || '').trim(),
                        acaoRealizar: String(get(['ação a realizar','acao a realizar','acaoarealizar','acao']) || '').trim(),
                        titulo: String(tituloFinal || '').trim(),
                        descricao: String(get(['descrição','descricao','description']) || '').trim(),
                        responsavel: String(get(['responsável','responsavel']) || '').trim(),
                        prioridade: String(get(['prioridade']) || 'media').trim(),
                        prazo: brToIsoDate(get(['prazo']) || ''),
                        dias: Number(get(['dias até prazo','diasateprazo','dias']) || 0),
                        status: String(get(['status']) || 'pendente').trim(),
                        progresso: Number(get(['progresso (%)','progresso','progressopercent']) || 0),
                        tags: (String(get(['tags']) || '')).split(';').map(t => t.trim()).filter(Boolean),
                        tempoEstimadoMin: Number(get(['tempo estimado (min)','tempoestimado','tempoestimado(min)']) || 0),
                        tempoGastoMin: Number(get(['tempo gasto (min)','tempogasto','tempogasto(min)']) || 0),
                        lembreteDias: Number(get(['lembrete (dias)','lembretedias','lembrete']) || 0),
                        lembreteHorario: brToIsoDateTime(get(['lembrete (data/hora)','lembrete(data/hora)','lembretemin']) || ''),
                        observacoes: String(get(['observações','observacoes','observacao']) || '').trim(),
                        finalizado: (String(get(['finalizado']) || 'não')).toLowerCase() === 'sim',
                        subtarefas: [],
                        anexos: [],
                        comentarios: [],
                        criadoEm: new Date().toISOString(),
                        atualizadoEm: new Date().toISOString()
                    };

                    novasAtividades.push(atividade);
                }
                
                if (novasAtividades.length === 0) {
                    alert('Nenhuma atividade válida encontrada no arquivo');
                    return;
                }
                
                // Sempre substituir ao importar
                AppState.dados.atividades = novasAtividades;
                
                AppState.save();
                renderizarAtividades();
                
                // Limpar o input para permitir seleção do mesmo arquivo novamente
                event.target.value = '';
                
                Notifications.success(`${novasAtividades.length} atividade(s) importada(s) com sucesso!`);
            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                alert('Erro ao processar arquivo: ' + error.message);
            }
        };
        reader.readAsBinaryString(file);
    } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        alert('Erro ao ler arquivo: ' + error.message);
    }
}

/**
 * Gerar ID único
 */
function generateId() {
    return 'ativ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Inicializa campos de data para usar formato brasileiro (DD/MM/AAAA)
 * Converte automaticamente entre formato ISO (usado internamente) e BR (exibido)
 */
function initDateFieldsBR() {
    // Lista de todos os IDs de campos de data no sistema
    const dateFieldIds = [
        'dashboardDataInicio', 'dashboardDataFim',
        'atividadeDataDocInline', 'atividadePrazoInline',
        'dataAdmissao', 'dataRegistro',
        'modalFeriasInicio', 'modalFeriasFim',
        'periodoInicio', 'periodoFim',
        'regraInicio', 'regraFim',
        'atividadeDataDoc', 'atividadePrazo',
        'dataInicioEvento', 'dataFimEvento',
        'atividadeDataDocCompleta', 'atividadePrazoCompleta'
    ];

    dateFieldIds.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;

        // Mudar tipo para texto e adicionar máscara
        input.type = 'text';
        input.placeholder = 'DD/MM/AAAA';
        input.maxLength = 10;

        // Aplicar máscara enquanto digita
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
            
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length >= 5) {
                value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }
            
            e.target.value = value;
        });

        // Validar ao sair do campo
        input.addEventListener('blur', function(e) {
            const value = e.target.value.trim();
            if (!value) return;

            // Validar formato DD/MM/AAAA
            const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (!match) {
                Notifications.warning('Data inválida. Use o formato DD/MM/AAAA');
                e.target.classList.add('error');
                return;
            }

            const [, dia, mes, ano] = match;
            const d = parseInt(dia);
            const m = parseInt(mes);
            const a = parseInt(ano);

            // Validar valores
            if (d < 1 || d > 31 || m < 1 || m > 12 || a < 1900 || a > 2100) {
                Notifications.warning('Data inválida');
                e.target.classList.add('error');
                return;
            }

            e.target.classList.remove('error');
        });
    });
}

/**
 * Converte data DD/MM/AAAA para YYYY-MM-DD (formato ISO)
 */
function dateBrToIso(dataBr) {
    if (!dataBr) return '';
    const match = dataBr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return dataBr;
    const [, dia, mes, ano] = match;
    return `${ano}-${mes}-${dia}`;
}

/**
 * Converte data YYYY-MM-DD (formato ISO) para DD/MM/AAAA
 */
function dateIsoToBr(dataIso) {
    if (!dataIso) return '';
    const match = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return dataIso;
    const [, ano, mes, dia] = match;
    return `${dia}/${mes}/${ano}`;
}

// ============= BACKUP E RESTORE =============

/**
 * Executa backup de todos os dados do sistema
 * Baixa um arquivo JSON com timestamp
 */
function executarBackup() {
    try {
        if (!AppState.dados) {
            Notifications.warning('Nenhum dado para fazer backup');
            return;
        }

        // Gerar timestamp para o arquivo
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `ponto-backup-${timestamp}.json`;

        // Converter dados para JSON com formatação legível
        const jsonString = JSON.stringify(AppState.dados, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Criar link de download e simular clique
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Notifications.success(`✅ Backup realizado com sucesso!\nArquivo: ${filename}`);
    } catch (error) {
        console.error('Erro ao executar backup:', error);
        Notifications.error('Erro ao fazer backup: ' + error.message);
    }
}

/**
 * Abre dialog para seleção de arquivo de backup
 */
function selecionarArquivoRestaurar() {
    try {
        const fileInput = document.getElementById('inputRestaurarBackup');
        if (!fileInput) {
            Notifications.error('Elemento de input de arquivo não encontrado');
            return;
        }
        
        // Adicionar listener para quando arquivo for selecionado
        fileInput.onchange = function(event) {
            const file = event.target.files[0];
            if (file) {
                restaurarDoBackup(file);
            }
            // Limpar o input para permitir selecionar o mesmo arquivo novamente
            fileInput.value = '';
        };
        
        // Disparar clique para abrir dialog de seleção
        fileInput.click();
    } catch (error) {
        console.error('Erro ao abrir seletor de arquivo:', error);
        Notifications.error('Erro ao abrir seletor: ' + error.message);
    }
}

/**
 * Restaura dados a partir de um arquivo de backup
 * @param {File} file - Arquivo JSON de backup
 */
function restaurarDoBackup(file) {
    try {
        if (!file) {
            Notifications.warning('Nenhum arquivo selecionado');
            return;
        }

        // Validar tipo de arquivo
        if (!file.name.endsWith('.json')) {
            Notifications.error('Por favor, selecione um arquivo JSON válido');
            return;
        }

        // Ler arquivo
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                // Tentar fazer parse do JSON
                const jsonString = event.target.result;
                const dadosBackup = JSON.parse(jsonString);

                // Validar estrutura básica
                if (!dadosBackup || typeof dadosBackup !== 'object') {
                    throw new Error('Arquivo de backup inválido: não contém um objeto JSON válido');
                }

                // Tentar usar Storage.import para validar
                const validado = Storage.import(jsonString);
                if (!validado) {
                    throw new Error('Arquivo de backup não passou na validação');
                }

                // Perguntar confirmação ao usuário
                const confirmacao = confirm(
                    '⚠️ ATENÇÃO: Restaurar arquivo de backup substituirá COMPLETAMENTE todos os dados atuais.\n\n' +
                    'Dados que serão sobrescritos:\n' +
                    '- Registros de ponto\n' +
                    '- Eventos\n' +
                    '- Acordos\n' +
                    '- Atividades\n' +
                    '- Períodos aquisitivos\n' +
                    '- Todas as outras configurações\n\n' +
                    'Tem certeza que deseja continuar?'
                );

                if (!confirmacao) {
                    Notifications.info('Restauração cancelada');
                    return;
                }

                // Restaurar dados
                AppState.dados = validado;
                AppState.save();

                // Reinicializar a aplicação
                inicializar();

                Notifications.success('✅ Backup restaurado com sucesso!\nAplicação reinicializada.');
            } catch (error) {
                console.error('Erro ao restaurar backup:', error);
                Notifications.error('Erro ao restaurar: ' + error.message);
            }
        };

        reader.onerror = function() {
            Notifications.error('Erro ao ler arquivo');
        };

        reader.readAsText(file);
    } catch (error) {
        console.error('Erro ao processar arquivo de backup:', error);
        Notifications.error('Erro: ' + error.message);
    }
}

/**
 * Confirma e limpa completamente todos os dados do sistema
 */
function confirmarLimpezaCompleta() {
    try {
        // Primeira confirmação
        const confirmacao1 = confirm(
            '⚠️ ATENÇÃO - LIMPEZA COMPLETA:\n\n' +
            'Isso removerá PERMANENTEMENTE:\n' +
            '✗ Todos os registros de ponto\n' +
            '✗ Todos os eventos\n' +
            '✗ Todos os acordos\n' +
            '✗ Todas as atividades\n' +
            '✗ Todos os períodos aquisitivos\n' +
            '✗ Todas as configurações\n\n' +
            'Esta ação NÃO pode ser desfeita!\n\n' +
            'Tem CERTEZA que deseja continuar?'
        );

        if (!confirmacao1) {
            Notifications.info('Limpeza cancelada');
            return;
        }

        // Segunda confirmação para ter certeza absoluta
        const confirmacao2 = confirm(
            '⚠️ CONFIRMAÇÃO FINAL:\n\n' +
            'Você tem certeza absoluta que deseja APAGAR TUDO?'
        );

        if (!confirmacao2) {
            Notifications.info('Limpeza cancelada');
            return;
        }

        // Limpar localStorage
        Storage.clear();

        // Reinicializar aplicação com dados padrão
        AppState.reset();
        AppState.init();
        
        // Reinicializar interface
        inicializar();

        Notifications.success('✅ Todos os dados foram removidos.\nAplicação reinicializada com configurações padrão.');
    } catch (error) {
        console.error('Erro ao limpar dados:', error);
        Notifications.error('Erro ao limpar: ' + error.message);
    }
}


