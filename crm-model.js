/**
 * crm-model.js - Forma dos dados do módulo de Relacionamento (CRM)
 * Funções puras: factories, normalização/migração e validação.
 * Sem DOM, sem AppState — testável isoladamente com Vitest.
 */

const CAMPOS_AUDITAVEIS_NEGOCIO = ['titulo', 'valor', 'etapaId', 'responsavel', 'dataPrevisao', 'status', 'origem', 'dataRecebimento'];

const TIPOS_FUNIL = ['vendas', 'demandas', 'projetos'];
const TIPOS_ETAPA = ['aberta', 'ganho', 'perdido'];
const STATUS_NEGOCIO = ['aberto', 'ganho', 'perdido'];

const TEMPLATES_FUNIL = {
    vendas: {
        nome: 'Comercial',
        mostrarValor: true,
        etapas: ['Qualificação', 'Contato feito', 'Proposta', 'Negociação', 'Ganho', 'Perdido']
    },
    demandas: {
        nome: 'Demandas',
        mostrarValor: false,
        etapas: ['Recebida', 'Em análise', 'Em execução', 'Aguardando terceiros', 'Concluída', 'Cancelada']
    },
    projetos: {
        nome: 'Projetos',
        mostrarValor: true,
        etapas: ['Prospecção', 'Planejamento', 'Execução', 'Homologação', 'Entregue', 'Cancelado']
    }
};

function nowIso() {
    return new Date().toISOString();
}

function novoId(prefixo) {
    return prefixo + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

function ehObjeto(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

// ──────────────────────────────────────────────
//  NORMALIZAÇÃO — uma função por entidade, todas puras e idempotentes
// ──────────────────────────────────────────────

function normalizarEtapa(eBruta, idx) {
    const e = ehObjeto(eBruta) ? eBruta : {};
    const tipo = TIPOS_ETAPA.indexOf(e.tipo) !== -1 ? e.tipo : 'aberta';
    const probabilidadeDefault = tipo === 'ganho' ? 100 : (tipo === 'perdido' ? 0 : 20);
    return {
        id: e.id || novoId('etp'),
        nome: (typeof e.nome === 'string' && e.nome.trim()) ? e.nome : ('Etapa ' + (idx + 1)),
        ordem: Number.isFinite(e.ordem) ? e.ordem : idx,
        cor: (typeof e.cor === 'string' && e.cor) ? e.cor : '#64748b',
        tipo,
        probabilidade: Number.isFinite(e.probabilidade) ? e.probabilidade : probabilidadeDefault
    };
}

function normalizarFunil(fBruto) {
    const f = ehObjeto(fBruto) ? fBruto : {};
    const etapasBrutas = Array.isArray(f.etapas) ? f.etapas : [];
    const etapas = etapasBrutas
        .map(normalizarEtapa)
        .sort((a, b) => a.ordem - b.ordem);

    return {
        id: f.id || novoId('fnl'),
        nome: (typeof f.nome === 'string' && f.nome.trim()) ? f.nome : 'Funil sem nome',
        tipo: TIPOS_FUNIL.indexOf(f.tipo) !== -1 ? f.tipo : 'vendas',
        mostrarValor: f.mostrarValor !== false,
        moeda: (typeof f.moeda === 'string' && f.moeda) ? f.moeda : 'BRL',
        ordem: Number.isFinite(f.ordem) ? f.ordem : 0,
        arquivado: !!f.arquivado,
        etapas,
        criadoEm: f.criadoEm || nowIso(),
        atualizadoEm: f.atualizadoEm || nowIso()
    };
}

function normalizarNegocio(nBruto) {
    const n = ehObjeto(nBruto) ? nBruto : {};
    const temValor = n.valor !== null && n.valor !== undefined && n.valor !== '';
    const valorNumerico = temValor ? Number(n.valor) : null;
    return {
        id: n.id || novoId('ngc'),
        funilId: n.funilId || null,
        etapaId: n.etapaId || null,
        titulo: typeof n.titulo === 'string' ? n.titulo : '',
        valor: (valorNumerico !== null && !isNaN(valorNumerico)) ? valorNumerico : null,
        moeda: (typeof n.moeda === 'string' && n.moeda) ? n.moeda : 'BRL',
        organizacaoId: n.organizacaoId || null,
        pessoaId: n.pessoaId || null,
        responsavel: typeof n.responsavel === 'string' ? n.responsavel : '',
        status: STATUS_NEGOCIO.indexOf(n.status) !== -1 ? n.status : 'aberto',
        motivoPerda: typeof n.motivoPerda === 'string' ? n.motivoPerda : '',
        origem: typeof n.origem === 'string' ? n.origem : '',
        dataRecebimento: n.dataRecebimento || null,
        dataPrevisao: n.dataPrevisao || null,
        dataFechamento: n.dataFechamento || null,
        ordem: Number.isFinite(n.ordem) ? n.ordem : 0,
        tags: Array.isArray(n.tags) ? n.tags.slice() : [],
        descricao: typeof n.descricao === 'string' ? n.descricao : '',
        criadoEm: n.criadoEm || nowIso(),
        atualizadoEm: n.atualizadoEm || nowIso()
    };
}

function normalizarPessoa(pBruta) {
    const p = ehObjeto(pBruta) ? pBruta : {};
    return {
        id: p.id || novoId('pss'),
        nome: typeof p.nome === 'string' ? p.nome : '',
        email: typeof p.email === 'string' ? p.email : '',
        telefone: typeof p.telefone === 'string' ? p.telefone : '',
        cargo: typeof p.cargo === 'string' ? p.cargo : '',
        organizacaoId: p.organizacaoId || null,
        observacoes: typeof p.observacoes === 'string' ? p.observacoes : '',
        tags: Array.isArray(p.tags) ? p.tags.slice() : [],
        criadoEm: p.criadoEm || nowIso(),
        atualizadoEm: p.atualizadoEm || nowIso()
    };
}

function normalizarOrganizacao(oBruta) {
    const o = ehObjeto(oBruta) ? oBruta : {};
    return {
        id: o.id || novoId('org'),
        nome: typeof o.nome === 'string' ? o.nome : '',
        cnpj: typeof o.cnpj === 'string' ? o.cnpj : '',
        site: typeof o.site === 'string' ? o.site : '',
        telefone: typeof o.telefone === 'string' ? o.telefone : '',
        endereco: typeof o.endereco === 'string' ? o.endereco : '',
        observacoes: typeof o.observacoes === 'string' ? o.observacoes : '',
        tags: Array.isArray(o.tags) ? o.tags.slice() : [],
        criadoEm: o.criadoEm || nowIso(),
        atualizadoEm: o.atualizadoEm || nowIso()
    };
}

function normalizarHistoricoItem(hBruto) {
    const h = ehObjeto(hBruto) ? hBruto : {};
    const tipo = typeof h.tipo === 'string' && h.tipo ? h.tipo : 'campo';
    return {
        id: h.id || novoId('hst'),
        entidade: typeof h.entidade === 'string' ? h.entidade : 'negocio',
        entidadeId: h.entidadeId || null,
        tipo,
        texto: typeof h.texto === 'string' ? h.texto : '',
        dados: ehObjeto(h.dados) ? h.dados : null,
        autor: typeof h.autor === 'string' ? h.autor : '',
        editavel: typeof h.editavel === 'boolean' ? h.editavel : (tipo === 'nota'),
        criadoEm: h.criadoEm || nowIso()
    };
}

function normalizarConfig(cBruta, funis) {
    const c = ehObjeto(cBruta) ? cBruta : {};
    const idsValidos = funis.map(f => f.id);
    const funilAtivoId = idsValidos.indexOf(c.funilAtivoId) !== -1 ? c.funilAtivoId : (funis[0] ? funis[0].id : null);
    const filtrosBrutos = ehObjeto(c.filtros) ? c.filtros : {};
    return {
        funilAtivoId,
        visao: c.visao === 'lista' ? 'lista' : 'kanban',
        subaba: ['negocios', 'pessoas', 'organizacoes'].indexOf(c.subaba) !== -1 ? c.subaba : 'negocios',
        detalheAbertoId: c.detalheAbertoId || null,
        filtros: {
            busca: typeof filtrosBrutos.busca === 'string' ? filtrosBrutos.busca : '',
            responsavel: typeof filtrosBrutos.responsavel === 'string' ? filtrosBrutos.responsavel : '',
            status: typeof filtrosBrutos.status === 'string' ? filtrosBrutos.status : ''
        }
    };
}

/**
 * Normaliza o objeto crm inteiro: garante todos os arrays, preenche defaults,
 * gera IDs faltantes e realoca negócios órfãos (funil/etapa inexistente)
 * para a primeira etapa aberta do primeiro funil. Pura e idempotente.
 */
function normalizarCrm(crmBruto) {
    const crm = ehObjeto(crmBruto) ? crmBruto : {};

    const funis = (Array.isArray(crm.funis) ? crm.funis : []).map(normalizarFunil);

    const idsFunilValidos = funis.map(f => f.id);
    const primeiraEtapaAbertaPorFunil = {};
    funis.forEach(f => {
        const aberta = f.etapas.filter(e => e.tipo === 'aberta')[0] || f.etapas[0] || null;
        primeiraEtapaAbertaPorFunil[f.id] = aberta ? aberta.id : null;
    });

    const negocios = (Array.isArray(crm.negocios) ? crm.negocios : [])
        .map(normalizarNegocio)
        .filter(n => idsFunilValidos.length > 0) // sem nenhum funil não há onde alocar o negócio
        .map(n => {
            let funilId = n.funilId;
            if (idsFunilValidos.indexOf(funilId) === -1) {
                funilId = idsFunilValidos[0];
            }
            const funil = funis[idsFunilValidos.indexOf(funilId)];
            const idsEtapaDoFunil = funil ? funil.etapas.map(e => e.id) : [];
            let etapaId = n.etapaId;
            if (!etapaId || idsEtapaDoFunil.indexOf(etapaId) === -1) {
                etapaId = primeiraEtapaAbertaPorFunil[funilId] || null;
            }
            return Object.assign({}, n, { funilId, etapaId });
        });

    const pessoas = (Array.isArray(crm.pessoas) ? crm.pessoas : []).map(normalizarPessoa);
    const organizacoes = (Array.isArray(crm.organizacoes) ? crm.organizacoes : []).map(normalizarOrganizacao);
    const historico = (Array.isArray(crm.historico) ? crm.historico : []).map(normalizarHistoricoItem);
    const config = normalizarConfig(crm.config, funis);

    return {
        versao: 1,
        funis,
        negocios,
        pessoas,
        organizacoes,
        historico,
        config
    };
}

// ──────────────────────────────────────────────
//  FACTORIES — sempre produzem uma entidade nova (id gerado se ausente)
// ──────────────────────────────────────────────

function criarFunil(dados) { return normalizarFunil(dados); }
function criarNegocio(dados) { return normalizarNegocio(dados); }
function criarPessoa(dados) { return normalizarPessoa(dados); }
function criarOrganizacao(dados) { return normalizarOrganizacao(dados); }

/**
 * Monta um funil completo a partir de um template nomeado (ver TEMPLATES_FUNIL).
 * As duas últimas etapas do template recebem tipo 'ganho' e 'perdido';
 * as demais, 'aberta'.
 */
function funilDeTemplate(chave) {
    const tpl = TEMPLATES_FUNIL[chave];
    if (!tpl) return null;
    const n = tpl.etapas.length;
    const etapas = tpl.etapas.map((nome, idx) => {
        let tipo = 'aberta';
        if (idx === n - 2) tipo = 'ganho';
        if (idx === n - 1) tipo = 'perdido';
        return normalizarEtapa({ nome, ordem: idx, tipo }, idx);
    });
    return normalizarFunil({ nome: tpl.nome, tipo: chave, mostrarValor: tpl.mostrarValor, etapas });
}

// ──────────────────────────────────────────────
//  VALIDAÇÃO — mesmo contrato de Validators: devolve array de mensagens
// ──────────────────────────────────────────────

function validarNegocio(negocio, funil) {
    const erros = [];
    if (!ehObjeto(negocio)) {
        erros.push('Negócio deve ser um objeto válido');
        return erros;
    }
    if (!negocio.titulo || !String(negocio.titulo).trim()) {
        erros.push('Título é obrigatório');
    }
    const temValor = negocio.valor !== null && negocio.valor !== undefined && negocio.valor !== '';
    if (funil && funil.mostrarValor === false) {
        if (temValor) erros.push('Este funil não utiliza valor monetário');
    } else if (temValor) {
        const v = Number(negocio.valor);
        if (isNaN(v) || v < 0) erros.push('Valor deve ser um número não-negativo');
    }
    if (negocio.dataPrevisao && !/^\d{4}-\d{2}-\d{2}$/.test(negocio.dataPrevisao)) {
        erros.push('Data de previsão inválida (use formato YYYY-MM-DD)');
    }
    if (negocio.dataRecebimento && !/^\d{4}-\d{2}-\d{2}$/.test(negocio.dataRecebimento)) {
        erros.push('Data de recebimento inválida (use formato YYYY-MM-DD)');
    }
    return erros;
}

function validarPessoa(pessoa) {
    const erros = [];
    if (!ehObjeto(pessoa)) {
        erros.push('Contato deve ser um objeto válido');
        return erros;
    }
    if (!pessoa.nome || !String(pessoa.nome).trim()) {
        erros.push('Nome é obrigatório');
    }
    if (pessoa.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pessoa.email)) {
        erros.push('E-mail inválido');
    }
    return erros;
}

function validarOrganizacao(organizacao) {
    const erros = [];
    if (!ehObjeto(organizacao)) {
        erros.push('Organização deve ser um objeto válido');
        return erros;
    }
    if (!organizacao.nome || !String(organizacao.nome).trim()) {
        erros.push('Nome é obrigatório');
    }
    return erros;
}

const CrmModel = {
    CAMPOS_AUDITAVEIS_NEGOCIO,
    TIPOS_FUNIL,
    TIPOS_ETAPA,
    STATUS_NEGOCIO,
    TEMPLATES_FUNIL,

    novoId,

    normalizarCrm,
    normalizarFunil,
    normalizarEtapa,
    normalizarNegocio,
    normalizarPessoa,
    normalizarOrganizacao,
    normalizarHistoricoItem,
    normalizarConfig,

    criarFunil,
    criarNegocio,
    criarPessoa,
    criarOrganizacao,
    funilDeTemplate,

    validarNegocio,
    validarPessoa,
    validarOrganizacao
};

if (typeof window !== 'undefined') {
    window.CrmModel = CrmModel;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrmModel;
}
