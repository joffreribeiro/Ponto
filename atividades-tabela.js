/* atividades-tabela.js - módulo separado para renderizar a tabela de atividades */
const AtividadesTabela = (function(){
    function renderizarTabelaAtividades(items) {
        const tbody = document.querySelector('#tabelaAtividades tbody');
        if (!tbody) return;
        const rows = items.map(a => {
            const prazo = a.prazo ? DateUtils.formatBR(a.prazo) : '';
            const dataDoc = a.dataDoc ? DateUtils.formatBR(a.dataDoc) : '';
            const rawDias = typeof a.dias !== 'undefined' ? a.dias : (a.atividadeDias ?? '');
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
                <td>${escapeHtml(a.ordem ?? '')}</td>
                <td>${escapeHtml(a.tedPtrab ?? '')}</td>
                <td>${escapeHtml(a.objeto ?? '')}</td>
                <td>${escapeHtml(a.processoPrincipal ?? '')}</td>
                <td>${escapeHtml(a.assunto ?? '')}</td>
                <td>${escapeHtml(a.processoSolicitacao ?? '')}</td>
                <td>${dataDoc}</td>
                <td>${escapeHtml(a.tipoDoc ?? '')}</td>
                <td>${escapeHtml(a.numeroDoc ?? '')}</td>
                <td>${escapeHtml(a.remetente ?? '')}</td>
                <td>${escapeHtml(a.destinatario ?? '')}</td>
                <td>${escapeHtml(a.acaoRealizar ?? '')}</td>
                <td>${prazo}</td>
                <td>${diasDisplay}</td>
                <td>${escapeHtml(a.observacoes ?? '')}</td>
                <td>${a.finalizado ? 'Sim' : 'Não'}</td>
                <td>${escapeHtml(a.status ?? '')}</td>
                <td>
                    <button class="btn-secondary" data-action="editar" data-id="${a.id}">✏️</button>
                    <button class="btn-secondary" data-action="remover" data-id="${a.id}">🗑️</button>
                </td>
            </tr>`;
        }).join('');
        tbody.innerHTML = rows;
    }

    return { renderizarTabelaAtividades };
})();

// Export to global for backward compatibility
window.AtividadesTabela = AtividadesTabela;
window.renderizarTabelaAtividades = function(items){ return AtividadesTabela.renderizarTabelaAtividades(items); };
