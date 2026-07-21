/**
 * crm-calculos.js - Cálculos e transformações puras do módulo de Relacionamento (CRM)
 * Sem DOM, sem AppState — testável isoladamente com Vitest.
 */

// Faixa Unicode "Combining Diacritical Marks" (U+0300–U+036F), escrita via
// código de caractere para não depender de caracteres literais no arquivo-fonte.
const INICIO_DIACRITICOS = 0x0300;
const FIM_DIACRITICOS = 0x036f;

function normalizarParaBusca(str) {
    const decomposto = String(str || '').toLowerCase().normalize('NFD');
    let out = '';
    for (let i = 0; i < decomposto.length; i++) {
        const code = decomposto.charCodeAt(i);
        if (code < INICIO_DIACRITICOS || code > FIM_DIACRITICOS) {
            out += decomposto[i];
        }
    }
    return out;
}

/**
 * Agrupa negócios por etapa, na ordem das próprias etapas.
 * Etapas sem negócios recebem array vazio; negócios com etapaId
 * sem correspondência nas etapas fornecidas são ignorados (órfãos).
 */
function agruparPorEtapa(negocios, etapas) {
    const out = {};
    (etapas || []).forEach(e => { out[e.id] = []; });
    (negocios || []).forEach(n => {
        if (n && n.etapaId && Object.prototype.hasOwnProperty.call(out, n.etapaId)) {
            out[n.etapaId].push(n);
        }
    });
    Object.keys(out).forEach(etapaId => {
        out[etapaId] = out[etapaId].slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    });
    return out;
}

/**
 * Soma o campo `valor` de uma lista de negócios.
 * Aceita string numérica; ignora null/undefined/NaN sem lançar.
 */
function somarValor(negocios) {
    return (negocios || []).reduce((acc, n) => {
        const bruto = n && n.valor;
        if (bruto === null || bruto === undefined || bruto === '') return acc;
        const num = Number(bruto);
        return acc + (isNaN(num) ? 0 : num);
    }, 0);
}

/**
 * Resumo agregado de um funil: contagens por status, valor em aberto/ganho
 * e ticket médio (calculado só sobre negócios ganhos).
 */
function resumoFunil(negocios) {
    const lista = negocios || [];
    const abertos = lista.filter(n => n.status === 'aberto');
    const ganhos = lista.filter(n => n.status === 'ganho');
    const perdidos = lista.filter(n => n.status === 'perdido');
    const valorAberto = somarValor(abertos);
    const valorGanho = somarValor(ganhos);
    return {
        total: lista.length,
        abertos: abertos.length,
        ganhos: ganhos.length,
        perdidos: perdidos.length,
        valorAberto,
        valorGanho,
        ticketMedio: ganhos.length ? valorGanho / ganhos.length : 0
    };
}

/**
 * Filtra negócios por busca textual (sem acento, case-insensitive, no título),
 * responsável, status e funil. Qualquer filtro ausente/vazio é ignorado.
 */
function filtrarNegocios(negocios, filtros) {
    const f = filtros || {};
    const busca = normalizarParaBusca(f.busca);
    return (negocios || []).filter(n => {
        if (f.funilId && n.funilId !== f.funilId) return false;
        if (f.responsavel && n.responsavel !== f.responsavel) return false;
        if (f.status && n.status !== f.status) return false;
        if (busca && normalizarParaBusca(n.titulo).indexOf(busca) === -1) return false;
        return true;
    });
}

/**
 * Ordena negócios sem mutar a entrada. Critérios: 'valor' (desc), 'previsao' (asc,
 * sem previsão por último), 'atualizado' (mais recente primeiro), ou por 'ordem' (default).
 */
function ordenarNegocios(negocios, criterio) {
    const lista = (negocios || []).slice();
    if (criterio === 'valor') {
        return lista.sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0));
    }
    if (criterio === 'previsao') {
        return lista.sort((a, b) => String(a.dataPrevisao || '9999-99-99').localeCompare(String(b.dataPrevisao || '9999-99-99')));
    }
    if (criterio === 'atualizado') {
        return lista.sort((a, b) => String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || '')));
    }
    return lista.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
}

/**
 * Calcula a nova ordenação de uma etapa após mover um negócio para dentro dela
 * (de outra etapa ou reordenando na mesma). Pura: não muta `negocios`.
 * Devolve pares {id, ordem} já densos (0..n-1) para a etapa de destino.
 */
function reordenarNaEtapa(negocios, etapaId, idMovido, indice) {
    const daEtapaSemMovido = (negocios || [])
        .filter(n => n.etapaId === etapaId && n.id !== idMovido)
        .slice()
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    const movido = (negocios || []).find(n => n.id === idMovido) || { id: idMovido };
    const listaFinal = daEtapaSemMovido.slice();
    const pos = Math.max(0, Math.min(indice == null ? listaFinal.length : indice, listaFinal.length));
    listaFinal.splice(pos, 0, movido);

    return listaFinal.map((n, idx) => ({ id: n.id, ordem: idx }));
}

/**
 * Taxa de conversão (ganhos / (ganhos + perdidos)). 0 quando não há fechados,
 * nunca NaN.
 */
function taxaConversao(negocios) {
    const lista = negocios || [];
    const ganhos = lista.filter(n => n.status === 'ganho').length;
    const perdidos = lista.filter(n => n.status === 'perdido').length;
    const total = ganhos + perdidos;
    return total ? ganhos / total : 0;
}

/**
 * Formata um valor monetário em pt-BR. Cai num fallback manual se a moeda
 * informada não for reconhecida pelo Intl.
 */
function formatarMoeda(valor, moeda) {
    const num = Number(valor) || 0;
    try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda || 'BRL' }).format(num);
    } catch (_) {
        return 'R$ ' + num.toFixed(2).replace('.', ',');
    }
}

function negociosDaOrganizacao(negocios, organizacaoId) {
    return (negocios || []).filter(n => n.organizacaoId === organizacaoId);
}

function negociosDaPessoa(negocios, pessoaId) {
    return (negocios || []).filter(n => n.pessoaId === pessoaId);
}

/**
 * Itens de histórico de uma entidade específica, mais recentes primeiro.
 */
function timelineDe(historico, entidade, entidadeId) {
    return (historico || [])
        .filter(h => h.entidade === entidade && h.entidadeId === entidadeId)
        .slice()
        .sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
}

const CrmCalculos = {
    agruparPorEtapa,
    somarValor,
    resumoFunil,
    filtrarNegocios,
    ordenarNegocios,
    reordenarNaEtapa,
    taxaConversao,
    formatarMoeda,
    negociosDaOrganizacao,
    negociosDaPessoa,
    timelineDe
};

if (typeof window !== 'undefined') {
    window.CrmCalculos = CrmCalculos;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrmCalculos;
}
