/**
 * crm-ui.js - Orquestração da aba de Relacionamento (CRM)
 * Popula o seletor de funil, o resumo, alterna visão/subaba, os modais de
 * CRUD e concentra o listener delegado de toda a seção — inclusive dos modais,
 * que vivem fora de #crm no DOM. Por isso o listener é ligado em `document`,
 * filtrado pelo atributo `data-crm-action` (nunca use onclick inline aqui —
 * ver risco de XSS documentado no plano).
 */
(function () {
    var esc = Utils.escapeHtml.bind(Utils);

    // Notifications é um `const` de topo (notifications.js), não fica em `window`.
    // Usar sempre a versão não-bloqueante do app (nunca alert()/confirm() nativos,
    // que travam a aba inteira até o usuário clicar OK).
    function mostrarErro(mensagem) {
        if (typeof Notifications !== 'undefined' && Notifications.error) Notifications.error(mensagem);
        else console.error('CRM:', mensagem);
    }

    function confirmarExclusao(mensagem, aoConfirmar) {
        if (typeof Notifications !== 'undefined' && Notifications.confirm) {
            Notifications.confirm(mensagem, aoConfirmar);
        } else {
            aoConfirmar();
        }
    }

    // DateUtils também é um `const` de topo (dateUtils.js) — `window.DateUtils`
    // não existe; checar pela variável global via typeof.
    function dataBR(iso) {
        if (!iso) return '—';
        return (typeof DateUtils !== 'undefined' && DateUtils.formatBR) ? DateUtils.formatBR(iso) : iso;
    }

    function secao() {
        return document.getElementById('crm');
    }

    // ──────────────────────────────────────────────
    //  RENDER PRINCIPAL
    // ──────────────────────────────────────────────

    function renderizar() {
        var crm = window.CrmStore && CrmStore.getCrm();
        if (!crm) return;

        // Reabre o detalhe persistido — exceto se o negócio foi para a lixeira
        if (crm.config.detalheAbertoId && crm.negocios.some(function (n) { return n.id === crm.config.detalheAbertoId && !n.excluidoEm; })) {
            abrirDetalhe(crm.config.detalheAbertoId, { semPersistir: true });
            return;
        }

        mostrarViewPrincipal();
        renderizarSelectFunil();
        renderizarSubabas();
        renderizarResumo();
        renderizarConteudoAtivo();
    }

    function renderizarSelectFunil() {
        var crm = CrmStore.getCrm();
        var select = document.getElementById('crmSelectFunil');
        if (!select) return;
        var funis = CrmStore.listarFunis().filter(function (f) { return !f.arquivado; });
        select.innerHTML = funis.map(function (f) {
            var selecionado = (f.id === crm.config.funilAtivoId) ? ' selected' : '';
            return '<option value="' + esc(f.id) + '"' + selecionado + '>' + esc(f.nome) + '</option>';
        }).join('');
    }

    function renderizarSubabas() {
        var crm = CrmStore.getCrm();
        var container = document.getElementById('crmSubabas');
        if (container) {
            container.querySelectorAll('[data-crm-action="subaba"]').forEach(function (btn) {
                btn.classList.toggle('active', btn.dataset.valor === crm.config.subaba);
            });
        }
        document.querySelectorAll('[data-crm-action="visao"]').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.valor === crm.config.visao);
        });

        // .btn-secondary tem `display: inline-flex !important` (ponto-imbel.css), que
        // sobrepõe um simples style.display='none' inline — por isso o !important aqui.
        var btnContato = document.getElementById('crmBtnNovoContato');
        var btnOrganizacao = document.getElementById('crmBtnNovaOrganizacao');
        if (btnContato) {
            if (crm.config.subaba === 'pessoas') btnContato.style.removeProperty('display');
            else btnContato.style.setProperty('display', 'none', 'important');
        }
        if (btnOrganizacao) {
            if (crm.config.subaba === 'organizacoes') btnOrganizacao.style.removeProperty('display');
            else btnOrganizacao.style.setProperty('display', 'none', 'important');
        }
    }

    function renderizarResumo() {
        var crm = CrmStore.getCrm();
        var el = document.getElementById('crmResumo');
        if (!el) return;
        var funil = CrmStore.getFunilAtivo();
        if (!funil) { el.innerHTML = ''; return; }

        var negocios = CrmStore.listarNegocios(funil.id);
        var resumo = CrmCalculos.resumoFunil(negocios);
        var mostrarValor = funil.mostrarValor !== false;

        var itens = [
            '<div class="crm-resumo-item"><span class="crm-resumo-valor">' + resumo.total + '</span><span class="crm-resumo-label">Total</span></div>',
            '<div class="crm-resumo-item"><span class="crm-resumo-valor">' + resumo.abertos + '</span><span class="crm-resumo-label">Em aberto</span></div>',
            '<div class="crm-resumo-item"><span class="crm-resumo-valor">' + resumo.ganhos + '</span><span class="crm-resumo-label">Ganhos</span></div>',
            '<div class="crm-resumo-item"><span class="crm-resumo-valor">' + resumo.perdidos + '</span><span class="crm-resumo-label">Perdidos</span></div>'
        ];
        if (mostrarValor) {
            itens.push('<div class="crm-resumo-item"><span class="crm-resumo-valor">' + esc(CrmCalculos.formatarMoeda(resumo.valorAberto, funil.moeda)) + '</span><span class="crm-resumo-label">Em aberto (R$)</span></div>');
            itens.push('<div class="crm-resumo-item"><span class="crm-resumo-valor">' + esc(CrmCalculos.formatarMoeda(resumo.ticketMedio, funil.moeda)) + '</span><span class="crm-resumo-label">Ticket médio</span></div>');
        }
        el.innerHTML = itens.join('');
    }

    // Preferências de sessão da barra de negócios (não persistidas: normalizarConfig
    // manteria só busca/responsavel/status nos filtros).
    var _mostrarFechados = false;
    var _ordenarPor = 'proxima';

    /**
     * Negócios do funil ativo já com filtro de busca, filtro de fechados e
     * ordenação aplicados — fonte única para Kanban, Lista e Previsão.
     */
    function negociosVisiveis() {
        var crm = CrmStore.getCrm();
        var funil = CrmStore.getFunilAtivo();
        if (!funil) return [];
        var negocios = CrmStore.listarNegocios(funil.id);
        var filtros = crm.config.filtros || {};
        if (filtros.busca) negocios = CrmCalculos.filtrarNegocios(negocios, filtros);
        if (!_mostrarFechados) negocios = negocios.filter(function (n) { return n.status === 'aberto'; });

        if (_ordenarPor === 'proxima') {
            var atividades = CrmStore.listarAtividades();
            negocios = negocios.slice().sort(function (a, b) {
                var pa = CrmCalculos.proximaAtividade(atividades, a.id);
                var pb = CrmCalculos.proximaAtividade(atividades, b.id);
                return String(pa ? pa.data : '9999').localeCompare(String(pb ? pb.data : '9999'));
            });
        } else {
            negocios = CrmCalculos.ordenarNegocios(negocios, _ordenarPor);
        }
        return negocios;
    }

    function renderizarConteudoAtivo() {
        var crm = CrmStore.getCrm();
        var subaba = crm.config.subaba;
        var visao = crm.config.visao;

        var mapa = {
            crmKanban: (subaba === 'negocios' && visao === 'kanban'),
            crmListaNegocios: (subaba === 'negocios' && visao === 'lista'),
            crmPrevisao: (subaba === 'negocios' && visao === 'previsao'),
            crmExcluidos: (subaba === 'negocios' && visao === 'excluidos'),
            crmListaPessoas: (subaba === 'pessoas'),
            crmListaOrganizacoes: (subaba === 'organizacoes')
        };
        Object.keys(mapa).forEach(function (idEl) {
            var el = document.getElementById(idEl);
            if (el) el.style.display = mapa[idEl] ? 'block' : 'none';
        });

        var barraNegocios = document.getElementById('crmBarraNegocios');
        var barraContatos = document.getElementById('crmBarraContatos');
        var resumo = document.getElementById('crmResumo');
        if (barraNegocios) barraNegocios.style.display = (subaba === 'negocios') ? '' : 'none';
        if (barraContatos) barraContatos.style.display = (subaba !== 'negocios') ? '' : 'none';
        if (resumo) resumo.style.display = (subaba === 'negocios') ? '' : 'none';

        var contagem = document.getElementById('crmContagem');
        if (contagem) {
            var funilContagem = CrmStore.getFunilAtivo();
            var total = funilContagem ? CrmStore.listarNegocios(funilContagem.id).length : 0;
            contagem.textContent = total + (total === 1 ? ' negócio' : ' negócios');
        }

        if (mapa.crmKanban && window.CrmKanban) {
            CrmKanban.renderizarBoard(CrmStore.getFunilAtivo(), negociosVisiveis(), {
                atividades: CrmStore.listarAtividades()
            });
        }
        if (mapa.crmListaNegocios) renderizarListaNegocios();
        if (mapa.crmPrevisao) renderizarPrevisao();
        if (mapa.crmExcluidos) renderizarExcluidos();
        if (subaba === 'pessoas') renderizarListaPessoas();
        if (subaba === 'organizacoes') renderizarListaOrganizacoes();
    }

    // ──────────────────────────────────────────────
    //  LISTAS (visão Lista de negócios, Contatos, Organizações)
    // ──────────────────────────────────────────────

    function descreverProximaAtividade(atividades, negocioId) {
        var prox = CrmCalculos.proximaAtividade(atividades, negocioId);
        if (!prox) return '<span class="crm-alerta-atividade" title="Nenhuma atividade agendada">⚠️ Nenhuma</span>';
        var tipo = (CrmModel.TIPOS_ATIVIDADE[prox.tipo] || {});
        return esc((tipo.icone ? tipo.icone + ' ' : '') + dataBR(prox.data) + (prox.horaInicio ? ' ' + prox.horaInicio : ''));
    }

    function renderizarListaNegocios() {
        var el = document.getElementById('crmListaNegocios');
        if (!el) return;
        var crm = CrmStore.getCrm();
        var funil = CrmStore.getFunilAtivo();
        if (!funil) { el.innerHTML = '<div class="crm-empty">Crie um funil para começar.</div>'; return; }

        var mostrarValor = funil.mostrarValor !== false;
        var negocios = negociosVisiveis();
        var atividades = CrmStore.listarAtividades();

        var etapasPorId = {};
        funil.etapas.forEach(function (e) { etapasPorId[e.id] = e; });

        var linhas = negocios.map(function (n) {
            var etapa = etapasPorId[n.etapaId];
            var org = crm.organizacoes.filter(function (o) { return o.id === n.organizacaoId; })[0];
            var pessoa = crm.pessoas.filter(function (p) { return p.id === n.pessoaId; })[0];
            return '' +
                '<tr>' +
                    '<td><span class="crm-link" data-crm-action="abrirDetalhe" data-id="' + esc(n.id) + '">' + esc(n.titulo || '(sem título)') + '</span></td>' +
                    '<td>' + esc(n.origem || '—') + '</td>' +
                    '<td>' + esc(etapa ? etapa.nome : '—') + '</td>' +
                    (mostrarValor ? '<td>' + esc(n.valor != null ? CrmCalculos.formatarMoeda(n.valor, n.moeda) : '—') + '</td>' : '') +
                    '<td>' + esc(org ? org.nome : '—') + '</td>' +
                    '<td>' + esc(pessoa ? pessoa.nome : '—') + '</td>' +
                    '<td>' + esc(dataBR(n.dataPrevisao)) + '</td>' +
                    '<td>' + descreverProximaAtividade(atividades, n.id) + '</td>' +
                    '<td>' + esc(n.responsavel || '—') + '</td>' +
                    '<td>' +
                        '<button type="button" class="btn-secondary" data-crm-action="editarNegocio" data-id="' + esc(n.id) + '">Editar</button>' +
                    '</td>' +
                '</tr>';
        }).join('');

        el.innerHTML = '' +
            '<div class="table-container">' +
                '<table>' +
                    '<thead><tr>' +
                        '<th>Título</th><th>Origem</th><th>Etapa</th>' +
                        (mostrarValor ? '<th>Valor</th>' : '') +
                        '<th>Organização</th><th>Pessoa de contato</th><th>Fechamento esperado</th><th>Próxima atividade</th><th>Proprietário</th><th>Ações</th>' +
                    '</tr></thead>' +
                    '<tbody>' + (linhas || '<tr><td colspan="10">Nenhum negócio neste funil.</td></tr>') + '</tbody>' +
                '</table>' +
            '</div>';
    }

    /**
     * Visão Previsão: colunas por mês da data de fechamento esperada,
     * com soma por mês (se o funil usa valor). Sem data → coluna final.
     */
    function renderizarPrevisao() {
        var el = document.getElementById('crmPrevisao');
        if (!el) return;
        var crm = CrmStore.getCrm();
        var funil = CrmStore.getFunilAtivo();
        if (!funil) { el.innerHTML = '<div class="crm-empty">Crie um funil para começar.</div>'; return; }

        var mostrarValor = funil.mostrarValor !== false;
        var grupos = CrmCalculos.agruparPorMesFechamento(negociosVisiveis());
        var atividades = CrmStore.listarAtividades();
        var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

        if (!grupos.length) {
            el.innerHTML = '<div class="crm-empty">Nenhum negócio para prever.</div>';
            return;
        }

        var colunas = grupos.map(function (g) {
            var rotulo = g.mes
                ? (MESES[Number(g.mes.slice(5, 7)) - 1] + ' de ' + g.mes.slice(0, 4))
                : 'Sem data definida';
            var soma = CrmCalculos.somarValor(g.negocios);
            var cards = g.negocios.map(function (n) {
                var org = crm.organizacoes.filter(function (o) { return o.id === n.organizacaoId; })[0];
                return '' +
                    '<div class="kanban-card crm-card" data-crm-action="abrirDetalhe" data-id="' + esc(n.id) + '">' +
                        '<strong>' + esc(n.titulo || '(sem título)') + '</strong>' +
                        ((mostrarValor && n.valor != null) ? '<div class="crm-card-valor">' + esc(CrmCalculos.formatarMoeda(n.valor, n.moeda)) + '</div>' : '') +
                        (org ? '<div class="small-text">' + esc(org.nome) + '</div>' : '') +
                        '<div class="small-text">' + descreverProximaAtividade(atividades, n.id) + '</div>' +
                    '</div>';
            }).join('');
            return '' +
                '<div class="kanban-column crm-column crm-col-previsao">' +
                    '<h4>' +
                        '<span class="crm-col-nome">' + esc(rotulo) + '</span>' +
                        '<span class="crm-col-count">' + g.negocios.length + '</span>' +
                        (mostrarValor ? '<span class="crm-col-soma">' + esc(CrmCalculos.formatarMoeda(soma, funil.moeda)) + '</span>' : '') +
                    '</h4>' +
                    '<div class="kanban-list">' + cards + '</div>' +
                '</div>';
        }).join('');

        el.innerHTML = '<div class="kanban-board crm-board">' + colunas + '</div>';
    }

    /** Visão Excluídos: lixeira com restaurar / excluir definitivamente. */
    function renderizarExcluidos() {
        var el = document.getElementById('crmExcluidos');
        if (!el) return;
        var funil = CrmStore.getFunilAtivo();
        var crm = CrmStore.getCrm();
        var excluidos = funil ? CrmStore.listarNegociosExcluidos(funil.id) : [];

        var etapasPorId = {};
        if (funil) funil.etapas.forEach(function (e) { etapasPorId[e.id] = e; });

        var linhas = excluidos.map(function (n) {
            var etapa = etapasPorId[n.etapaId];
            var org = crm.organizacoes.filter(function (o) { return o.id === n.organizacaoId; })[0];
            return '' +
                '<tr>' +
                    '<td>' + esc(n.titulo || '(sem título)') + '</td>' +
                    '<td>' + esc(org ? org.nome : '—') + '</td>' +
                    '<td>' + esc(etapa ? etapa.nome : '—') + '</td>' +
                    '<td>' + esc(formatarDataHora(n.excluidoEm)) + '</td>' +
                    '<td>' +
                        '<button type="button" class="btn-secondary" data-crm-action="restaurarNegocio" data-id="' + esc(n.id) + '">Restaurar</button> ' +
                        '<button type="button" class="btn-danger" data-crm-action="excluirDefinitivo" data-id="' + esc(n.id) + '">Excluir de vez</button>' +
                    '</td>' +
                '</tr>';
        }).join('');

        el.innerHTML = '' +
            '<div class="table-container">' +
                '<table>' +
                    '<thead><tr><th>Título</th><th>Organização</th><th>Etapa</th><th>Excluído em</th><th>Ações</th></tr></thead>' +
                    '<tbody>' + (linhas || '<tr><td colspan="5">A lixeira está vazia.</td></tr>') + '</tbody>' +
                '</table>' +
            '</div>';
    }

    function renderizarListaPessoas() {
        var el = document.getElementById('crmListaPessoas');
        if (!el) return;
        var crm = CrmStore.getCrm();
        var pessoas = CrmStore.listarPessoas();
        var negociosAtivos = CrmStore.listarNegocios();
        var atividades = CrmStore.listarAtividades();

        var linhas = pessoas.map(function (p) {
            var org = crm.organizacoes.filter(function (o) { return o.id === p.organizacaoId; })[0];
            var negociosPessoa = CrmCalculos.negociosDaPessoa(negociosAtivos, p.id);
            var fechados = negociosPessoa.filter(function (n) { return n.status !== 'aberto'; }).length;
            var abertos = negociosPessoa.filter(function (n) { return n.status === 'aberto'; });
            var etiquetas = (p.tags || []).map(function (t) { return '<span class="crm-tag">' + esc(t) + '</span>'; }).join(' ');

            // Próxima atividade entre os negócios abertos desta pessoa
            var proxima = null;
            abertos.forEach(function (n) {
                var pa = CrmCalculos.proximaAtividade(atividades, n.id);
                if (pa && (!proxima || String(pa.data) < String(proxima.data))) proxima = pa;
            });

            return '' +
                '<tr>' +
                    '<td>' + esc(p.nome || '(sem nome)') + '</td>' +
                    '<td>' + esc(org ? org.nome : '—') + '</td>' +
                    '<td>' + (etiquetas || '—') + '</td>' +
                    '<td>' + esc(p.email || '—') + '</td>' +
                    '<td>' + esc(p.telefone || '—') + '</td>' +
                    '<td>' + fechados + '</td>' +
                    '<td>' + abertos.length + '</td>' +
                    '<td>' + (proxima ? esc(dataBR(proxima.data)) : '—') + '</td>' +
                    '<td>' +
                        '<button type="button" class="btn-secondary" data-crm-action="editarPessoa" data-id="' + esc(p.id) + '">Editar</button>' +
                    '</td>' +
                '</tr>';
        }).join('');

        el.innerHTML = '' +
            '<div class="table-container">' +
                '<table>' +
                    '<thead><tr><th>Nome</th><th>Organização</th><th>Etiquetas</th><th>E-mail</th><th>Telefone</th><th>Negócios fechados</th><th>Negócios em aberto</th><th>Próxima atividade</th><th>Ações</th></tr></thead>' +
                    '<tbody>' + (linhas || '<tr><td colspan="9">Nenhum contato cadastrado.</td></tr>') + '</tbody>' +
                '</table>' +
            '</div>';
    }

    function renderizarListaOrganizacoes() {
        var el = document.getElementById('crmListaOrganizacoes');
        if (!el) return;
        var crm = CrmStore.getCrm();
        var organizacoes = CrmStore.listarOrganizacoes();

        var negociosAtivosOrg = CrmStore.listarNegocios();
        var linhas = organizacoes.map(function (o) {
            var negociosOrg = CrmCalculos.negociosDaOrganizacao(negociosAtivosOrg, o.id);
            var abertos = negociosOrg.filter(function (n) { return n.status === 'aberto'; });
            var valorAberto = CrmCalculos.somarValor(abertos);
            var nContatos = crm.pessoas.filter(function (p) { return p.organizacaoId === o.id; }).length;
            return '' +
                '<tr>' +
                    '<td>' + esc(o.nome || '(sem nome)') + '</td>' +
                    '<td>' + esc(o.cnpj || '—') + '</td>' +
                    '<td>' + esc(o.site || '—') + '</td>' +
                    '<td>' + nContatos + '</td>' +
                    '<td>' + abertos.length + '</td>' +
                    '<td>' + esc(CrmCalculos.formatarMoeda(valorAberto)) + '</td>' +
                    '<td>' +
                        '<button type="button" class="btn-secondary" data-crm-action="editarOrganizacao" data-id="' + esc(o.id) + '">Editar</button>' +
                    '</td>' +
                '</tr>';
        }).join('');

        el.innerHTML = '' +
            '<div class="table-container">' +
                '<table>' +
                    '<thead><tr><th>Nome</th><th>CNPJ</th><th>Site</th><th>Contatos</th><th>Negócios abertos</th><th>Valor em aberto</th><th>Ações</th></tr></thead>' +
                    '<tbody>' + (linhas || '<tr><td colspan="7">Nenhuma organização cadastrada.</td></tr>') + '</tbody>' +
                '</table>' +
            '</div>';
    }

    // ──────────────────────────────────────────────
    //  NAVEGAÇÃO SEM ROUTER: alterna sub-view dentro da mesma <section>
    // ──────────────────────────────────────────────

    function mostrarViewPrincipal() {
        var principal = document.getElementById('crmViewPrincipal');
        var detalhe = document.getElementById('crmViewDetalhe');
        if (principal) principal.style.display = 'block';
        if (detalhe) detalhe.style.display = 'none';
    }

    var _detalheAtualId = null;

    function abrirDetalhe(id, opcoes) {
        opcoes = opcoes || {};
        if (!opcoes.semPersistir) CrmStore.setDetalheAberto(id);

        // Só limpa o estado de "nota em edição" ao navegar para OUTRO negócio —
        // reabrirDetalheAtual() chama esta função para o mesmo id a cada ação
        // (mover etapa, registrar nota, etc.) e não pode perder essa edição em curso.
        if (id !== _detalheAtualId) _notaEmEdicaoId = null;
        _detalheAtualId = id;

        var principal = document.getElementById('crmViewPrincipal');
        var detalhe = document.getElementById('crmViewDetalhe');
        if (principal) principal.style.display = 'none';
        if (detalhe) {
            detalhe.style.display = 'block';
            renderizarDetalhe(detalhe, id);
        }
        window.scrollTo(0, 0);
    }

    function voltarDaLista() {
        CrmStore.setDetalheAberto(null);
        _detalheAtualId = null;
        _notaEmEdicaoId = null;
        renderizar();
    }

    function reabrirDetalheAtual() {
        var crm = CrmStore.getCrm();
        if (crm && crm.config.detalheAbertoId) abrirDetalhe(crm.config.detalheAbertoId, { semPersistir: true });
    }

    function formatarDataHora(iso) {
        if (!iso) return '';
        try { return new Date(iso).toLocaleString('pt-BR'); } catch (_) { return iso; }
    }

    var _notaEmEdicaoId = null;

    var ICONES_HISTORICO = {
        criacao: '✨', etapa: '➡️', campo: '✏️', nota: '📝', status: '🚩', exclusao: '🗑️', vinculo: '🔗', atividade: '📅'
    };

    function renderizarTimelineItem(h) {
        var icone = ICONES_HISTORICO[h.tipo] || '•';

        if (h.editavel && h.id === _notaEmEdicaoId) {
            return '' +
                '<div class="crm-timeline-item">' +
                    '<div class="crm-timeline-icone">' + icone + '</div>' +
                    '<div class="crm-timeline-corpo">' +
                        '<textarea id="crmNotaEditTexto" rows="2" style="width:100%;">' + esc(h.texto) + '</textarea>' +
                        '<div style="margin-top:4px;">' +
                            '<button type="button" class="btn-primary" data-crm-action="salvarNota" data-id="' + esc(h.id) + '">Salvar</button> ' +
                            '<button type="button" class="btn-secondary" data-crm-action="cancelarEdicaoNota">Cancelar</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        }

        var acoesHtml = h.editavel ?
            (' <button type="button" class="btn-secondary" data-crm-action="editarNota" data-id="' + esc(h.id) + '" style="font-size:11px;">Editar</button>' +
             ' <button type="button" class="btn-secondary" data-crm-action="removerNotaDetalhe" data-id="' + esc(h.id) + '" style="font-size:11px;">Excluir</button>') : '';

        return '' +
            '<div class="crm-timeline-item">' +
                '<div class="crm-timeline-icone">' + icone + '</div>' +
                '<div class="crm-timeline-corpo">' +
                    '<div class="crm-timeline-texto">' + esc(h.texto) + '</div>' +
                    '<div class="crm-timeline-meta">' + esc(formatarDataHora(h.criadoEm)) + acoesHtml + '</div>' +
                '</div>' +
            '</div>';
    }

    // Estado de sessão da tela de detalhe (padrão Pipedrive)
    var _abaDetalhe = 'atividade';           // 'atividade' | 'anotacoes'
    var _filtroHistorico = 'todos';          // 'todos' | 'atividades' | 'anotacoes' | 'alteracoes'
    var _secoesColapsadas = {};              // { resumo:true, ... } — sessão apenas
    var _atividadeEmEdicaoId = null;

    function secaoColapsavel(chave, titulo, corpoHtml, extraHeaderHtml) {
        var colapsada = !!_secoesColapsadas[chave];
        return '' +
            '<div class="crm-secao' + (colapsada ? ' crm-secao-fechada' : '') + '">' +
                '<div class="crm-secao-header" data-crm-action="toggleSecao" data-id="' + esc(chave) + '">' +
                    '<span class="crm-secao-seta">' + (colapsada ? '▸' : '▾') + '</span>' +
                    '<span class="crm-secao-titulo">' + esc(titulo) + '</span>' +
                    (extraHeaderHtml || '') +
                '</div>' +
                (colapsada ? '' : '<div class="crm-secao-corpo">' + corpoHtml + '</div>') +
            '</div>';
    }

    function renderizarComposerAtividade(negocio) {
        var atv = _atividadeEmEdicaoId
            ? CrmStore.listarAtividades(negocio.id).filter(function (a) { return a.id === _atividadeEmEdicaoId; })[0]
            : null;
        var tipoAtual = atv ? atv.tipo : 'chamada';
        var pills = Object.keys(CrmModel.TIPOS_ATIVIDADE).map(function (chave) {
            var t = CrmModel.TIPOS_ATIVIDADE[chave];
            return '<button type="button" class="crm-atv-tipo' + (chave === tipoAtual ? ' active' : '') + '" data-crm-action="tipoAtividade" data-valor="' + esc(chave) + '">' + t.icone + ' ' + esc(t.rotulo) + '</button>';
        }).join('');

        return '' +
            '<div class="crm-atv-composer">' +
                '<input type="hidden" id="crmAtvId" value="' + esc(atv ? atv.id : '') + '">' +
                '<input type="hidden" id="crmAtvTipo" value="' + esc(tipoAtual) + '">' +
                '<input type="text" id="crmAtvAssunto" placeholder="' + esc((CrmModel.TIPOS_ATIVIDADE[tipoAtual] || {}).rotulo || 'Atividade') + '" value="' + esc(atv ? atv.assunto : '') + '">' +
                '<div class="crm-atv-tipos">' + pills + '</div>' +
                '<div class="crm-atv-linha">' +
                    '<input type="date" id="crmAtvData" value="' + esc(atv && atv.data ? atv.data : new Date().toISOString().slice(0, 10)) + '">' +
                    '<input type="time" id="crmAtvHoraInicio" value="' + esc(atv ? atv.horaInicio : '') + '">' +
                    '<span>–</span>' +
                    '<input type="time" id="crmAtvHoraFim" value="' + esc(atv ? atv.horaFim : '') + '">' +
                '</div>' +
                '<textarea id="crmAtvDescricao" rows="2" placeholder="Adicionar descrição…">' + esc(atv ? atv.descricao : '') + '</textarea>' +
                '<div class="crm-atv-acoes">' +
                    (atv ? '<button type="button" class="btn-secondary" data-crm-action="cancelarAtividade">Cancelar edição</button>' : '') +
                    '<button type="button" class="crm-btn-negocio" data-crm-action="salvarAtividade" data-id="' + esc(negocio.id) + '">' + (atv ? 'Salvar alterações' : 'Salvar') + '</button>' +
                '</div>' +
            '</div>';
    }

    function renderizarFoco(negocio) {
        var pendentes = CrmCalculos.atividadesPendentesDe(CrmStore.listarAtividades(), negocio.id);
        var hoje = new Date().toISOString().slice(0, 10);
        var itens = pendentes.map(function (a) {
            var t = CrmModel.TIPOS_ATIVIDADE[a.tipo] || {};
            var atrasada = a.data && a.data < hoje;
            return '' +
                '<div class="crm-foco-item' + (atrasada ? ' crm-foco-atrasada' : '') + '">' +
                    '<button type="button" class="crm-foco-check" title="Marcar como feita" data-crm-action="concluirAtividadeDetalhe" data-id="' + esc(a.id) + '">○</button>' +
                    '<div class="crm-foco-corpo">' +
                        '<div class="crm-foco-assunto">' + (t.icone || '') + ' ' + esc(a.assunto || t.rotulo || 'Atividade') + '</div>' +
                        '<div class="crm-timeline-meta">' + esc(dataBR(a.data)) + (a.horaInicio ? ' ' + esc(a.horaInicio) : '') + (atrasada ? ' · atrasada' : '') + '</div>' +
                    '</div>' +
                    '<button type="button" class="btn-secondary crm-btn-mini" data-crm-action="editarAtividadeDetalhe" data-id="' + esc(a.id) + '">Editar</button>' +
                    '<button type="button" class="btn-secondary crm-btn-mini" data-crm-action="excluirAtividadeDetalhe" data-id="' + esc(a.id) + '">✕</button>' +
                '</div>';
        }).join('');

        return '' +
            '<div class="crm-bloco-titulo">Foco</div>' +
            (itens || '<div class="crm-empty">Nenhum item de foco ainda.<br><span class="small-text">Agende uma atividade acima para acompanhar este negócio.</span></div>');
    }

    function renderizarHistoricoFiltrado(negocio) {
        var timeline = CrmStore.historicoDe('negocio', negocio.id);
        var nAtividades = timeline.filter(function (h) { return h.tipo === 'atividade'; }).length;
        var nNotas = timeline.filter(function (h) { return h.tipo === 'nota'; }).length;

        var filtrada = timeline.filter(function (h) {
            if (_filtroHistorico === 'atividades') return h.tipo === 'atividade';
            if (_filtroHistorico === 'anotacoes') return h.tipo === 'nota';
            if (_filtroHistorico === 'alteracoes') return h.tipo !== 'atividade' && h.tipo !== 'nota';
            return true;
        });

        function pill(valor, rotulo) {
            return '<button type="button" class="crm-hist-pill' + (_filtroHistorico === valor ? ' active' : '') + '" data-crm-action="filtroHistorico" data-valor="' + valor + '">' + rotulo + '</button>';
        }

        return '' +
            '<div class="crm-bloco-titulo">Histórico</div>' +
            '<div class="crm-hist-pills">' +
                pill('todos', 'Todos') +
                pill('atividades', 'Atividades (' + nAtividades + ')') +
                pill('anotacoes', 'Anotações (' + nNotas + ')') +
                pill('alteracoes', 'Registro de alterações') +
            '</div>' +
            '<div class="crm-timeline">' + (filtrada.map(renderizarTimelineItem).join('') || '<div class="crm-empty">Sem histórico ainda.</div>') + '</div>';
    }

    function renderizarDetalhe(container, negocioId) {
        var crm = CrmStore.getCrm();
        var negocio = crm.negocios.filter(function (n) { return n.id === negocioId; })[0];
        if (!negocio) {
            container.innerHTML = '<div class="card">Negócio não encontrado.<br><button type="button" class="btn-secondary" data-crm-action="voltar" style="margin-top:8px;">Voltar</button></div>';
            return;
        }

        var funil = crm.funis.filter(function (f) { return f.id === negocio.funilId; })[0];
        var etapas = funil ? funil.etapas.slice().sort(function (a, b) { return a.ordem - b.ordem; }) : [];
        var organizacao = crm.organizacoes.filter(function (o) { return o.id === negocio.organizacaoId; })[0];
        var pessoa = crm.pessoas.filter(function (p) { return p.id === negocio.pessoaId; })[0];
        var mostrarValor = !!(funil && funil.mostrarValor !== false);
        var atividades = CrmStore.listarAtividades();
        var diasEtapa = CrmCalculos.diasNaEtapa(crm.historico, negocio);
        var outrosNegocios = organizacao ? CrmCalculos.negociosDaOrganizacao(CrmStore.listarNegocios(), organizacao.id).filter(function (n) { return n.id !== negocio.id; }) : [];
        var contatosDaOrg = organizacao ? crm.pessoas.filter(function (p) { return p.organizacaoId === organizacao.id; }) : [];
        var participantes = (negocio.participantes || [])
            .map(function (pid) { return crm.pessoas.filter(function (p) { return p.id === pid; })[0]; })
            .filter(Boolean);

        // ── Cabeçalho: título, proprietário, Ganho/Perdido e barra de etapas ──
        var indiceAtual = -1;
        etapas.forEach(function (e, i) { if (e.id === negocio.etapaId) indiceAtual = i; });
        var barraEtapas = etapas.map(function (e, i) {
            var classes = 'crm-prog-seg';
            if (i < indiceAtual) classes += ' crm-prog-passada';
            if (i === indiceAtual) classes += ' crm-prog-atual';
            var rotulo = (i === indiceAtual)
                ? (diasEtapa + (diasEtapa === 1 ? ' dia' : ' dias'))
                : e.nome;
            return '<button type="button" class="' + classes + '" data-crm-action="moverEtapaDetalhe" data-id="' + esc(e.id) + '" title="' + esc(e.nome) + '" style="--crm-etapa-cor:' + esc(e.cor || '#64748b') + '">' + esc(rotulo) + '</button>';
        }).join('');

        var statusBadge = '';
        if (negocio.status === 'ganho') statusBadge = '<span class="crm-badge-status crm-badge-ganho">GANHO</span>';
        if (negocio.status === 'perdido') statusBadge = '<span class="crm-badge-status crm-badge-perdido">PERDIDO</span>';

        var header = '' +
            '<div class="card crm-det-header">' +
                '<div class="crm-det-header-linha">' +
                    '<button type="button" class="btn-secondary" data-crm-action="voltar">←</button>' +
                    '<h2 class="crm-det-titulo">' + esc(negocio.titulo || '(sem título)') + '</h2>' +
                    statusBadge +
                    (mostrarValor && negocio.valor != null ? '<span class="crm-det-valor">' + esc(CrmCalculos.formatarMoeda(negocio.valor, negocio.moeda)) + '</span>' : '') +
                    '<span style="flex:1;"></span>' +
                    '<span class="small-text">👤 ' + esc(negocio.responsavel || '—') + ' <span class="crm-det-proprietario-rotulo">Proprietário</span></span>' +
                    '<button type="button" class="crm-btn-ganho" data-crm-action="marcarGanhoDetalhe" data-id="' + esc(negocio.id) + '">Ganho</button>' +
                    '<button type="button" class="crm-btn-perdido" data-crm-action="marcarPerdidoDetalhe" data-id="' + esc(negocio.id) + '">Perdido</button>' +
                    '<button type="button" class="btn-secondary" data-crm-action="editarNegocio" data-id="' + esc(negocio.id) + '">Editar</button>' +
                    '<button type="button" class="btn-danger" data-crm-action="excluirNegocioDetalhe" data-id="' + esc(negocio.id) + '" title="Mover para Excluídos">🗑</button>' +
                '</div>' +
                '<div class="crm-prog-barra">' + barraEtapas + '</div>' +
                '<div class="small-text">' + esc(funil ? funil.nome : '') + (indiceAtual !== -1 ? ' → ' + esc(etapas[indiceAtual].nome) : '') + '</div>' +
            '</div>';

        // ── Painel esquerdo: seções colapsáveis ──
        var tagsHtml = (negocio.tags || []).map(function (t) { return '<span class="crm-tag">' + esc(t) + '</span>'; }).join(' ');

        var htmlResumo = '' +
            '<dl class="crm-detalhe-campos">' +
                (mostrarValor ? '<dt>Valor</dt><dd>' + (negocio.valor != null ? esc(CrmCalculos.formatarMoeda(negocio.valor, negocio.moeda)) : '—') + '</dd>' : '') +
                '<dt>Organização</dt><dd>' + (organizacao ? esc(organizacao.nome) : '—') + '</dd>' +
                '<dt>Pessoa de contato</dt><dd>' + (pessoa ? esc(pessoa.nome) : '—') + '</dd>' +
                '<dt>Etiquetas</dt><dd>' + (tagsHtml || '—') + '</dd>' +
                '<dt>Fechamento esperado</dt><dd>' + esc(dataBR(negocio.dataPrevisao)) + '</dd>' +
                ((negocio.status === 'perdido' && negocio.motivoPerda) ? '<dt>Motivo da perda</dt><dd>' + esc(negocio.motivoPerda) + '</dd>' : '') +
            '</dl>';

        var htmlDetalhes = negocio.descricao
            ? '<p class="crm-detalhe-descricao">' + esc(negocio.descricao) + '</p>'
            : '<div class="crm-empty">Sem descrição.</div>';

        var htmlFonte = '' +
            '<dl class="crm-detalhe-campos">' +
                '<dt>Canal de origem</dt><dd>' + esc(negocio.origem || '—') + '</dd>' +
                '<dt>ID do canal</dt><dd>' + esc(negocio.canalOrigemId || '—') + '</dd>' +
                '<dt>Recebido em</dt><dd>' + esc(dataBR(negocio.dataRecebimento)) + '</dd>' +
            '</dl>';

        var htmlPessoa = pessoa
            ? ('<div><strong>' + esc(pessoa.nome) + '</strong>' + (pessoa.cargo ? ' · ' + esc(pessoa.cargo) : '') + '</div>' +
               '<dl class="crm-detalhe-campos">' +
                   '<dt>Telefone</dt><dd>' + esc(pessoa.telefone || '—') + '</dd>' +
                   '<dt>E-mail</dt><dd>' + esc(pessoa.email || '—') + '</dd>' +
               '</dl>' +
               '<button type="button" class="btn-secondary crm-btn-mini" data-crm-action="editarPessoa" data-id="' + esc(pessoa.id) + '">Ver / editar</button>')
            : '<div class="crm-empty">Nenhum contato vinculado.</div>';

        var chipsParticipantes = participantes.map(function (p) {
            return '<span class="crm-tag">' + esc(p.nome) + ' <span class="crm-chip-x" data-crm-action="removerParticipante" data-id="' + esc(p.id) + '">✕</span></span>';
        }).join(' ');
        var opcoesParticipante = crm.pessoas
            .filter(function (p) { return p.id !== negocio.pessoaId && (negocio.participantes || []).indexOf(p.id) === -1; })
            .map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.nome) + '</option>'; }).join('');
        var htmlParticipantes = '' +
            (chipsParticipantes || '<div class="crm-empty">Só a pessoa de contato principal.</div>') +
            (opcoesParticipante
                ? '<div class="crm-part-add"><select id="crmSelectParticipante"><option value="">Adicionar participante…</option>' + opcoesParticipante + '</select>' +
                  '<button type="button" class="btn-secondary crm-btn-mini" data-crm-action="addParticipante">+</button></div>'
                : '');

        var htmlOrganizacao = organizacao
            ? ('<div><strong>' + esc(organizacao.nome) + '</strong></div>' +
               '<dl class="crm-detalhe-campos">' +
                   (organizacao.site ? '<dt>Site</dt><dd>' + esc(organizacao.site) + '</dd>' : '') +
                   (organizacao.telefone ? '<dt>Telefone</dt><dd>' + esc(organizacao.telefone) + '</dd>' : '') +
                   (organizacao.endereco ? '<dt>Endereço</dt><dd>' + esc(organizacao.endereco) + '</dd>' : '') +
                   '<dt>Contatos</dt><dd>' + (contatosDaOrg.length || '—') + '</dd>' +
               '</dl>' +
               '<button type="button" class="btn-secondary crm-btn-mini" data-crm-action="editarOrganizacao" data-id="' + esc(organizacao.id) + '">Ver / editar</button>' +
               (outrosNegocios.length
                   ? '<div class="crm-bloco-titulo" style="margin-top:10px;">Outros negócios</div>' +
                     outrosNegocios.map(function (n) {
                         return '<div class="crm-outro-negocio" data-crm-action="abrirDetalhe" data-id="' + esc(n.id) + '">' + esc(n.titulo || '(sem título)') + '</div>';
                     }).join('')
                   : ''))
            : '<div class="crm-empty">Nenhuma organização vinculada.</div>';

        var htmlVisaoGeral = '' +
            '<dl class="crm-detalhe-campos">' +
                '<dt>Idade do negócio</dt><dd>' + CrmCalculos.idadeEmDias(negocio) + ' dias</dd>' +
                '<dt>Inativo há</dt><dd>' + CrmCalculos.diasInativo(negocio, atividades) + ' dias</dd>' +
                '<dt>Criado em</dt><dd>' + esc(formatarDataHora(negocio.criadoEm)) + '</dd>' +
            '</dl>';

        var esquerda = '' +
            '<div class="card crm-detalhe-col crm-det-esquerda">' +
                secaoColapsavel('resumo', 'Resumo', htmlResumo) +
                secaoColapsavel('detalhes', 'Detalhes', htmlDetalhes) +
                secaoColapsavel('fonte', 'Fonte', htmlFonte) +
                secaoColapsavel('pessoa', 'Pessoa', htmlPessoa) +
                secaoColapsavel('participantes', 'Participantes', htmlParticipantes,
                    '<span class="crm-col-count">' + participantes.length + '</span>') +
                secaoColapsavel('organizacao', 'Organização', htmlOrganizacao) +
                secaoColapsavel('visaogeral', 'Visão geral', htmlVisaoGeral) +
            '</div>';

        // ── Centro: abas + composer + Foco + Histórico ──
        function abaBtn(valor, rotulo, ativa) {
            return '<button type="button" class="crm-det-aba' + (ativa ? ' active' : '') + '" data-crm-action="abaDetalhe" data-valor="' + valor + '">' + rotulo + '</button>';
        }
        function abaDesabilitada(rotulo) {
            return '<button type="button" class="crm-det-aba crm-det-aba-off" disabled title="Indisponível nesta versão (requer servidor)">' + rotulo + '</button>';
        }

        var abas = '' +
            '<div class="crm-det-abas">' +
                abaBtn('atividade', '📅 Atividade', _abaDetalhe === 'atividade') +
                abaBtn('anotacoes', '📝 Anotações', _abaDetalhe === 'anotacoes') +
                abaDesabilitada('📞 Chamada') +
                abaDesabilitada('✉️ E-mail') +
                abaDesabilitada('📎 Arquivos') +
                abaDesabilitada('📄 Documentos') +
                abaDesabilitada('💲 Fatura') +
            '</div>';

        var conteudoAba = (_abaDetalhe === 'anotacoes')
            ? ('<div class="crm-nota-composer">' +
                   '<textarea id="crmNotaTexto" rows="2" placeholder="Escreva uma nota…"></textarea>' +
                   '<button type="button" class="crm-btn-negocio" data-crm-action="registrarNota" data-id="' + esc(negocio.id) + '" style="margin-top:6px;">Registrar</button>' +
               '</div>')
            : renderizarComposerAtividade(negocio);

        var centro = '' +
            '<div class="card crm-detalhe-col">' +
                abas +
                conteudoAba +
                '<div class="crm-det-bloco">' + renderizarFoco(negocio) + '</div>' +
                '<div class="crm-det-bloco">' + renderizarHistoricoFiltrado(negocio) + '</div>' +
            '</div>';

        container.innerHTML = header + '<div class="crm-detalhe-grid crm-detalhe-grid-2col">' + esquerda + centro + '</div>';
    }

    // ──────────────────────────────────────────────
    //  MODAL: NEGÓCIO
    // ──────────────────────────────────────────────

    function popularSelectFunilModalNegocio(funilSelecionadoId) {
        var select = document.getElementById('crmNegocioFunil');
        var funis = CrmStore.listarFunis().filter(function (f) { return !f.arquivado; });
        select.innerHTML = funis.map(function (f) {
            var sel = (f.id === funilSelecionadoId) ? ' selected' : '';
            return '<option value="' + esc(f.id) + '"' + sel + '>' + esc(f.nome) + '</option>';
        }).join('');
    }

    /** Etapas como barra de chevrons clicável (padrão Pipedrive). */
    function renderizarChevronsEtapa(funilId, etapaSelecionadaId) {
        var container = document.getElementById('crmNegocioEtapaChevrons');
        var hidden = document.getElementById('crmNegocioEtapa');
        var crm = CrmStore.getCrm();
        var funil = crm.funis.filter(function (f) { return f.id === funilId; })[0];
        var etapas = funil ? funil.etapas.slice().sort(function (a, b) { return a.ordem - b.ordem; }) : [];

        var selecionada = etapaSelecionadaId;
        if (!selecionada || !etapas.some(function (e) { return e.id === selecionada; })) {
            selecionada = etapas.length ? etapas[0].id : '';
        }
        hidden.value = selecionada;

        var indiceSel = -1;
        etapas.forEach(function (e, i) { if (e.id === selecionada) indiceSel = i; });

        container.innerHTML = etapas.map(function (e, i) {
            var classes = 'crm-chevron';
            if (i <= indiceSel) classes += ' crm-chevron-ativo';
            return '<button type="button" class="' + classes + '" data-crm-action="escolherEtapaModal" data-id="' + esc(e.id) + '" title="' + esc(e.nome) + '"></button>';
        }).join('');

        atualizarVisibilidadeCamposNegocio(funil, selecionada);
    }

    function atualizarVisibilidadeCamposNegocio(funil, etapaId) {
        var grupoValor = document.getElementById('crmNegocioValorGroup');
        if (grupoValor) grupoValor.style.display = (funil && funil.mostrarValor === false) ? 'none' : '';

        var etapa = funil ? funil.etapas.filter(function (e) { return e.id === etapaId; })[0] : null;
        var grupoMotivo = document.getElementById('crmNegocioMotivoPerdaGroup');
        if (grupoMotivo) grupoMotivo.style.display = (etapa && etapa.tipo === 'perdido') ? '' : 'none';
    }

    // ── Autocomplete de pessoa/organização com criação inline ("NOVO") ──
    // O id escolhido fica no hidden; se o usuário digita um nome que não
    // existe, o hidden fica vazio e o salvar cria a entidade na hora.

    var AC_CONFIG = {
        pessoa: { busca: 'crmNegocioPessoaBusca', hidden: 'crmNegocioPessoa', lista: 'crmACPessoaLista',
            fonte: function () { return CrmStore.listarPessoas(); } },
        organizacao: { busca: 'crmNegocioOrganizacaoBusca', hidden: 'crmNegocioOrganizacao', lista: 'crmACOrganizacaoLista',
            fonte: function () { return CrmStore.listarOrganizacoes(); } }
    };

    function renderizarListaAC(tipo) {
        var cfg = AC_CONFIG[tipo];
        var input = document.getElementById(cfg.busca);
        var lista = document.getElementById(cfg.lista);
        var termo = input.value.trim().toLowerCase();

        var itens = cfg.fonte().filter(function (item) {
            return !termo || String(item.nome || '').toLowerCase().indexOf(termo) !== -1;
        }).slice(0, 8);

        var html = itens.map(function (item) {
            return '<div class="crm-ac-item" data-crm-action="acEscolher" data-ac="' + tipo + '" data-id="' + esc(item.id) + '">' + esc(item.nome) + '</div>';
        }).join('');
        if (termo && !itens.some(function (i) { return String(i.nome).toLowerCase() === termo; })) {
            html += '<div class="crm-ac-item crm-ac-novo" data-crm-action="acCriar" data-ac="' + tipo + '">+ Adicionar "' + esc(input.value.trim()) + '" como ' + (tipo === 'pessoa' ? 'novo contato' : 'nova organização') + '</div>';
        }
        lista.innerHTML = html || '<div class="crm-ac-item crm-ac-vazio">Nenhum resultado</div>';
        lista.style.display = '';
    }

    function fecharListasAC() {
        Object.keys(AC_CONFIG).forEach(function (tipo) {
            var lista = document.getElementById(AC_CONFIG[tipo].lista);
            if (lista) lista.style.display = 'none';
        });
    }

    function marcarACNovo(tipo, ehNovo) {
        var input = document.getElementById(AC_CONFIG[tipo].busca);
        if (input) input.classList.toggle('crm-ac-input-novo', !!ehNovo);
        if (tipo === 'pessoa') {
            var aviso = document.getElementById('crmNegocioPessoaAviso');
            if (aviso) aviso.textContent = ehNovo
                ? 'Contato NOVO: telefone e e-mail acima serão salvos junto.'
                : 'Preenchidos ao criar um contato novo; para contato existente, edite na aba Contatos.';
        }
    }

    function abrirModalNegocio(id) {
        var crm = CrmStore.getCrm();
        var negocio = id ? crm.negocios.filter(function (n) { return n.id === id; })[0] : null;
        var funilId = negocio ? negocio.funilId : (CrmStore.getFunilAtivo() ? CrmStore.getFunilAtivo().id : null);
        var pessoa = negocio ? crm.pessoas.filter(function (p) { return p.id === negocio.pessoaId; })[0] : null;
        var organizacao = negocio ? crm.organizacoes.filter(function (o) { return o.id === negocio.organizacaoId; })[0] : null;

        document.getElementById('crmModalNegocioTitulo').textContent = negocio ? 'Editar negócio' : 'Adicionar negócio';
        document.getElementById('crmNegocioId').value = negocio ? negocio.id : '';
        document.getElementById('crmNegocioTitulo').value = negocio ? negocio.titulo : '';
        document.getElementById('crmNegocioValor').value = (negocio && negocio.valor != null) ? negocio.valor : '';
        document.getElementById('crmNegocioMoeda').value = (negocio && negocio.moeda) ? negocio.moeda : 'BRL';
        document.getElementById('crmNegocioOrigem').value = negocio ? (negocio.origem || '') : '';
        document.getElementById('crmNegocioCanalId').value = negocio ? (negocio.canalOrigemId || '') : '';
        // Numa demanda nova, a data de recebimento quase sempre é hoje — pré-preenche
        document.getElementById('crmNegocioRecebimento').value = negocio
            ? (negocio.dataRecebimento || '')
            : new Date().toISOString().slice(0, 10);
        document.getElementById('crmNegocioPrevisao').value = negocio && negocio.dataPrevisao ? negocio.dataPrevisao : '';
        document.getElementById('crmNegocioResponsavel').value = negocio ? negocio.responsavel : '';
        document.getElementById('crmNegocioTags').value = negocio && negocio.tags ? negocio.tags.join(', ') : '';
        document.getElementById('crmNegocioDescricao').value = negocio ? negocio.descricao : '';
        document.getElementById('crmNegocioMotivoPerda').value = negocio ? negocio.motivoPerda : '';

        document.getElementById('crmNegocioPessoaBusca').value = pessoa ? pessoa.nome : '';
        document.getElementById('crmNegocioPessoa').value = pessoa ? pessoa.id : '';
        document.getElementById('crmNegocioOrganizacaoBusca').value = organizacao ? organizacao.nome : '';
        document.getElementById('crmNegocioOrganizacao').value = organizacao ? organizacao.id : '';
        document.getElementById('crmNegocioPessoaTelefone').value = '';
        document.getElementById('crmNegocioPessoaEmail').value = '';
        marcarACNovo('pessoa', false);
        marcarACNovo('organizacao', false);
        fecharListasAC();

        popularSelectFunilModalNegocio(funilId);
        renderizarChevronsEtapa(funilId, negocio ? negocio.etapaId : null);

        document.getElementById('crmBtnExcluirNegocio').style.display = negocio ? '' : 'none';

        document.getElementById('modalNegocio').classList.add('active');
    }

    function fecharModalNegocio() {
        document.getElementById('modalNegocio').classList.remove('active');
    }

    /**
     * Resolve o vínculo do autocomplete: devolve o id escolhido, ou cria a
     * entidade na hora quando o usuário digitou um nome novo (fluxo "NOVO"
     * do Pipedrive). Vazio → null.
     */
    function resolverVinculoAC(tipo, organizacaoIdParaPessoa) {
        var cfg = AC_CONFIG[tipo];
        var idEscolhido = document.getElementById(cfg.hidden).value;
        var texto = document.getElementById(cfg.busca).value.trim();
        if (idEscolhido) {
            // Se o usuário apagou/alterou o texto depois de escolher, respeita o texto
            var existente = cfg.fonte().filter(function (i) { return i.id === idEscolhido; })[0];
            if (existente && texto && existente.nome === texto) return idEscolhido;
            if (existente && !texto) return null;
            if (existente && existente.nome !== texto) idEscolhido = '';
            else return idEscolhido;
        }
        if (!texto) return null;
        // Nome digitado sem escolha → reusa exato se existir, senão cria
        var exato = cfg.fonte().filter(function (i) { return String(i.nome).toLowerCase() === texto.toLowerCase(); })[0];
        if (exato) return exato.id;
        if (tipo === 'organizacao') {
            var org = CrmStore.criarOrganizacao({ nome: texto });
            return org ? org.id : null;
        }
        var nova = CrmStore.criarPessoa({
            nome: texto,
            telefone: document.getElementById('crmNegocioPessoaTelefone').value.trim(),
            email: document.getElementById('crmNegocioPessoaEmail').value.trim(),
            organizacaoId: organizacaoIdParaPessoa || null
        });
        return nova ? nova.id : null;
    }

    function salvarNegocio() {
        var id = document.getElementById('crmNegocioId').value;
        var funilId = document.getElementById('crmNegocioFunil').value;
        var crm = CrmStore.getCrm();
        var funil = crm.funis.filter(function (f) { return f.id === funilId; })[0];

        var emailNovoContato = document.getElementById('crmNegocioPessoaEmail').value.trim();
        if (emailNovoContato && !document.getElementById('crmNegocioPessoa').value) {
            var errosPessoa = CrmModel.validarPessoa({ nome: document.getElementById('crmNegocioPessoaBusca').value.trim() || 'x', email: emailNovoContato });
            if (errosPessoa.length) { mostrarErro(errosPessoa.join(' ')); return; }
        }

        var organizacaoId = resolverVinculoAC('organizacao');
        var pessoaId = resolverVinculoAC('pessoa', organizacaoId);

        var tagsBrutas = document.getElementById('crmNegocioTags').value;
        var dados = {
            funilId: funilId,
            etapaId: document.getElementById('crmNegocioEtapa').value,
            titulo: document.getElementById('crmNegocioTitulo').value.trim(),
            valor: document.getElementById('crmNegocioValor').value === '' ? null : Number(document.getElementById('crmNegocioValor').value),
            moeda: document.getElementById('crmNegocioMoeda').value || 'BRL',
            organizacaoId: organizacaoId,
            pessoaId: pessoaId,
            responsavel: document.getElementById('crmNegocioResponsavel').value.trim(),
            origem: document.getElementById('crmNegocioOrigem').value.trim(),
            canalOrigemId: document.getElementById('crmNegocioCanalId').value.trim(),
            dataRecebimento: document.getElementById('crmNegocioRecebimento').value || null,
            dataPrevisao: document.getElementById('crmNegocioPrevisao').value || null,
            motivoPerda: document.getElementById('crmNegocioMotivoPerda').value.trim(),
            tags: tagsBrutas ? tagsBrutas.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [],
            descricao: document.getElementById('crmNegocioDescricao').value
        };

        var erros = CrmModel.validarNegocio(dados, funil);
        if (erros.length) {
            mostrarErro(erros.join(' '));
            return;
        }

        if (id) {
            CrmStore.atualizarNegocio(id, dados);
        } else {
            CrmStore.criarNegocio(dados);
        }
        fecharModalNegocio();
        renderizarComListeners();
    }

    function excluirNegocio() {
        var id = document.getElementById('crmNegocioId').value;
        if (!id) return;
        confirmarExclusao('Mover este negócio para Excluídos? Você pode restaurá-lo depois na visão 🗑.', function () {
            CrmStore.removerNegocio(id);
            fecharModalNegocio();
            renderizarComListeners();
        });
    }

    // ──────────────────────────────────────────────
    //  MODAL: CONTATO (PESSOA)
    // ──────────────────────────────────────────────

    function popularSelectOrganizacaoModalPessoa(selecionadoId) {
        var select = document.getElementById('crmPessoaOrganizacao');
        var organizacoes = CrmStore.listarOrganizacoes();
        select.innerHTML = '<option value="">— Nenhuma —</option>' + organizacoes.map(function (o) {
            var sel = (o.id === selecionadoId) ? ' selected' : '';
            return '<option value="' + esc(o.id) + '"' + sel + '>' + esc(o.nome) + '</option>';
        }).join('');
    }

    function abrirModalPessoa(id) {
        var crm = CrmStore.getCrm();
        var pessoa = id ? crm.pessoas.filter(function (p) { return p.id === id; })[0] : null;

        document.getElementById('crmModalPessoaTitulo').textContent = pessoa ? 'Editar Contato' : 'Novo Contato';
        document.getElementById('crmPessoaId').value = pessoa ? pessoa.id : '';
        document.getElementById('crmPessoaNome').value = pessoa ? pessoa.nome : '';
        document.getElementById('crmPessoaCargo').value = pessoa ? pessoa.cargo : '';
        document.getElementById('crmPessoaEmail').value = pessoa ? pessoa.email : '';
        document.getElementById('crmPessoaTelefone').value = pessoa ? pessoa.telefone : '';
        document.getElementById('crmPessoaObservacoes').value = pessoa ? pessoa.observacoes : '';
        popularSelectOrganizacaoModalPessoa(pessoa ? pessoa.organizacaoId : null);
        document.getElementById('crmBtnExcluirPessoa').style.display = pessoa ? '' : 'none';

        document.getElementById('modalPessoa').classList.add('active');
    }

    function fecharModalPessoa() {
        document.getElementById('modalPessoa').classList.remove('active');
    }

    function salvarPessoa() {
        var id = document.getElementById('crmPessoaId').value;
        var dados = {
            nome: document.getElementById('crmPessoaNome').value.trim(),
            cargo: document.getElementById('crmPessoaCargo').value.trim(),
            email: document.getElementById('crmPessoaEmail').value.trim(),
            telefone: document.getElementById('crmPessoaTelefone').value.trim(),
            organizacaoId: document.getElementById('crmPessoaOrganizacao').value || null,
            observacoes: document.getElementById('crmPessoaObservacoes').value
        };
        var erros = CrmModel.validarPessoa(dados);
        if (erros.length) {
            mostrarErro(erros.join(' '));
            return;
        }
        if (id) CrmStore.atualizarPessoa(id, dados);
        else CrmStore.criarPessoa(dados);
        fecharModalPessoa();
        renderizarComListeners();
    }

    function excluirPessoa() {
        var id = document.getElementById('crmPessoaId').value;
        if (!id) return;
        confirmarExclusao('Excluir este contato?', function () {
            CrmStore.removerPessoa(id);
            fecharModalPessoa();
            renderizarComListeners();
        });
    }

    // ──────────────────────────────────────────────
    //  MODAL: ORGANIZAÇÃO
    // ──────────────────────────────────────────────

    function abrirModalOrganizacao(id) {
        var crm = CrmStore.getCrm();
        var organizacao = id ? crm.organizacoes.filter(function (o) { return o.id === id; })[0] : null;

        document.getElementById('crmModalOrganizacaoTitulo').textContent = organizacao ? 'Editar Organização' : 'Nova Organização';
        document.getElementById('crmOrganizacaoId').value = organizacao ? organizacao.id : '';
        document.getElementById('crmOrganizacaoNome').value = organizacao ? organizacao.nome : '';
        document.getElementById('crmOrganizacaoCnpj').value = organizacao ? organizacao.cnpj : '';
        document.getElementById('crmOrganizacaoSite').value = organizacao ? organizacao.site : '';
        document.getElementById('crmOrganizacaoTelefone').value = organizacao ? organizacao.telefone : '';
        document.getElementById('crmOrganizacaoEndereco').value = organizacao ? organizacao.endereco : '';
        document.getElementById('crmOrganizacaoObservacoes').value = organizacao ? organizacao.observacoes : '';
        document.getElementById('crmBtnExcluirOrganizacao').style.display = organizacao ? '' : 'none';

        document.getElementById('modalOrganizacao').classList.add('active');
    }

    function fecharModalOrganizacao() {
        document.getElementById('modalOrganizacao').classList.remove('active');
    }

    function salvarOrganizacao() {
        var id = document.getElementById('crmOrganizacaoId').value;
        var dados = {
            nome: document.getElementById('crmOrganizacaoNome').value.trim(),
            cnpj: document.getElementById('crmOrganizacaoCnpj').value.trim(),
            site: document.getElementById('crmOrganizacaoSite').value.trim(),
            telefone: document.getElementById('crmOrganizacaoTelefone').value.trim(),
            endereco: document.getElementById('crmOrganizacaoEndereco').value.trim(),
            observacoes: document.getElementById('crmOrganizacaoObservacoes').value
        };
        var erros = CrmModel.validarOrganizacao(dados);
        if (erros.length) {
            mostrarErro(erros.join(' '));
            return;
        }
        if (id) CrmStore.atualizarOrganizacao(id, dados);
        else CrmStore.criarOrganizacao(dados);
        fecharModalOrganizacao();
        renderizarComListeners();
    }

    function excluirOrganizacao() {
        var id = document.getElementById('crmOrganizacaoId').value;
        if (!id) return;
        confirmarExclusao('Excluir esta organização? Contatos e negócios vinculados manterão a referência antiga.', function () {
            CrmStore.removerOrganizacao(id);
            fecharModalOrganizacao();
            renderizarComListeners();
        });
    }

    // ──────────────────────────────────────────────
    //  MODAL: FUNIL (etapas com editor simples: nome, cor, tipo, mover, remover)
    // ──────────────────────────────────────────────

    var _etapasEmEdicao = [];

    function renderizarEtapasEditor() {
        var container = document.getElementById('crmFunilEtapasLista');
        if (!container) return;
        container.innerHTML = _etapasEmEdicao.map(function (etapa, idx) {
            return '' +
                '<div class="crm-etapa-editor-row" data-indice="' + idx + '" style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">' +
                    '<input type="text" data-etapa-campo="nome" data-indice="' + idx + '" value="' + esc(etapa.nome) + '" placeholder="Nome da etapa" style="flex:1;">' +
                    '<input type="color" data-etapa-campo="cor" data-indice="' + idx + '" value="' + esc(etapa.cor || '#64748b') + '">' +
                    '<select data-etapa-campo="tipo" data-indice="' + idx + '">' +
                        '<option value="aberta"' + (etapa.tipo === 'aberta' ? ' selected' : '') + '>Aberta</option>' +
                        '<option value="ganho"' + (etapa.tipo === 'ganho' ? ' selected' : '') + '>Ganho</option>' +
                        '<option value="perdido"' + (etapa.tipo === 'perdido' ? ' selected' : '') + '>Perdido</option>' +
                    '</select>' +
                    '<button type="button" class="btn-secondary" data-crm-action="moverEtapaFunil" data-id="cima" data-indice="' + idx + '" title="Mover para cima">↑</button>' +
                    '<button type="button" class="btn-secondary" data-crm-action="moverEtapaFunil" data-id="baixo" data-indice="' + idx + '" title="Mover para baixo">↓</button>' +
                    '<button type="button" class="btn-secondary" data-crm-action="removerEtapaFunil" data-indice="' + idx + '" title="Remover etapa">✕</button>' +
                '</div>';
        }).join('');

        // Sincroniza _etapasEmEdicao a cada alteração de campo (delegado, ligado uma vez)
        if (!container._crmEtapasInputLigado) {
            container._crmEtapasInputLigado = true;
            container.addEventListener('input', aoEditarCampoEtapa);
            container.addEventListener('change', aoEditarCampoEtapa);
        }
    }

    function aoEditarCampoEtapa(e) {
        var alvo = e.target;
        var campo = alvo.dataset && alvo.dataset.etapaCampo;
        if (!campo) return;
        var idx = Number(alvo.dataset.indice);
        if (!_etapasEmEdicao[idx]) return;
        _etapasEmEdicao[idx][campo] = alvo.value;
    }

    function adicionarEtapaFunil() {
        _etapasEmEdicao.push({ id: null, nome: '', ordem: _etapasEmEdicao.length, cor: '#64748b', tipo: 'aberta' });
        renderizarEtapasEditor();
    }

    function removerEtapaFunil(id, valor, el) {
        var idx = Number(el.dataset.indice);
        _etapasEmEdicao.splice(idx, 1);
        renderizarEtapasEditor();
    }

    function moverEtapaFunil(direcao, valor, el) {
        var idx = Number(el.dataset.indice);
        var alvo = (el.dataset.id === 'cima') ? idx - 1 : idx + 1;
        if (alvo < 0 || alvo >= _etapasEmEdicao.length) return;
        var tmp = _etapasEmEdicao[idx];
        _etapasEmEdicao[idx] = _etapasEmEdicao[alvo];
        _etapasEmEdicao[alvo] = tmp;
        renderizarEtapasEditor();
    }

    function aoTrocarTemplateFunil() {
        var chave = document.getElementById('crmFunilTemplate').value;
        if (!chave) return;
        var tpl = CrmModel.funilDeTemplate(chave);
        if (!tpl) return;
        document.getElementById('crmFunilNome').value = tpl.nome;
        document.getElementById('crmFunilMostrarValor').checked = tpl.mostrarValor;
        _etapasEmEdicao = tpl.etapas.map(function (e) { return { id: null, nome: e.nome, ordem: e.ordem, cor: e.cor, tipo: e.tipo }; });
        renderizarEtapasEditor();
    }

    function abrirModalFunil(id) {
        var crm = CrmStore.getCrm();
        var funil = id ? crm.funis.filter(function (f) { return f.id === id; })[0] : null;

        document.getElementById('crmModalFunilTitulo').textContent = funil ? 'Editar Funil' : 'Novo Funil';
        document.getElementById('crmFunilId').value = funil ? funil.id : '';
        document.getElementById('crmFunilNome').value = funil ? funil.nome : '';
        document.getElementById('crmFunilMostrarValor').checked = funil ? (funil.mostrarValor !== false) : true;
        document.getElementById('crmFunilTemplate').value = '';
        document.getElementById('crmFunilTemplateGroup').style.display = funil ? 'none' : '';
        document.getElementById('crmBtnArquivarFunil').style.display = funil ? '' : 'none';

        _etapasEmEdicao = funil
            ? funil.etapas.slice().sort(function (a, b) { return a.ordem - b.ordem; }).map(function (e) {
                return { id: e.id, nome: e.nome, ordem: e.ordem, cor: e.cor, tipo: e.tipo };
            })
            : [
                { id: null, nome: 'Aberta', ordem: 0, cor: '#0891b2', tipo: 'aberta' },
                { id: null, nome: 'Ganho', ordem: 1, cor: '#059669', tipo: 'ganho' },
                { id: null, nome: 'Perdido', ordem: 2, cor: '#dc2626', tipo: 'perdido' }
            ];
        renderizarEtapasEditor();

        document.getElementById('modalFunil').classList.add('active');
    }

    function fecharModalFunil() {
        document.getElementById('modalFunil').classList.remove('active');
    }

    function salvarFunil() {
        var id = document.getElementById('crmFunilId').value;
        var nome = document.getElementById('crmFunilNome').value.trim();
        if (!nome) {
            mostrarErro('Nome do funil é obrigatório');
            return;
        }
        var etapasValidas = _etapasEmEdicao.filter(function (e) { return e.nome && e.nome.trim(); });
        if (!etapasValidas.length) {
            mostrarErro('Adicione ao menos uma etapa');
            return;
        }
        var mostrarValor = document.getElementById('crmFunilMostrarValor').checked;
        var etapasParaSalvar = etapasValidas.map(function (e, idx) {
            return { id: e.id, nome: e.nome.trim(), ordem: idx, cor: e.cor, tipo: e.tipo };
        });

        var funil;
        if (id) {
            funil = CrmStore.atualizarFunil(id, { nome: nome, mostrarValor: mostrarValor });
            CrmStore.definirEtapasFunil(id, etapasParaSalvar);
        } else {
            funil = CrmStore.criarFunil({ nome: nome, mostrarValor: mostrarValor, etapas: etapasParaSalvar });
            CrmStore.setFunilAtivo(funil.id);
        }

        fecharModalFunil();
        renderizarComListeners();
    }

    function arquivarFunilAtual() {
        var id = document.getElementById('crmFunilId').value;
        if (!id) return;
        confirmarExclusao('Arquivar este funil? Ele deixa de aparecer no seletor, mas os dados são mantidos.', function () {
            CrmStore.arquivarFunil(id, true);
            var restantes = CrmStore.listarFunis().filter(function (f) { return !f.arquivado; });
            if (restantes.length) CrmStore.setFunilAtivo(restantes[0].id);
            fecharModalFunil();
            renderizarComListeners();
        });
    }

    // ──────────────────────────────────────────────
    //  AÇÕES DO DETALHE 360°
    // ──────────────────────────────────────────────

    function moverEtapaDetalhe(etapaId) {
        var crm = CrmStore.getCrm();
        var negocioId = crm.config.detalheAbertoId;
        if (!negocioId) return;
        CrmStore.moverNegocio(negocioId, etapaId, null);
        reabrirDetalheAtual();
    }

    function marcarGanhoDetalhe(id) {
        CrmStore.marcarGanho(id);
        reabrirDetalheAtual();
    }

    function marcarPerdidoDetalhe(id) {
        CrmStore.marcarPerdido(id, '');
        reabrirDetalheAtual();
    }

    function excluirNegocioDetalhe(id) {
        confirmarExclusao('Mover este negócio para Excluídos? Você pode restaurá-lo depois na visão 🗑.', function () {
            CrmStore.removerNegocio(id);
            voltarDaLista();
        });
    }

    // ── Atividades no detalhe ──

    function salvarAtividade(negocioId) {
        var dados = {
            negocioId: negocioId,
            tipo: document.getElementById('crmAtvTipo').value,
            assunto: document.getElementById('crmAtvAssunto').value.trim(),
            data: document.getElementById('crmAtvData').value || null,
            horaInicio: document.getElementById('crmAtvHoraInicio').value || '',
            horaFim: document.getElementById('crmAtvHoraFim').value || '',
            descricao: document.getElementById('crmAtvDescricao').value
        };
        // Sem assunto, usa o rótulo do tipo (como o Pipedrive faz)
        if (!dados.assunto) dados.assunto = (CrmModel.TIPOS_ATIVIDADE[dados.tipo] || {}).rotulo || 'Atividade';

        var erros = CrmModel.validarAtividade(dados);
        if (erros.length) { mostrarErro(erros.join(' ')); return; }

        var idEdicao = document.getElementById('crmAtvId').value;
        if (idEdicao) CrmStore.atualizarAtividade(idEdicao, dados);
        else CrmStore.criarAtividade(dados);
        _atividadeEmEdicaoId = null;
        reabrirDetalheAtual();
        if (window.AppState && AppState.flushAutoSave) { try { AppState.flushAutoSave(); } catch (_) { } }
    }

    function escolherTipoAtividade(valor) {
        document.getElementById('crmAtvTipo').value = valor;
        var container = document.querySelector('.crm-atv-tipos');
        if (container) {
            container.querySelectorAll('.crm-atv-tipo').forEach(function (btn) {
                btn.classList.toggle('active', btn.dataset.valor === valor);
            });
        }
        var assunto = document.getElementById('crmAtvAssunto');
        if (assunto) assunto.placeholder = (CrmModel.TIPOS_ATIVIDADE[valor] || {}).rotulo || 'Atividade';
    }

    function concluirAtividadeDetalhe(id) {
        CrmStore.concluirAtividade(id, true);
        reabrirDetalheAtual();
    }

    function editarAtividadeDetalhe(id) {
        _atividadeEmEdicaoId = id;
        _abaDetalhe = 'atividade';
        reabrirDetalheAtual();
    }

    function excluirAtividadeDetalhe(id) {
        confirmarExclusao('Excluir esta atividade?', function () {
            CrmStore.removerAtividade(id);
            if (_atividadeEmEdicaoId === id) _atividadeEmEdicaoId = null;
            reabrirDetalheAtual();
        });
    }

    // ── Participantes ──

    function adicionarParticipante() {
        var select = document.getElementById('crmSelectParticipante');
        var crm = CrmStore.getCrm();
        var negocioId = crm.config.detalheAbertoId;
        if (!select || !select.value || !negocioId) return;
        var negocio = crm.negocios.filter(function (n) { return n.id === negocioId; })[0];
        var atuais = (negocio && negocio.participantes) ? negocio.participantes.slice() : [];
        if (atuais.indexOf(select.value) === -1) atuais.push(select.value);
        CrmStore.setParticipantes(negocioId, atuais);
        reabrirDetalheAtual();
    }

    function removerParticipante(pessoaId) {
        var crm = CrmStore.getCrm();
        var negocioId = crm.config.detalheAbertoId;
        if (!negocioId) return;
        var negocio = crm.negocios.filter(function (n) { return n.id === negocioId; })[0];
        var atuais = ((negocio && negocio.participantes) || []).filter(function (p) { return p !== pessoaId; });
        CrmStore.setParticipantes(negocioId, atuais);
        reabrirDetalheAtual();
    }

    // ── Lixeira ──

    function restaurarNegocioAcao(id) {
        CrmStore.restaurarNegocio(id);
        renderizarComListeners();
    }

    function excluirDefinitivoAcao(id) {
        confirmarExclusao('Excluir DEFINITIVAMENTE este negócio? Atividades e histórico dele também serão apagados. Não dá para desfazer.', function () {
            CrmStore.excluirNegocioDefinitivo(id);
            renderizarComListeners();
        });
    }

    function registrarNota(negocioId) {
        var textarea = document.getElementById('crmNotaTexto');
        if (!textarea || !textarea.value.trim()) return;
        CrmStore.adicionarNota('negocio', negocioId, textarea.value);
        reabrirDetalheAtual();
    }

    function editarNota(id) {
        _notaEmEdicaoId = id;
        reabrirDetalheAtual();
    }

    function salvarNota(id) {
        var textarea = document.getElementById('crmNotaEditTexto');
        if (!textarea) return;
        CrmStore.editarNota(id, textarea.value);
        _notaEmEdicaoId = null;
        reabrirDetalheAtual();
    }

    function cancelarEdicaoNota() {
        _notaEmEdicaoId = null;
        reabrirDetalheAtual();
    }

    function removerNotaDetalhe(id) {
        confirmarExclusao('Excluir esta nota?', function () {
            CrmStore.removerNota(id);
            reabrirDetalheAtual();
        });
    }

    // ──────────────────────────────────────────────
    //  AÇÕES DE TOOLBAR / LISTENER DELEGADO
    // ──────────────────────────────────────────────

    var ACOES = {
        visao: function (id, valor) {
            CrmStore.setVisao(valor);
            renderizarSubabas();
            renderizarConteudoAtivo();
        },
        subaba: function (id, valor) {
            CrmStore.setSubaba(valor);
            renderizarSubabas();
            renderizarConteudoAtivo();
        },
        abrirDetalhe: function (id) { if (id) abrirDetalhe(id); },
        voltar: function () { voltarDaLista(); },

        novoFunil: function () { abrirModalFunil(null); },
        editarFunil: function () {
            var funil = CrmStore.getFunilAtivo();
            if (funil) abrirModalFunil(funil.id);
        },
        fecharModalFunil: fecharModalFunil,
        salvarFunil: salvarFunil,
        arquivarFunil: arquivarFunilAtual,
        adicionarEtapaFunil: adicionarEtapaFunil,
        removerEtapaFunil: removerEtapaFunil,
        moverEtapaFunil: moverEtapaFunil,

        novoNegocio: function () { abrirModalNegocio(null); },
        editarNegocio: function (id) { abrirModalNegocio(id); },
        fecharModalNegocio: fecharModalNegocio,
        salvarNegocio: salvarNegocio,
        excluirNegocio: excluirNegocio,

        novoContato: function () { abrirModalPessoa(null); },
        editarPessoa: function (id) { abrirModalPessoa(id); },
        fecharModalPessoa: fecharModalPessoa,
        salvarPessoa: salvarPessoa,
        excluirPessoa: excluirPessoa,

        novaOrganizacao: function () { abrirModalOrganizacao(null); },
        editarOrganizacao: function (id) { abrirModalOrganizacao(id); },
        fecharModalOrganizacao: fecharModalOrganizacao,
        salvarOrganizacao: salvarOrganizacao,
        excluirOrganizacao: excluirOrganizacao,

        moverEtapaDetalhe: function (id) { moverEtapaDetalhe(id); },
        marcarGanhoDetalhe: function (id) { marcarGanhoDetalhe(id); },
        marcarPerdidoDetalhe: function (id) { marcarPerdidoDetalhe(id); },
        excluirNegocioDetalhe: function (id) { excluirNegocioDetalhe(id); },
        registrarNota: function (id) { registrarNota(id); },
        editarNota: function (id) { editarNota(id); },
        salvarNota: function (id) { salvarNota(id); },
        cancelarEdicaoNota: function () { cancelarEdicaoNota(); },
        removerNotaDetalhe: function (id) { removerNotaDetalhe(id); },

        // Fase 2: barra de visões, lixeira, modal novo e detalhe Pipedrive
        mostrarFechados: function (id, valor, el) {
            _mostrarFechados = !!(el && el.checked);
            renderizarConteudoAtivo();
        },
        restaurarNegocio: function (id) { restaurarNegocioAcao(id); },
        excluirDefinitivo: function (id) { excluirDefinitivoAcao(id); },

        escolherEtapaModal: function (id) {
            var funilId = document.getElementById('crmNegocioFunil').value;
            renderizarChevronsEtapa(funilId, id);
        },
        acEscolher: function (id, valor, el) {
            var tipo = el.dataset.ac;
            var cfg = AC_CONFIG[tipo];
            var item = cfg.fonte().filter(function (i) { return i.id === id; })[0];
            if (item) {
                document.getElementById(cfg.hidden).value = item.id;
                document.getElementById(cfg.busca).value = item.nome;
            }
            marcarACNovo(tipo, false);
            fecharListasAC();
        },
        acCriar: function (id, valor, el) {
            var tipo = el.dataset.ac;
            document.getElementById(AC_CONFIG[tipo].hidden).value = '';
            marcarACNovo(tipo, true);
            fecharListasAC();
        },

        abaDetalhe: function (id, valor) {
            _abaDetalhe = valor || 'atividade';
            reabrirDetalheAtual();
        },
        toggleSecao: function (id) {
            _secoesColapsadas[id] = !_secoesColapsadas[id];
            reabrirDetalheAtual();
        },
        filtroHistorico: function (id, valor) {
            _filtroHistorico = valor || 'todos';
            reabrirDetalheAtual();
        },
        tipoAtividade: function (id, valor) { escolherTipoAtividade(valor); },
        salvarAtividade: function (id) { salvarAtividade(id); },
        cancelarAtividade: function () { _atividadeEmEdicaoId = null; reabrirDetalheAtual(); },
        concluirAtividadeDetalhe: function (id) { concluirAtividadeDetalhe(id); },
        editarAtividadeDetalhe: function (id) { editarAtividadeDetalhe(id); },
        excluirAtividadeDetalhe: function (id) { excluirAtividadeDetalhe(id); },
        addParticipante: function () { adicionarParticipante(); },
        removerParticipante: function (id) { removerParticipante(id); }
    };

    function aoClicar(e) {
        var el = e.target.closest('[data-crm-action]');

        // Clique fora de um autocomplete fecha as listas suspensas
        if (!e.target.closest('.crm-autocomplete')) fecharListasAC();

        if (!el) return;
        var acao = el.dataset.crmAction;
        var id = el.dataset.id || null;
        var valor = el.dataset.valor || null;
        var fn = ACOES[acao];
        if (fn) {
            // preventDefault num checkbox desfaria o próprio toggle
            if (!(el.tagName === 'INPUT' && el.type === 'checkbox')) e.preventDefault();
            try { fn(id, valor, el, e); } catch (err) { console.error('CRM ação "' + acao + '" falhou:', err); }
        }
    }

    function ligarListeners() {
        // Delegado em document (não em #crm): os modais vivem fora da seção no DOM.
        if (!document._crmListenerGlobalLigado) {
            document._crmListenerGlobalLigado = true;
            document.addEventListener('click', aoClicar);
        }

        var selectFunilPrincipal = document.getElementById('crmSelectFunil');
        if (selectFunilPrincipal && !selectFunilPrincipal._crmChangeLigado) {
            selectFunilPrincipal._crmChangeLigado = true;
            selectFunilPrincipal.addEventListener('change', function () {
                CrmStore.setFunilAtivo(selectFunilPrincipal.value);
                renderizarResumo();
                renderizarConteudoAtivo();
            });
        }

        var busca = document.getElementById('crmBusca');
        if (busca && !busca._crmInputLigado) {
            busca._crmInputLigado = true;
            busca.addEventListener('input', function () {
                CrmStore.setFiltros({ busca: busca.value });
                renderizarConteudoAtivo();
            });
        }

        var selectFunilModal = document.getElementById('crmNegocioFunil');
        if (selectFunilModal && !selectFunilModal._crmChangeLigado) {
            selectFunilModal._crmChangeLigado = true;
            selectFunilModal.addEventListener('change', function () {
                renderizarChevronsEtapa(selectFunilModal.value, null);
            });
        }

        var selectOrdenar = document.getElementById('crmOrdenar');
        if (selectOrdenar && !selectOrdenar._crmChangeLigado) {
            selectOrdenar._crmChangeLigado = true;
            selectOrdenar.addEventListener('change', function () {
                _ordenarPor = selectOrdenar.value;
                renderizarConteudoAtivo();
            });
        }

        // Autocompletes do modal de negócio (pessoa e organização)
        Object.keys(AC_CONFIG).forEach(function (tipo) {
            var input = document.getElementById(AC_CONFIG[tipo].busca);
            if (input && !input._crmACLigado) {
                input._crmACLigado = true;
                input.addEventListener('input', function () {
                    // Digitou por cima de uma escolha → invalida o id escolhido
                    document.getElementById(AC_CONFIG[tipo].hidden).value = '';
                    marcarACNovo(tipo, false);
                    renderizarListaAC(tipo);
                });
                input.addEventListener('focus', function () { renderizarListaAC(tipo); });
            }
        });

        var selectTemplateFunil = document.getElementById('crmFunilTemplate');
        if (selectTemplateFunil && !selectTemplateFunil._crmChangeLigado) {
            selectTemplateFunil._crmChangeLigado = true;
            selectTemplateFunil.addEventListener('change', aoTrocarTemplateFunil);
        }
    }

    function renderizarComListeners() {
        ligarListeners();
        renderizar();
    }

    window.Crm = {
        renderizar: renderizarComListeners,
        renderizarResumo: renderizarResumo,
        renderizarConteudoAtivo: renderizarConteudoAtivo,
        abrirDetalhe: abrirDetalhe,
        voltarDaLista: voltarDaLista
    };
})();
