(function(){
    // Módulo responsável por renderizar a tabela de atividades
    function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]; }); }

    /**
     * Formata data para DD/MM/AAAA
     * Aceita formatos: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
     */
    function formatarDataBR(str) {
        if (!str) return '';
        const s = String(str).trim();
        
        // Se já está em DD/MM/AAAA, retorna como está
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
            return s;
        }
        
        // YYYY-MM-DD -> DD/MM/AAAA
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [ano, mes, dia] = s.split('-');
            return `${dia}/${mes}/${ano}`;
        }
        
        // DD-MM-YYYY -> DD/MM/AAAA
        if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
            const [dia, mes, ano] = s.split('-');
            return `${dia}/${mes}/${ano}`;
        }
        
        // YYYY/MM/DD -> DD/MM/AAAA
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
            const [ano, mes, dia] = s.split('/');
            return `${dia}/${mes}/${ano}`;
        }
        
        // Fallback: retorna original
        return s;
    }

    function renderizarTabelaAtividades(items) {
        const tbody = document.querySelector('#tabelaAtividades tbody');
        if (!tbody) return;
        const rows = items.map(a => {
            // Formatar datas usando função local
            const prazo = formatarDataBR(a.prazo);
            const dataDoc = formatarDataBR(a.dataDoc);
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
