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

            // Badge TED/Ptrab
            const tedLower = tedPtrab.toLowerCase();
            const tedBadge = tedPtrab
                ? `<span class="${tedLower.includes('ted') ? 'badge-ted' : 'badge-ptrab'}">${escapeHtml(tedPtrab)}</span>`
                : '';

            // Badge Dias
            let diasDisplay = '';
            if (rawDias !== '' && rawDias !== null && rawDias !== undefined) {
                if (diasNum === 0) {
                    diasDisplay = `<span class="badge-dias-hoje">Hoje</span>`;
                } else if (diasNum < 0) {
                    diasDisplay = `<span class="badge-dias-neg">${diasNum}d</span>`;
                } else {
                    diasDisplay = `<span class="badge-dias-pos">+${diasNum}d</span>`;
                }
            }

            // Badge Status
            const statusVal = (a.status || '').toLowerCase().trim();
            let statusBadge;
            if (statusVal === 'pendente') {
                statusBadge = `<span class="badge-status-pendente">Pendente</span>`;
            } else if (statusVal === 'em andamento') {
                statusBadge = `<span class="badge-status-andamento">Em andamento</span>`;
            } else if (statusVal === 'concluida' || statusVal === 'concluída') {
                statusBadge = `<span class="badge-status-concluida">Concluída</span>`;
            } else if (statusVal === 'bloqueada') {
                statusBadge = `<span class="badge-status-bloqueada">Bloqueada</span>`;
            } else {
                statusBadge = `<span class="badge">${escapeHtml(a.status || '')}</span>`;
            }

            // Classe de linha
            let rowClass = '';
            if (statusVal === 'pendente') rowClass = 'row-pendente';
            else if (statusVal === 'bloqueada') rowClass = 'row-bloqueada';
            else if (statusVal === 'concluida' || statusVal === 'concluída') rowClass = 'row-concluida';

            return `<tr${rowClass ? ` class="${rowClass}"` : ''}>
                <td>${escapeHtml(ordem)}</td>
                <td>${tedBadge}</td>
                <td><strong>${escapeHtml(objeto)}</strong></td>
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
                <td>${statusBadge}</td>
                <td>
                    <button class="btn-icon-edit" title="Editar" data-action="editarAtividade" data-id="${a.id}">✏️</button>
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
