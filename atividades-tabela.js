(function(){
    // Módulo responsável por renderizar a tabela de atividades
    var escapeHtml = Utils.escapeHtml.bind(Utils);

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
        try {
            console.debug('AtividadesTabela.renderizarTabelaAtividades: called with items length =', Array.isArray(items)? items.length : typeof items);
        } catch(e){}
        const tbody = document.querySelector('#tabelaAtividades tbody');
        if (!tbody) {
            console.error('AtividadesTabela: tbody not found for #tabelaAtividades');
            return;
        }
        let rows = '';
        try {
            rows = items.map((a, idx) => {
            // Compatibilidade: mapear campos antigos para novos se necessário
            const ordem = a.ordem || String(idx + 1);
            const tedPtrab = a.tedPtrab || '';
            const objeto = a.objeto || a.titulo || ''; // fallback para titulo
            const processoPrincipal = a.processoPrincipal || '';
            const assunto = a.assunto || a.descricao || ''; // fallback para descricao
            const processoSolicitacao = a.processoSolicitacao || '';
            const tipoDoc = a.tipoDoc || '';
            const numeroDoc = a.numeroDoc || '';
            const remetente = a.remetente || a.responsavel || ''; // fallback para responsavel
            const destinatario = a.destinatario || '';
            const acaoRealizar = a.acaoRealizar || '';
            const observacoes = a.observacoes || '';
            
            // Formatar datas usando função local
            const prazo = formatarDataBR(a.prazo);
            const dataDoc = formatarDataBR(a.dataDoc);
            const rawDias = typeof a.dias !== 'undefined' ? a.dias : (a.atividadeDias || '');
            const diasNum = Number(rawDias);
            let corClasse = '';
            if (a.finalizado) corClasse = 'linha-cinza';
            else if (!isNaN(diasNum) && rawDias !== '') {
                if (diasNum > 10) corClasse = 'linha-verde';
                else if (diasNum <= 10 && diasNum >= 5) corClasse = 'linha-amarelo';
                else if (diasNum < 5) corClasse = 'linha-vermelho';
            }
            const diasDisplay = (rawDias === '' || rawDias === null || rawDias === undefined) ? '' : (diasNum < 0 ? `<span style="color:#b91c1c;">Vencido ${Math.abs(diasNum)}</span>` : String(diasNum));
            return `<tr${corClasse ? ` class="${corClasse}"` : ''}>
                <td>${escapeHtml(ordem)}</td>
                <td>${escapeHtml(tedPtrab)}</td>
                <td>${escapeHtml(objeto)}</td>
                <td>${escapeHtml(processoPrincipal)}</td>
                <td>${escapeHtml(assunto)}</td>
                <td>${escapeHtml(processoSolicitacao)}</td>
                <td>${dataDoc}</td>
                <td>${escapeHtml(tipoDoc)}</td>
                <td>${escapeHtml(numeroDoc)}</td>
                <td>${escapeHtml(remetente)}</td>
                <td>${escapeHtml(destinatario)}</td>
                <td>${escapeHtml(acaoRealizar)}</td>
                <td>${prazo}</td>
                <td>${diasDisplay}</td>
                <td>${escapeHtml(observacoes)}</td>
                <td>${a.finalizado ? 'Sim' : 'Não'}</td>
                <td>${escapeHtml(a.status || '')}</td>
                <td>
                    <button class="btn-secondary" data-action="editarAtividade" data-id="${a.id}">${(typeof svgIcon==='function')? svgIcon('edit', { title: 'Editar atividade', color: 'currentColor' }) : '✏️'}</button>
                    <button class="btn-secondary" data-action="removerAtividade" data-id="${a.id}">${(typeof svgIcon==='function')? svgIcon('trash', { title: 'Remover atividade', color: 'currentColor' }) : '🗑️'}</button>
                </td>
            </tr>`;
        }).join('');
        } catch (err) {
            console.error('AtividadesTabela: error while creating rows HTML', err);
            // attempt to fallback to a safe empty body
            tbody.innerHTML = '';
            return;
        }
        try {
            tbody.innerHTML = rows;
            console.debug('AtividadesTabela: tbody children after render =', tbody.childElementCount);
            if (tbody.childElementCount === 0) console.warn('AtividadesTabela: rendered 0 rows even though items length =', Array.isArray(items)? items.length : typeof items);
        } catch (err) {
            console.error('AtividadesTabela: error setting tbody.innerHTML', err);
        }
    }

    window.AtividadesTabela = {
        renderizarTabelaAtividades
    };
})();
