/**
 * crm-kanban.js - Board Kanban do módulo de Relacionamento (CRM)
 * Molde: atividades-kanban.js (drag-and-drop HTML5 nativo). Diferenças aqui:
 * colunas vêm de funil.etapas (dinâmicas, não fixas), cada coluna soma valor,
 * e o drop calcula o índice de inserção para reordenar dentro da coluna.
 */
(function () {
    var esc = Utils.escapeHtml.bind(Utils);

    function nomeOrganizacao(negocio) {
        if (!negocio.organizacaoId) return '';
        var crm = CrmStore.getCrm();
        if (!crm) return '';
        var org = crm.organizacoes.filter(function (o) { return o.id === negocio.organizacaoId; })[0];
        return org ? org.nome : '';
    }

    function renderizarCard(n, mostrarValor) {
        var valorHtml = (mostrarValor && n.valor !== null && n.valor !== undefined)
            ? '<div class="crm-card-valor">' + esc(CrmCalculos.formatarMoeda(n.valor, n.moeda)) + '</div>'
            : '';
        var orgNome = nomeOrganizacao(n);
        var previsaoFormatada = n.dataPrevisao && window.DateUtils ? DateUtils.formatBR(n.dataPrevisao) : (n.dataPrevisao || '');
        var previsaoHtml = previsaoFormatada ? (' &bull; ' + esc(previsaoFormatada)) : '';

        return '' +
            '<div class="kanban-card crm-card" draggable="true" data-id="' + esc(n.id) + '" data-crm-action="abrirDetalhe">' +
                '<strong>' + esc(n.titulo || '(sem título)') + '</strong>' +
                valorHtml +
                (orgNome ? '<div class="small-text">' + esc(orgNome) + '</div>' : '') +
                '<div class="small-text">' + esc(n.responsavel || '—') + previsaoHtml + '</div>' +
            '</div>';
    }

    /**
     * Renderiza o board inteiro a partir do funil ativo e da lista de negócios
     * já filtrada para esse funil. `funil` pode ser null (nenhum funil ainda).
     */
    function renderizarBoard(funil, negocios) {
        var board = document.getElementById('crmKanban');
        if (!board) return;

        if (!funil) {
            board.innerHTML = '<div class="crm-empty">Crie um funil para começar.</div>';
            return;
        }

        var porEtapa = CrmCalculos.agruparPorEtapa(negocios, funil.etapas);
        var mostrarValor = funil.mostrarValor !== false;
        var etapasOrdenadas = funil.etapas.slice().sort(function (a, b) { return a.ordem - b.ordem; });

        var colunas = etapasOrdenadas.map(function (etapa) {
            var itens = porEtapa[etapa.id] || [];
            var soma = CrmCalculos.somarValor(itens);
            var cards = itens.map(function (n) { return renderizarCard(n, mostrarValor); }).join('');

            return '' +
                '<div class="kanban-column crm-column" data-etapa-id="' + esc(etapa.id) + '" style="--crm-etapa-cor:' + esc(etapa.cor || '#64748b') + '">' +
                    '<h4>' +
                        '<span class="crm-col-nome">' + esc(etapa.nome) + '</span>' +
                        '<span class="crm-col-count">' + itens.length + '</span>' +
                        (mostrarValor ? '<span class="crm-col-soma">' + esc(CrmCalculos.formatarMoeda(soma, funil.moeda)) + '</span>' : '') +
                    '</h4>' +
                    '<div class="kanban-list" data-etapa-id="' + esc(etapa.id) + '">' + cards + '</div>' +
                '</div>';
        }).join('');

        board.innerHTML = '<div class="kanban-board crm-board">' + colunas + '</div>';
        ligarDragHandlers(board);
    }

    // ──────────────────────────────────────────────
    //  DRAG AND DROP
    // ──────────────────────────────────────────────

    var _arrastandoId = null;

    function onDragStart(e) {
        var id = e.currentTarget.dataset.id;
        _arrastandoId = id;
        try { e.dataTransfer.setData('text/plain', id); } catch (err) { /* alguns browsers restringem */ }
        e.currentTarget.classList.add('dragging');
    }

    function onDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        _arrastandoId = null;
        // Garante persistência mesmo se o usuário fechar a aba logo após soltar
        if (window.AppState && typeof AppState.flushAutoSave === 'function') {
            try { AppState.flushAutoSave(); } catch (_) { /* ignore */ }
        }
    }

    function onDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('kanban-list--over');
    }

    function onDragLeave(e) {
        e.currentTarget.classList.remove('kanban-list--over');
    }

    function onDrop(e) {
        e.preventDefault();
        var lista = e.currentTarget;
        lista.classList.remove('kanban-list--over');

        var etapaId = lista.dataset.etapaId;
        var id = (e.dataTransfer && e.dataTransfer.getData && e.dataTransfer.getData('text/plain')) || _arrastandoId;
        if (!id || !etapaId) return;

        // Índice de inserção a partir da posição Y do cursor entre os cards já existentes
        var irmaos = Array.prototype.slice.call(lista.querySelectorAll('.kanban-card:not(.dragging)'));
        var indice = irmaos.length;
        for (var i = 0; i < irmaos.length; i++) {
            var r = irmaos[i].getBoundingClientRect();
            if (e.clientY < r.top + r.height / 2) { indice = i; break; }
        }

        if (window.CrmStore && typeof CrmStore.moverNegocio === 'function') {
            CrmStore.moverNegocio(id, etapaId, indice);
        }
        if (window.Crm) {
            if (typeof Crm.renderizarConteudoAtivo === 'function') Crm.renderizarConteudoAtivo();
            if (typeof Crm.renderizarResumo === 'function') Crm.renderizarResumo();
        }
    }

    function ligarDragHandlers(board) {
        board.querySelectorAll('.crm-card').forEach(function (card) {
            card.addEventListener('dragstart', onDragStart);
            card.addEventListener('dragend', onDragEnd);
        });
        board.querySelectorAll('.kanban-list').forEach(function (lista) {
            lista.addEventListener('dragover', onDragOver);
            lista.addEventListener('dragleave', onDragLeave);
            lista.addEventListener('drop', onDrop);
        });
    }

    window.CrmKanban = {
        renderizarBoard: renderizarBoard
    };
})();
