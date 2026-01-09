(function(){
    // Módulo responsável por renderizar a tabela de atividades
    function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]; }); }

    function renderizarTabelaAtividades(items) {
        const tbody = document.querySelector('#tabelaAtividades tbody');
        if (!tbody) return;
        const rows = items.map(a => {
            const prazo = a.prazo ? (window.DateUtils && DateUtils.formatBR ? DateUtils.formatBR(a.prazo) : a.prazo) : '';
            const dataDoc = a.dataDoc ? (window.DateUtils && DateUtils.formatBR ? DateUtils.formatBR(a.dataDoc) : a.dataDoc) : '';
            const rawDias = typeof a.dias !== 'undefined' ? a.dias : (a.atividadeDias || '');
            const diasNum = Number(rawDias);
            let corClasse = '';
            if (a.finalizado) corClasse = 'linha-cinza';
            else if (!isNaN(diasNum)) {
                if (diasNum > 10) corClasse = 'linha-verde';
                else if (diasNum <= 10 && diasNum >= 5) corClasse = 'linha-amarelo';
                else if (diasNum < 5) corClasse = 'linha-vermelho';
            }
            const diasDisplay = (rawDias === '' || rawDias === null) ? '' : (diasNum < 0 ? `<span style="color:#b91c1c;">Vencido ${Math.abs(diasNum)}</span>` : String(diasNum));
            return `<tr${corClasse ? ` class="${corClasse}"` : ''}>
                <td>${escapeHtml(a.ordem || '')}</td>
                <td>${escapeHtml(a.tedPtrab || '')}</td>
                <td>${escapeHtml(a.objeto || '')}</td>
                <td>${escapeHtml(a.processoPrincipal || '')}</td>
                <td>${escapeHtml(a.assunto || '')}</td>
                <td>${escapeHtml(a.processoSolicitacao || '')}</td>
                <td>${dataDoc}</td>
                <td>${escapeHtml(a.tipoDoc || '')}</td>
                <td>${escapeHtml(a.numeroDoc || '')}</td>
                <td>${escapeHtml(a.remetente || '')}</td>
                <td>${escapeHtml(a.destinatario || '')}</td>
                <td>${escapeHtml(a.acaoRealizar || '')}</td>
                <td>${prazo}</td>
                <td>${diasDisplay}</td>
                <td>${escapeHtml(a.observacoes || '')}</td>
                <td>${a.finalizado ? 'Sim' : 'Não'}</td>
                <td>${escapeHtml(a.status || '')}</td>
                <td>
                    <button class="btn-secondary" data-action="editarAtividade" data-id="${a.id}">${(typeof svgIcon==='function')? svgIcon('edit', { title: 'Editar atividade', color: 'currentColor' }) : '✏️'}</button>
                    <button class="btn-secondary" data-action="removerAtividade" data-id="${a.id}">${(typeof svgIcon==='function')? svgIcon('trash', { title: 'Remover atividade', color: 'currentColor' }) : '🗑️'}</button>
                </td>
            </tr>`;
        }).join('');
        tbody.innerHTML = rows;
    }

    window.AtividadesTabela = {
        renderizarTabelaAtividades
    };
})();
