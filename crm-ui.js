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

    function secao() {
        return document.getElementById('crm');
    }

    // ──────────────────────────────────────────────
    //  RENDER PRINCIPAL
    // ──────────────────────────────────────────────

    function renderizar() {
        var crm = window.CrmStore && CrmStore.getCrm();
        if (!crm) return;

        if (crm.config.detalheAbertoId && crm.negocios.some(function (n) { return n.id === crm.config.detalheAbertoId; })) {
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

        var btnContato = document.getElementById('crmBtnNovoContato');
        var btnOrganizacao = document.getElementById('crmBtnNovaOrganizacao');
        if (btnContato) btnContato.style.display = (crm.config.subaba === 'pessoas') ? '' : 'none';
        if (btnOrganizacao) btnOrganizacao.style.display = (crm.config.subaba === 'organizacoes') ? '' : 'none';
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

    function renderizarConteudoAtivo() {
        var crm = CrmStore.getCrm();
        var subaba = crm.config.subaba;
        var visao = crm.config.visao;

        var kanban = document.getElementById('crmKanban');
        var listaNegocios = document.getElementById('crmListaNegocios');
        var listaPessoas = document.getElementById('crmListaPessoas');
        var listaOrganizacoes = document.getElementById('crmListaOrganizacoes');

        if (kanban) kanban.style.display = (subaba === 'negocios' && visao === 'kanban') ? 'block' : 'none';
        if (listaNegocios) listaNegocios.style.display = (subaba === 'negocios' && visao === 'lista') ? 'block' : 'none';
        if (listaPessoas) listaPessoas.style.display = (subaba === 'pessoas') ? 'block' : 'none';
        if (listaOrganizacoes) listaOrganizacoes.style.display = (subaba === 'organizacoes') ? 'block' : 'none';

        if (subaba === 'negocios' && visao === 'kanban' && window.CrmKanban) {
            var funil = CrmStore.getFunilAtivo();
            var negocios = funil ? CrmStore.listarNegocios(funil.id) : [];
            var filtros = crm.config.filtros || {};
            if (filtros.busca) negocios = CrmCalculos.filtrarNegocios(negocios, filtros);
            CrmKanban.renderizarBoard(funil, negocios);
        }
        if (subaba === 'negocios' && visao === 'lista') renderizarListaNegocios();
        if (subaba === 'pessoas') renderizarListaPessoas();
        if (subaba === 'organizacoes') renderizarListaOrganizacoes();
    }

    // ──────────────────────────────────────────────
    //  LISTAS (visão Lista de negócios, Contatos, Organizações)
    // ──────────────────────────────────────────────

    function renderizarListaNegocios() {
        var el = document.getElementById('crmListaNegocios');
        if (!el) return;
        var crm = CrmStore.getCrm();
        var funil = CrmStore.getFunilAtivo();
        if (!funil) { el.innerHTML = '<div class="crm-empty">Crie um funil para começar.</div>'; return; }

        var mostrarValor = funil.mostrarValor !== false;
        var negocios = CrmStore.listarNegocios(funil.id);
        var filtros = crm.config.filtros || {};
        if (filtros.busca) negocios = CrmCalculos.filtrarNegocios(negocios, filtros);
        negocios = CrmCalculos.ordenarNegocios(negocios, 'atualizado');

        var etapasPorId = {};
        funil.etapas.forEach(function (e) { etapasPorId[e.id] = e; });

        var linhas = negocios.map(function (n) {
            var etapa = etapasPorId[n.etapaId];
            var org = crm.organizacoes.filter(function (o) { return o.id === n.organizacaoId; })[0];
            return '' +
                '<tr>' +
                    '<td>' + esc(n.titulo || '(sem título)') + '</td>' +
                    '<td>' + esc(etapa ? etapa.nome : '—') + '</td>' +
                    (mostrarValor ? '<td>' + esc(n.valor != null ? CrmCalculos.formatarMoeda(n.valor, n.moeda) : '—') + '</td>' : '') +
                    '<td>' + esc(org ? org.nome : '—') + '</td>' +
                    '<td>' + esc(n.responsavel || '—') + '</td>' +
                    '<td>' + esc(n.dataPrevisao && window.DateUtils ? DateUtils.formatBR(n.dataPrevisao) : (n.dataPrevisao || '—')) + '</td>' +
                    '<td>' +
                        '<button type="button" class="btn-secondary" data-crm-action="abrirDetalhe" data-id="' + esc(n.id) + '">Ver</button> ' +
                        '<button type="button" class="btn-secondary" data-crm-action="editarNegocio" data-id="' + esc(n.id) + '">Editar</button>' +
                    '</td>' +
                '</tr>';
        }).join('');

        el.innerHTML = '' +
            '<div class="table-container">' +
                '<table>' +
                    '<thead><tr>' +
                        '<th>Título</th><th>Etapa</th>' +
                        (mostrarValor ? '<th>Valor</th>' : '') +
                        '<th>Organização</th><th>Responsável</th><th>Previsão</th><th>Ações</th>' +
                    '</tr></thead>' +
                    '<tbody>' + (linhas || '<tr><td colspan="7">Nenhum negócio neste funil.</td></tr>') + '</tbody>' +
                '</table>' +
            '</div>';
    }

    function renderizarListaPessoas() {
        var el = document.getElementById('crmListaPessoas');
        if (!el) return;
        var crm = CrmStore.getCrm();
        var pessoas = CrmStore.listarPessoas();

        var linhas = pessoas.map(function (p) {
            var org = crm.organizacoes.filter(function (o) { return o.id === p.organizacaoId; })[0];
            var nNegocios = CrmCalculos.negociosDaPessoa(crm.negocios, p.id).length;
            return '' +
                '<tr>' +
                    '<td>' + esc(p.nome || '(sem nome)') + '</td>' +
                    '<td>' + esc(org ? org.nome : '—') + '</td>' +
                    '<td>' + esc(p.cargo || '—') + '</td>' +
                    '<td>' + esc(p.email || '—') + '</td>' +
                    '<td>' + esc(p.telefone || '—') + '</td>' +
                    '<td>' + nNegocios + '</td>' +
                    '<td>' +
                        '<button type="button" class="btn-secondary" data-crm-action="editarPessoa" data-id="' + esc(p.id) + '">Editar</button>' +
                    '</td>' +
                '</tr>';
        }).join('');

        el.innerHTML = '' +
            '<div class="table-container">' +
                '<table>' +
                    '<thead><tr><th>Nome</th><th>Organização</th><th>Cargo</th><th>E-mail</th><th>Telefone</th><th>Negócios</th><th>Ações</th></tr></thead>' +
                    '<tbody>' + (linhas || '<tr><td colspan="7">Nenhum contato cadastrado.</td></tr>') + '</tbody>' +
                '</table>' +
            '</div>';
    }

    function renderizarListaOrganizacoes() {
        var el = document.getElementById('crmListaOrganizacoes');
        if (!el) return;
        var crm = CrmStore.getCrm();
        var organizacoes = CrmStore.listarOrganizacoes();

        var linhas = organizacoes.map(function (o) {
            var negociosOrg = CrmCalculos.negociosDaOrganizacao(crm.negocios, o.id);
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
        criacao: '✨', etapa: '➡️', campo: '✏️', nota: '📝', status: '🚩', exclusao: '🗑️', vinculo: '🔗'
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
        var timeline = CrmStore.historicoDe('negocio', negocio.id);
        var outrosNegocios = organizacao ? CrmCalculos.negociosDaOrganizacao(crm.negocios, organizacao.id).filter(function (n) { return n.id !== negocio.id; }) : [];
        var contatosDaOrg = organizacao ? crm.pessoas.filter(function (p) { return p.organizacaoId === organizacao.id; }) : [];

        var stepperHtml = etapas.map(function (e) {
            var classeAtual = (e.id === negocio.etapaId) ? ' crm-step-atual' : '';
            return '<button type="button" class="crm-step' + classeAtual + '" data-crm-action="moverEtapaDetalhe" data-id="' + esc(e.id) + '" style="--crm-etapa-cor:' + esc(e.cor || '#64748b') + '">' + esc(e.nome) + '</button>';
        }).join('');

        var tagsHtml = (negocio.tags || []).map(function (t) { return '<span class="crm-tag">' + esc(t) + '</span>'; }).join(' ');

        var esquerda = '' +
            '<div class="card crm-detalhe-col">' +
                '<button type="button" class="btn-secondary" data-crm-action="voltar" style="margin-bottom:10px;">← Voltar</button>' +
                '<h2 style="margin:0 0 4px;">' + esc(negocio.titulo || '(sem título)') + '</h2>' +
                (mostrarValor && negocio.valor !== null && negocio.valor !== undefined ? '<div class="crm-detalhe-valor">' + esc(CrmCalculos.formatarMoeda(negocio.valor, negocio.moeda)) + '</div>' : '') +
                '<div class="crm-stepper">' + stepperHtml + '</div>' +
                '<dl class="crm-detalhe-campos">' +
                    '<dt>Responsável</dt><dd>' + esc(negocio.responsavel || '—') + '</dd>' +
                    '<dt>Previsão</dt><dd>' + esc(negocio.dataPrevisao && window.DateUtils ? DateUtils.formatBR(negocio.dataPrevisao) : (negocio.dataPrevisao || '—')) + '</dd>' +
                    '<dt>Status</dt><dd>' + esc(negocio.status) + '</dd>' +
                    ((negocio.status === 'perdido' && negocio.motivoPerda) ? '<dt>Motivo da perda</dt><dd>' + esc(negocio.motivoPerda) + '</dd>' : '') +
                '</dl>' +
                (tagsHtml ? '<div class="crm-tags">' + tagsHtml + '</div>' : '') +
                (negocio.descricao ? '<p class="crm-detalhe-descricao">' + esc(negocio.descricao) + '</p>' : '') +
                '<div class="crm-detalhe-acoes">' +
                    '<button type="button" class="btn-secondary" data-crm-action="editarNegocio" data-id="' + esc(negocio.id) + '">Editar</button> ' +
                    '<button type="button" class="btn-secondary" data-crm-action="marcarGanhoDetalhe" data-id="' + esc(negocio.id) + '">Ganho</button> ' +
                    '<button type="button" class="btn-secondary" data-crm-action="marcarPerdidoDetalhe" data-id="' + esc(negocio.id) + '">Perdido</button> ' +
                    '<button type="button" class="btn-danger" data-crm-action="excluirNegocioDetalhe" data-id="' + esc(negocio.id) + '">Excluir</button>' +
                '</div>' +
            '</div>';

        var timelineHtml = timeline.map(renderizarTimelineItem).join('');

        var centro = '' +
            '<div class="card crm-detalhe-col">' +
                '<div class="crm-nota-composer">' +
                    '<textarea id="crmNotaTexto" rows="2" placeholder="Escreva uma nota…"></textarea>' +
                    '<button type="button" class="btn-primary" data-crm-action="registrarNota" data-id="' + esc(negocio.id) + '" style="margin-top:6px;">Registrar</button>' +
                '</div>' +
                '<div class="crm-timeline">' + (timelineHtml || '<div class="crm-empty">Sem histórico ainda.</div>') + '</div>' +
            '</div>';

        var direita = '' +
            '<div class="card crm-detalhe-col">' +
                '<h3 style="margin-top:0;">Organização</h3>' +
                (organizacao ?
                    ('<div><strong>' + esc(organizacao.nome) + '</strong></div>' +
                     (organizacao.site ? '<div class="small-text">' + esc(organizacao.site) + '</div>' : '') +
                     '<button type="button" class="btn-secondary" data-crm-action="editarOrganizacao" data-id="' + esc(organizacao.id) + '" style="margin-top:6px;">Ver / editar</button>')
                    : '<div class="crm-empty">Nenhuma organização vinculada.</div>') +

                '<h3>Contatos</h3>' +
                (contatosDaOrg.length ? contatosDaOrg.map(function (p) {
                    return '<div class="crm-contato-item">' + esc(p.nome) + (p.id === negocio.pessoaId ? ' <span class="small-text">(principal)</span>' : '') + '</div>';
                }).join('') : (pessoa ? '<div class="crm-contato-item">' + esc(pessoa.nome) + '</div>' : '<div class="crm-empty">Nenhum contato vinculado.</div>')) +

                (outrosNegocios.length ?
                    ('<h3>Outros negócios desta organização</h3>' +
                     outrosNegocios.map(function (n) {
                         return '<div class="crm-outro-negocio" data-crm-action="abrirDetalhe" data-id="' + esc(n.id) + '">' + esc(n.titulo || '(sem título)') + '</div>';
                     }).join(''))
                    : '') +
            '</div>';

        container.innerHTML = '<div class="crm-detalhe-grid">' + esquerda + centro + direita + '</div>';
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

    function popularSelectEtapaModalNegocio(funilId, etapaSelecionadaId) {
        var select = document.getElementById('crmNegocioEtapa');
        var crm = CrmStore.getCrm();
        var funil = crm.funis.filter(function (f) { return f.id === funilId; })[0];
        var etapas = funil ? funil.etapas.slice().sort(function (a, b) { return a.ordem - b.ordem; }) : [];
        select.innerHTML = etapas.map(function (e) {
            var sel = (e.id === etapaSelecionadaId) ? ' selected' : '';
            return '<option value="' + esc(e.id) + '"' + sel + '>' + esc(e.nome) + '</option>';
        }).join('');
        atualizarVisibilidadeCamposNegocio(funil, select.value);
    }

    function popularSelectOrganizacaoModalNegocio(selecionadoId) {
        var select = document.getElementById('crmNegocioOrganizacao');
        var organizacoes = CrmStore.listarOrganizacoes();
        select.innerHTML = '<option value="">— Nenhuma —</option>' + organizacoes.map(function (o) {
            var sel = (o.id === selecionadoId) ? ' selected' : '';
            return '<option value="' + esc(o.id) + '"' + sel + '>' + esc(o.nome) + '</option>';
        }).join('');
    }

    function popularSelectPessoaModalNegocio(organizacaoId, selecionadoId) {
        var select = document.getElementById('crmNegocioPessoa');
        var pessoas = CrmStore.listarPessoas().filter(function (p) {
            return !organizacaoId || p.organizacaoId === organizacaoId;
        });
        select.innerHTML = '<option value="">— Nenhum —</option>' + pessoas.map(function (p) {
            var sel = (p.id === selecionadoId) ? ' selected' : '';
            return '<option value="' + esc(p.id) + '"' + sel + '>' + esc(p.nome) + '</option>';
        }).join('');
    }

    function atualizarVisibilidadeCamposNegocio(funil, etapaId) {
        var grupoValor = document.getElementById('crmNegocioValorGroup');
        if (grupoValor) grupoValor.style.display = (funil && funil.mostrarValor === false) ? 'none' : '';

        var etapa = funil ? funil.etapas.filter(function (e) { return e.id === etapaId; })[0] : null;
        var grupoMotivo = document.getElementById('crmNegocioMotivoPerdaGroup');
        if (grupoMotivo) grupoMotivo.style.display = (etapa && etapa.tipo === 'perdido') ? '' : 'none';
    }

    function abrirModalNegocio(id) {
        var crm = CrmStore.getCrm();
        var negocio = id ? crm.negocios.filter(function (n) { return n.id === id; })[0] : null;
        var funilId = negocio ? negocio.funilId : (CrmStore.getFunilAtivo() ? CrmStore.getFunilAtivo().id : null);

        document.getElementById('crmModalNegocioTitulo').textContent = negocio ? 'Editar Negócio' : 'Novo Negócio';
        document.getElementById('crmNegocioId').value = negocio ? negocio.id : '';
        document.getElementById('crmNegocioTitulo').value = negocio ? negocio.titulo : '';
        document.getElementById('crmNegocioValor').value = (negocio && negocio.valor != null) ? negocio.valor : '';
        document.getElementById('crmNegocioPrevisao').value = negocio && negocio.dataPrevisao ? negocio.dataPrevisao : '';
        document.getElementById('crmNegocioResponsavel').value = negocio ? negocio.responsavel : '';
        document.getElementById('crmNegocioTags').value = negocio && negocio.tags ? negocio.tags.join(', ') : '';
        document.getElementById('crmNegocioDescricao').value = negocio ? negocio.descricao : '';
        document.getElementById('crmNegocioMotivoPerda').value = negocio ? negocio.motivoPerda : '';

        popularSelectFunilModalNegocio(funilId);
        popularSelectEtapaModalNegocio(funilId, negocio ? negocio.etapaId : null);
        popularSelectOrganizacaoModalNegocio(negocio ? negocio.organizacaoId : null);
        popularSelectPessoaModalNegocio(negocio ? negocio.organizacaoId : null, negocio ? negocio.pessoaId : null);

        document.getElementById('crmBtnExcluirNegocio').style.display = negocio ? '' : 'none';

        document.getElementById('modalNegocio').classList.add('active');
    }

    function fecharModalNegocio() {
        document.getElementById('modalNegocio').classList.remove('active');
    }

    function salvarNegocio() {
        var id = document.getElementById('crmNegocioId').value;
        var funilId = document.getElementById('crmNegocioFunil').value;
        var crm = CrmStore.getCrm();
        var funil = crm.funis.filter(function (f) { return f.id === funilId; })[0];

        var tagsBrutas = document.getElementById('crmNegocioTags').value;
        var dados = {
            funilId: funilId,
            etapaId: document.getElementById('crmNegocioEtapa').value,
            titulo: document.getElementById('crmNegocioTitulo').value.trim(),
            valor: document.getElementById('crmNegocioValor').value === '' ? null : Number(document.getElementById('crmNegocioValor').value),
            organizacaoId: document.getElementById('crmNegocioOrganizacao').value || null,
            pessoaId: document.getElementById('crmNegocioPessoa').value || null,
            responsavel: document.getElementById('crmNegocioResponsavel').value.trim(),
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
        confirmarExclusao('Excluir este negócio? Esta ação não pode ser desfeita.', function () {
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
        confirmarExclusao('Excluir este negócio? Esta ação não pode ser desfeita.', function () {
            CrmStore.removerNegocio(id);
            voltarDaLista();
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
        removerNotaDetalhe: function (id) { removerNotaDetalhe(id); }
    };

    function aoClicar(e) {
        var el = e.target.closest('[data-crm-action]');
        if (!el) return;
        var acao = el.dataset.crmAction;
        var id = el.dataset.id || null;
        var valor = el.dataset.valor || null;
        var fn = ACOES[acao];
        if (fn) {
            e.preventDefault();
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
                popularSelectEtapaModalNegocio(selectFunilModal.value, null);
            });
        }

        var selectEtapaModal = document.getElementById('crmNegocioEtapa');
        if (selectEtapaModal && !selectEtapaModal._crmChangeLigado) {
            selectEtapaModal._crmChangeLigado = true;
            selectEtapaModal.addEventListener('change', function () {
                var crm = CrmStore.getCrm();
                var funilId = document.getElementById('crmNegocioFunil').value;
                var funil = crm.funis.filter(function (f) { return f.id === funilId; })[0];
                atualizarVisibilidadeCamposNegocio(funil, selectEtapaModal.value);
            });
        }

        var selectOrganizacaoModal = document.getElementById('crmNegocioOrganizacao');
        if (selectOrganizacaoModal && !selectOrganizacaoModal._crmChangeLigado) {
            selectOrganizacaoModal._crmChangeLigado = true;
            selectOrganizacaoModal.addEventListener('change', function () {
                popularSelectPessoaModalNegocio(selectOrganizacaoModal.value || null, null);
            });
        }

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
