/**
 * crm-store.js - Único arquivo que escreve em AppState.dados.crm
 *
 * Todo mutador passa por aqui (nunca mutar dados.crm diretamente em outro lugar).
 * Mutações que envolvem mais de um campo são agrupadas em `emLote()`, que suspende
 * o auto-save do Proxy (AppState._comAutoSaveSuspenso) durante o lote e dispara
 * UM único saveDebounced() ao final — evita saves em excesso e mantém o histórico
 * coerente com o estado final da operação.
 *
 * Depende de: AppState (app-refatorado.js), CrmModel e CrmCalculos (globais,
 * carregados antes deste arquivo).
 */
(function () {

    var LIMITE_HISTORICO_POR_ENTIDADE = 150;
    var LIMITE_HISTORICO_GLOBAL = 1500; // teto agregado — 150/entidade sozinho não basta com muitas entidades
    var PODAR_A_CADA_N_ESCRITAS = 20;
    var _contadorEscritasHistorico = 0;
    var LIMITE_TAMANHO_AVISO_BYTES = 700 * 1024; // Firestore limita o documento a ~1 MB

    function getCrm() {
        return (window.AppState && AppState.dados) ? AppState.dados.crm : null;
    }

    /**
     * Agrupa uma mutação num único save. Suspende o auto-save do Proxy durante
     * o callback e dispara um saveDebounced() explícito ao final.
     */
    function emLote(fn) {
        if (!window.AppState) { fn(); return; }
        AppState._comAutoSaveSuspenso(fn);
        AppState.saveDebounced();
    }

    /**
     * Garante que dados.crm existe e está na forma esperada. Roda uma vez na
     * inicialização do app (e após um import de backup). Só grava se algo mudou,
     * para não disparar um write no Firestore em toda abertura do app.
     */
    function ensureCrmDefault() {
        if (!window.AppState || !AppState.dados) return;

        var atual = AppState.dados.crm;
        var antes = JSON.stringify(atual || null);
        var normalizado = CrmModel.normalizarCrm(atual);

        if (!normalizado.funis.length) {
            var seed = CrmModel.funilDeTemplate('vendas');
            normalizado.funis.push(seed);
            normalizado.config.funilAtivoId = seed.id;
        }

        var depois = JSON.stringify(normalizado);
        if (depois !== antes) {
            AppState._comAutoSaveSuspenso(function () {
                AppState.dados.crm = normalizado;
            });
            AppState.saveDebounced();
        }
    }

    // ──────────────────────────────────────────────
    //  LEITURA
    // ──────────────────────────────────────────────

    function listarFunis() {
        var crm = getCrm();
        return crm ? crm.funis.slice() : [];
    }

    function getFunilAtivo() {
        var crm = getCrm();
        if (!crm) return null;
        return crm.funis.filter(function (f) { return f.id === crm.config.funilAtivoId; })[0] || crm.funis[0] || null;
    }

    function listarNegocios(funilId) {
        var crm = getCrm();
        if (!crm) return [];
        return funilId ? crm.negocios.filter(function (n) { return n.funilId === funilId; }) : crm.negocios.slice();
    }

    function listarPessoas() {
        var crm = getCrm();
        return crm ? crm.pessoas.slice() : [];
    }

    function listarOrganizacoes() {
        var crm = getCrm();
        return crm ? crm.organizacoes.slice() : [];
    }

    function historicoDe(entidade, entidadeId) {
        var crm = getCrm();
        if (!crm) return [];
        return CrmCalculos.timelineDe(crm.historico, entidade, entidadeId);
    }

    // ──────────────────────────────────────────────
    //  CONFIG DA ABA (funil ativo, visão, subaba, detalhe aberto)
    // ──────────────────────────────────────────────

    function setFunilAtivo(id) {
        var crm = getCrm();
        if (!crm) return;
        emLote(function () { crm.config.funilAtivoId = id; });
    }

    function setVisao(visao) {
        var crm = getCrm();
        if (!crm) return;
        emLote(function () { crm.config.visao = (visao === 'lista') ? 'lista' : 'kanban'; });
    }

    function setSubaba(subaba) {
        var crm = getCrm();
        if (!crm) return;
        emLote(function () { crm.config.subaba = subaba; });
    }

    function setDetalheAberto(id) {
        var crm = getCrm();
        if (!crm) return;
        emLote(function () { crm.config.detalheAbertoId = id || null; });
    }

    function setFiltros(filtros) {
        var crm = getCrm();
        if (!crm) return;
        emLote(function () {
            crm.config.filtros = Object.assign({}, crm.config.filtros, filtros || {});
        });
    }

    // ──────────────────────────────────────────────
    //  HISTÓRICO / NOTAS
    // ──────────────────────────────────────────────

    function registrarHistorico(entidade, entidadeId, tipo, texto, dadosExtra) {
        var crm = getCrm();
        if (!crm) return null;
        var item = {
            id: CrmModel.novoId('hst'),
            entidade: entidade,
            entidadeId: entidadeId,
            tipo: tipo,
            texto: texto || '',
            dados: dadosExtra || null,
            autor: '',
            editavel: (tipo === 'nota'),
            criadoEm: new Date().toISOString()
        };
        crm.historico.push(item);

        _contadorEscritasHistorico++;
        if (_contadorEscritasHistorico >= PODAR_A_CADA_N_ESCRITAS) {
            _contadorEscritasHistorico = 0;
            podarHistorico();
        }
        return item;
    }

    function adicionarNota(entidade, entidadeId, texto) {
        if (!texto || !String(texto).trim()) return null;
        var crm = getCrm();
        if (!crm) return null;
        var nota = null;
        emLote(function () {
            nota = registrarHistorico(entidade, entidadeId, 'nota', String(texto).trim());
        });
        return nota;
    }

    function editarNota(historicoId, novoTexto) {
        var crm = getCrm();
        if (!crm) return false;
        var item = crm.historico.filter(function (h) { return h.id === historicoId && h.editavel; })[0];
        if (!item) return false;
        emLote(function () {
            item.texto = novoTexto;
            item.editadoEm = new Date().toISOString();
        });
        return true;
    }

    function removerNota(historicoId) {
        var crm = getCrm();
        if (!crm) return false;
        var idx = -1;
        crm.historico.forEach(function (h, i) { if (h.id === historicoId && h.editavel) idx = i; });
        if (idx === -1) return false;
        emLote(function () { crm.historico.splice(idx, 1); });
        return true;
    }

    /**
     * Mantém no máximo LIMITE_HISTORICO_POR_ENTIDADE entradas por entidade
     * (e um teto agregado LIMITE_HISTORICO_GLOBAL, já que muitas entidades no
     * limite individual ainda somam um array grande), descartando as mais
     * antigas. Notas (editavel:true) nunca são descartadas — são conteúdo do
     * usuário, não log de auditoria.
     *
     * Faz UMA única reatribuição de `crm.historico` no fim, em vez de um
     * `splice()` por item removido: além de evitar o custo O(n²) de várias
     * remoções sequenciais num array grande, uma bateria de mutações incrementais
     * nesse volume chegou a estourar a pilha de chamadas do Proxy de auto-save
     * (`app-refatorado.js`) num teste de estresse — replicado mesmo fora do CRM,
     * então é uma fragilidade do mecanismo de proxy, não deste módulo; ver
     * item reportado separadamente. Uma atribuição única é o padrão mais seguro
     * disponível sem tocar nesse arquivo.
     */
    function podarHistorico() {
        var crm = getCrm();
        if (!crm || !crm.historico.length) return false;

        var porEntidade = {};
        var todos = [];
        for (var i = 0; i < crm.historico.length; i++) {
            var h = crm.historico[i];
            todos.push(h);
            var chave = h.entidade + ':' + h.entidadeId;
            (porEntidade[chave] = porEntidade[chave] || []).push(h);
        }

        var idsParaRemover = {};

        // 1) Teto por entidade
        Object.keys(porEntidade).forEach(function (chave) {
            var itens = porEntidade[chave]
                .slice()
                .sort(function (a, b) { return String(a.criadoEm).localeCompare(String(b.criadoEm)); });
            var podaveis = itens.filter(function (h) { return !h.editavel; });
            var excedente = podaveis.length - LIMITE_HISTORICO_POR_ENTIDADE;
            if (excedente > 0) {
                podaveis.slice(0, excedente).forEach(function (h) { idsParaRemover[h.id] = true; });
            }
        });

        // 2) Teto agregado — se ainda assim sobrar mais que LIMITE_HISTORICO_GLOBAL,
        //    descarta as entradas não-nota mais antigas de qualquer entidade.
        var sobreviventes = todos.filter(function (h) { return !idsParaRemover[h.id]; });
        if (sobreviventes.length > LIMITE_HISTORICO_GLOBAL) {
            var podaveisGlobal = sobreviventes
                .filter(function (h) { return !h.editavel; })
                .sort(function (a, b) { return String(a.criadoEm).localeCompare(String(b.criadoEm)); });
            var excedenteGlobal = sobreviventes.length - LIMITE_HISTORICO_GLOBAL;
            for (var k = 0; k < excedenteGlobal && k < podaveisGlobal.length; k++) {
                idsParaRemover[podaveisGlobal[k].id] = true;
            }
        }

        if (!Object.keys(idsParaRemover).length) return false;

        var mantidos = todos.filter(function (h) { return !idsParaRemover[h.id]; });
        emLote(function () {
            crm.historico = mantidos;
        });
        return true;
    }

    /**
     * Atualiza o indicador de tamanho do documento na aba Configurações.
     * O documento inteiro (não só o CRM) conta para o limite de ~1 MB do
     * Firestore, então mede-se AppState.dados como um todo.
     */
    function atualizarIndicadorTamanho() {
        if (!window.AppState || !AppState.dados) return;
        var elValor = document.getElementById('crmTamanhoDadosValor');
        var elAviso = document.getElementById('crmTamanhoDadosAviso');
        var tamanhoBytes;
        try {
            tamanhoBytes = JSON.stringify(AppState.dados).length;
        } catch (err) {
            // Documento grande demais para nem serializar — situação crítica,
            // mas ainda assim melhor avisar do que deixar o indicador travado.
            if (elValor) elValor.textContent = 'indisponível';
            if (elAviso) {
                elAviso.textContent = '⚠️ Não foi possível medir o tamanho dos dados — o documento pode estar grande demais. Exporte um backup e avalie limpar o histórico antigo.';
                elAviso.style.display = '';
            }
            return;
        }

        if (elValor) elValor.textContent = (tamanhoBytes / 1024).toFixed(1) + ' KB';
        if (elAviso) elAviso.style.display = (tamanhoBytes > LIMITE_TAMANHO_AVISO_BYTES) ? '' : 'none';
    }

    // ──────────────────────────────────────────────
    //  NEGÓCIOS
    // ──────────────────────────────────────────────

    function criarNegocio(dados) {
        var crm = getCrm();
        if (!crm) return null;
        var negocio = CrmModel.criarNegocio(dados);
        var irmaos = crm.negocios.filter(function (n) { return n.etapaId === negocio.etapaId; });
        negocio.ordem = irmaos.length;

        emLote(function () {
            crm.negocios.push(negocio);
            registrarHistorico('negocio', negocio.id, 'criacao', 'Negócio criado');
        });
        return negocio;
    }

    function atualizarNegocio(id, patch) {
        var crm = getCrm();
        if (!crm) return null;
        var n = crm.negocios.filter(function (x) { return x.id === id; })[0];
        if (!n) return null;

        var antes = {};
        CrmModel.CAMPOS_AUDITAVEIS_NEGOCIO.forEach(function (campo) { antes[campo] = n[campo]; });

        emLote(function () {
            Object.keys(patch || {}).forEach(function (campo) {
                if (campo === 'id') return;
                n[campo] = patch[campo];
            });
            n.atualizadoEm = new Date().toISOString();

            CrmModel.CAMPOS_AUDITAVEIS_NEGOCIO.forEach(function (campo) {
                if (Object.prototype.hasOwnProperty.call(patch || {}, campo) && antes[campo] !== n[campo]) {
                    registrarHistorico('negocio', id, 'campo',
                        'Campo "' + campo + '" alterado',
                        { campo: campo, de: antes[campo], para: n[campo] });
                }
            });
        });
        return n;
    }

    function removerNegocio(id) {
        var crm = getCrm();
        if (!crm) return false;
        var idx = -1;
        crm.negocios.forEach(function (n, i) { if (n.id === id) idx = i; });
        if (idx === -1) return false;
        emLote(function () {
            crm.negocios.splice(idx, 1);
            registrarHistorico('negocio', id, 'exclusao', 'Negócio excluído');
        });
        return true;
    }

    /**
     * Move um negócio para outra etapa (ou reordena na mesma), atualizando
     * status/dataFechamento derivados do tipo da etapa e registrando histórico
     * quando a etapa muda. Tudo num único lote/save.
     */
    function moverNegocio(id, etapaId, indice) {
        var crm = getCrm();
        if (!crm) return false;
        var n = crm.negocios.filter(function (x) { return x.id === id; })[0];
        if (!n) return false;
        var funil = crm.funis.filter(function (f) { return f.id === n.funilId; })[0];
        if (!funil) return false;
        var etapaAnt = funil.etapas.filter(function (e) { return e.id === n.etapaId; })[0] || null;
        var etapaNova = funil.etapas.filter(function (e) { return e.id === etapaId; })[0];
        if (!etapaNova) return false;

        emLote(function () {
            var etapaMudou = !etapaAnt || etapaAnt.id !== etapaNova.id;

            n.etapaId = etapaNova.id;
            n.status = (etapaNova.tipo === 'ganho') ? 'ganho' : (etapaNova.tipo === 'perdido' ? 'perdido' : 'aberto');
            if (n.status !== 'aberto' && !n.dataFechamento) {
                n.dataFechamento = new Date().toISOString().slice(0, 10);
            }
            if (n.status === 'aberto') {
                n.dataFechamento = null;
            }
            n.atualizadoEm = new Date().toISOString();

            var negociosCrus = crm.negocios.map(function (x) {
                return { id: x.id, etapaId: x.etapaId, ordem: x.ordem };
            });
            var novasOrdens = CrmCalculos.reordenarNaEtapa(negociosCrus, etapaNova.id, id, indice);
            novasOrdens.forEach(function (par) {
                var alvo = crm.negocios.filter(function (x) { return x.id === par.id; })[0];
                if (alvo) alvo.ordem = par.ordem;
            });

            if (etapaMudou) {
                registrarHistorico('negocio', id, 'etapa',
                    'Movido de "' + (etapaAnt ? etapaAnt.nome : '—') + '" para "' + etapaNova.nome + '"',
                    { campo: 'etapaId', de: etapaAnt ? etapaAnt.id : null, para: etapaNova.id });
            }
        });
        return true;
    }

    function marcarGanho(id) {
        var crm = getCrm();
        if (!crm) return false;
        var n = crm.negocios.filter(function (x) { return x.id === id; })[0];
        if (!n) return false;
        var funil = crm.funis.filter(function (f) { return f.id === n.funilId; })[0];
        if (!funil) return false;
        var etapaGanho = funil.etapas.filter(function (e) { return e.tipo === 'ganho'; })[0];
        return etapaGanho ? moverNegocio(id, etapaGanho.id, null) : false;
    }

    function marcarPerdido(id, motivo) {
        var crm = getCrm();
        if (!crm) return false;
        var n = crm.negocios.filter(function (x) { return x.id === id; })[0];
        if (!n) return false;
        var funil = crm.funis.filter(function (f) { return f.id === n.funilId; })[0];
        if (!funil) return false;
        var etapaPerdido = funil.etapas.filter(function (e) { return e.tipo === 'perdido'; })[0];
        if (!etapaPerdido) return false;
        var ok = moverNegocio(id, etapaPerdido.id, null);
        if (ok && motivo) {
            emLote(function () { n.motivoPerda = motivo; });
        }
        return ok;
    }

    // ──────────────────────────────────────────────
    //  PESSOAS
    // ──────────────────────────────────────────────

    function criarPessoa(dados) {
        var crm = getCrm();
        if (!crm) return null;
        var pessoa = CrmModel.criarPessoa(dados);
        emLote(function () {
            crm.pessoas.push(pessoa);
            registrarHistorico('pessoa', pessoa.id, 'criacao', 'Contato criado');
        });
        return pessoa;
    }

    function atualizarPessoa(id, patch) {
        var crm = getCrm();
        if (!crm) return null;
        var p = crm.pessoas.filter(function (x) { return x.id === id; })[0];
        if (!p) return null;
        emLote(function () {
            Object.keys(patch || {}).forEach(function (campo) {
                if (campo === 'id') return;
                p[campo] = patch[campo];
            });
            p.atualizadoEm = new Date().toISOString();
        });
        return p;
    }

    function removerPessoa(id) {
        var crm = getCrm();
        if (!crm) return false;
        var idx = -1;
        crm.pessoas.forEach(function (p, i) { if (p.id === id) idx = i; });
        if (idx === -1) return false;
        emLote(function () { crm.pessoas.splice(idx, 1); });
        return true;
    }

    // ──────────────────────────────────────────────
    //  ORGANIZAÇÕES
    // ──────────────────────────────────────────────

    function criarOrganizacao(dados) {
        var crm = getCrm();
        if (!crm) return null;
        var organizacao = CrmModel.criarOrganizacao(dados);
        emLote(function () {
            crm.organizacoes.push(organizacao);
            registrarHistorico('organizacao', organizacao.id, 'criacao', 'Organização criada');
        });
        return organizacao;
    }

    function atualizarOrganizacao(id, patch) {
        var crm = getCrm();
        if (!crm) return null;
        var o = crm.organizacoes.filter(function (x) { return x.id === id; })[0];
        if (!o) return null;
        emLote(function () {
            Object.keys(patch || {}).forEach(function (campo) {
                if (campo === 'id') return;
                o[campo] = patch[campo];
            });
            o.atualizadoEm = new Date().toISOString();
        });
        return o;
    }

    function removerOrganizacao(id) {
        var crm = getCrm();
        if (!crm) return false;
        var idx = -1;
        crm.organizacoes.forEach(function (o, i) { if (o.id === id) idx = i; });
        if (idx === -1) return false;
        emLote(function () { crm.organizacoes.splice(idx, 1); });
        return true;
    }

    // ──────────────────────────────────────────────
    //  FUNIS
    // ──────────────────────────────────────────────

    function criarFunil(dados) {
        var crm = getCrm();
        if (!crm) return null;
        var funil = (dados && dados.template) ? CrmModel.funilDeTemplate(dados.template) : CrmModel.criarFunil(dados);
        if (!funil) return null;
        if (dados && dados.nome) funil.nome = dados.nome;
        emLote(function () {
            crm.funis.push(funil);
            if (!crm.config.funilAtivoId) crm.config.funilAtivoId = funil.id;
        });
        return funil;
    }

    function atualizarFunil(id, patch) {
        var crm = getCrm();
        if (!crm) return null;
        var f = crm.funis.filter(function (x) { return x.id === id; })[0];
        if (!f) return null;
        emLote(function () {
            Object.keys(patch || {}).forEach(function (campo) {
                if (campo === 'id' || campo === 'etapas') return;
                f[campo] = patch[campo];
            });
            f.atualizadoEm = new Date().toISOString();
        });
        return f;
    }

    function definirEtapasFunil(funilId, etapasBrutas) {
        var crm = getCrm();
        if (!crm) return null;
        var f = crm.funis.filter(function (x) { return x.id === funilId; })[0];
        if (!f) return null;
        var etapas = (etapasBrutas || [])
            .map(function (e, idx) { return CrmModel.normalizarEtapa(e, idx); })
            .sort(function (a, b) { return a.ordem - b.ordem; });
        emLote(function () {
            f.etapas = etapas;
            f.atualizadoEm = new Date().toISOString();
        });
        return f;
    }

    function arquivarFunil(id, arquivado) {
        var crm = getCrm();
        if (!crm) return false;
        var f = crm.funis.filter(function (x) { return x.id === id; })[0];
        if (!f) return false;
        emLote(function () { f.arquivado = (arquivado !== false); });
        return true;
    }

    window.CrmStore = {
        ensureCrmDefault: ensureCrmDefault,
        getCrm: getCrm,
        atualizarIndicadorTamanho: atualizarIndicadorTamanho,

        listarFunis: listarFunis,
        getFunilAtivo: getFunilAtivo,
        listarNegocios: listarNegocios,
        listarPessoas: listarPessoas,
        listarOrganizacoes: listarOrganizacoes,
        historicoDe: historicoDe,

        setFunilAtivo: setFunilAtivo,
        setVisao: setVisao,
        setSubaba: setSubaba,
        setDetalheAberto: setDetalheAberto,
        setFiltros: setFiltros,

        registrarHistorico: registrarHistorico,
        adicionarNota: adicionarNota,
        editarNota: editarNota,
        removerNota: removerNota,
        podarHistorico: podarHistorico,

        criarNegocio: criarNegocio,
        atualizarNegocio: atualizarNegocio,
        removerNegocio: removerNegocio,
        moverNegocio: moverNegocio,
        marcarGanho: marcarGanho,
        marcarPerdido: marcarPerdido,

        criarPessoa: criarPessoa,
        atualizarPessoa: atualizarPessoa,
        removerPessoa: removerPessoa,

        criarOrganizacao: criarOrganizacao,
        atualizarOrganizacao: atualizarOrganizacao,
        removerOrganizacao: removerOrganizacao,

        criarFunil: criarFunil,
        atualizarFunil: atualizarFunil,
        definirEtapasFunil: definirEtapasFunil,
        arquivarFunil: arquivarFunil,

        emLote: emLote
    };
})();
