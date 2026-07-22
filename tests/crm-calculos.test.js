import { describe, it, expect } from 'vitest';
import CrmCalculos from '../crm-calculos.js';

describe('CrmCalculos.agruparPorEtapa', () => {
  const etapas = [
    { id: 'e1', ordem: 0 },
    { id: 'e2', ordem: 1 }
  ];

  it('devolve array vazio para etapa sem negócios', () => {
    const out = CrmCalculos.agruparPorEtapa([], etapas);
    expect(out.e1).toEqual([]);
    expect(out.e2).toEqual([]);
  });

  it('ignora negócio com etapaId órfão (sem etapa correspondente)', () => {
    const negocios = [
      { id: 'n1', etapaId: 'e1', ordem: 0 },
      { id: 'n2', etapaId: 'inexistente', ordem: 0 }
    ];
    const out = CrmCalculos.agruparPorEtapa(negocios, etapas);
    expect(out.e1.map(n => n.id)).toEqual(['n1']);
    expect(out.e2).toEqual([]);
    expect(Object.keys(out)).toEqual(['e1', 'e2']);
  });

  it('ordena os negócios dentro da etapa pelo campo ordem', () => {
    const negocios = [
      { id: 'n1', etapaId: 'e1', ordem: 2 },
      { id: 'n2', etapaId: 'e1', ordem: 0 },
      { id: 'n3', etapaId: 'e1', ordem: 1 }
    ];
    const out = CrmCalculos.agruparPorEtapa(negocios, etapas);
    expect(out.e1.map(n => n.id)).toEqual(['n2', 'n3', 'n1']);
  });
});

describe('CrmCalculos.somarValor', () => {
  it('soma valores válidos e ignora null/undefined/NaN', () => {
    // Decisão: valores numéricos em string são coagidos (Number()); null/undefined/NaN
    // não contam. [null, '1500', 200, undefined, NaN] => 0 + 1500 + 200 + 0 + 0 = 1700
    const negocios = [
      { valor: null },
      { valor: '1500' },
      { valor: 200 },
      { valor: undefined },
      { valor: NaN }
    ];
    expect(CrmCalculos.somarValor(negocios)).toBe(1700);
  });

  it('devolve 0 para lista vazia', () => {
    expect(CrmCalculos.somarValor([])).toBe(0);
    expect(CrmCalculos.somarValor(undefined)).toBe(0);
  });
});

describe('CrmCalculos.resumoFunil', () => {
  it('calcula contagens, valores e ticket médio só sobre ganhos', () => {
    const negocios = [
      { status: 'aberto', valor: 100 },
      { status: 'aberto', valor: 50 },
      { status: 'ganho', valor: 300 },
      { status: 'ganho', valor: 100 },
      { status: 'perdido', valor: 999 }
    ];
    const resumo = CrmCalculos.resumoFunil(negocios);
    expect(resumo.total).toBe(5);
    expect(resumo.abertos).toBe(2);
    expect(resumo.ganhos).toBe(2);
    expect(resumo.perdidos).toBe(1);
    expect(resumo.valorAberto).toBe(150);
    expect(resumo.valorGanho).toBe(400);
    expect(resumo.ticketMedio).toBe(200);
  });

  it('ticket médio é 0 (não NaN) quando não há negócios ganhos', () => {
    const resumo = CrmCalculos.resumoFunil([{ status: 'aberto', valor: 100 }]);
    expect(resumo.ticketMedio).toBe(0);
  });
});

describe('CrmCalculos.filtrarNegocios', () => {
  it('encontra "Manutenção" buscando "manutencao" (sem acento, minúsculo)', () => {
    const negocios = [
      { id: 'n1', titulo: 'Contrato de Manutenção 2027' },
      { id: 'n2', titulo: 'Outra coisa qualquer' }
    ];
    const out = CrmCalculos.filtrarNegocios(negocios, { busca: 'manutencao' });
    expect(out.map(n => n.id)).toEqual(['n1']);
  });

  it('aplica filtros de responsável, status e funil combinados', () => {
    const negocios = [
      { id: 'n1', funilId: 'f1', responsavel: 'Ana', status: 'aberto', titulo: 'A' },
      { id: 'n2', funilId: 'f1', responsavel: 'Beto', status: 'aberto', titulo: 'B' },
      { id: 'n3', funilId: 'f2', responsavel: 'Ana', status: 'ganho', titulo: 'C' }
    ];
    expect(CrmCalculos.filtrarNegocios(negocios, { funilId: 'f1' }).map(n => n.id)).toEqual(['n1', 'n2']);
    expect(CrmCalculos.filtrarNegocios(negocios, { responsavel: 'Ana' }).map(n => n.id)).toEqual(['n1', 'n3']);
    expect(CrmCalculos.filtrarNegocios(negocios, { status: 'ganho' }).map(n => n.id)).toEqual(['n3']);
  });
});

describe('CrmCalculos.reordenarNaEtapa', () => {
  it('produz ordens densas 0..n-1 ao mover dentro da mesma etapa', () => {
    const negocios = [
      { id: 'a', etapaId: 'e1', ordem: 0 },
      { id: 'b', etapaId: 'e1', ordem: 1 },
      { id: 'c', etapaId: 'e1', ordem: 2 }
    ];
    const resultado = CrmCalculos.reordenarNaEtapa(negocios, 'e1', 'a', 2);
    const porId = Object.fromEntries(resultado.map(r => [r.id, r.ordem]));
    expect(porId.b).toBe(0);
    expect(porId.c).toBe(1);
    expect(porId.a).toBe(2);
  });

  it('funciona movendo para uma etapa vazia no índice 0', () => {
    const negocios = [{ id: 'a', etapaId: 'e1', ordem: 0 }];
    const resultado = CrmCalculos.reordenarNaEtapa(negocios, 'e2', 'a', 0);
    expect(resultado).toEqual([{ id: 'a', ordem: 0 }]);
  });

  it('não muta o array de entrada', () => {
    const negocios = [
      { id: 'a', etapaId: 'e1', ordem: 0 },
      { id: 'b', etapaId: 'e1', ordem: 1 }
    ];
    const copia = JSON.parse(JSON.stringify(negocios));
    CrmCalculos.reordenarNaEtapa(negocios, 'e1', 'b', 0);
    expect(negocios).toEqual(copia);
  });
});

describe('CrmCalculos.taxaConversao', () => {
  it('devolve 0 (não NaN) quando não há negócios fechados', () => {
    expect(CrmCalculos.taxaConversao([{ status: 'aberto' }])).toBe(0);
    expect(CrmCalculos.taxaConversao([])).toBe(0);
  });

  it('calcula ganhos / (ganhos + perdidos)', () => {
    const negocios = [
      { status: 'ganho' }, { status: 'ganho' }, { status: 'ganho' },
      { status: 'perdido' },
      { status: 'aberto' }
    ];
    expect(CrmCalculos.taxaConversao(negocios)).toBe(0.75);
  });
});

describe('CrmCalculos.formatarMoeda', () => {
  it('formata em pt-BR com vírgula decimal e separador de milhar', () => {
    expect(CrmCalculos.formatarMoeda(1234.5)).toContain('1.234,50');
  });

  it('trata valor inválido como zero', () => {
    expect(CrmCalculos.formatarMoeda(undefined)).toContain('0,00');
  });
});

describe('CrmCalculos — atividades e métricas derivadas', () => {
  const atividades = [
    { id: 'a1', negocioId: 'n1', data: '2026-07-30', horaInicio: '10:00', feito: false },
    { id: 'a2', negocioId: 'n1', data: '2026-07-25', horaInicio: '14:00', feito: false },
    { id: 'a3', negocioId: 'n1', data: '2026-07-20', feito: true, feitoEm: '2026-07-20T15:00:00.000Z' },
    { id: 'a4', negocioId: 'n2', data: '2026-08-01', feito: false }
  ];

  it('proximaAtividade devolve a pendente de menor data (mesmo atrasada)', () => {
    expect(CrmCalculos.proximaAtividade(atividades, 'n1').id).toBe('a2');
  });

  it('temAtividadePendente é false quando só há atividades feitas', () => {
    const soFeitas = [{ negocioId: 'n9', data: '2026-07-01', feito: true }];
    expect(CrmCalculos.temAtividadePendente(soFeitas, 'n9')).toBe(false);
    expect(CrmCalculos.temAtividadePendente(atividades, 'n1')).toBe(true);
  });

  it('diasNaEtapa conta desde a última mudança de etapa, com fallback na criação', () => {
    const negocio = { id: 'n1', criadoEm: '2026-07-01T12:00:00.000Z' };
    const historico = [
      { entidade: 'negocio', entidadeId: 'n1', tipo: 'etapa', criadoEm: '2026-07-10T09:00:00.000Z' },
      { entidade: 'negocio', entidadeId: 'n1', tipo: 'etapa', criadoEm: '2026-07-05T09:00:00.000Z' },
      { entidade: 'negocio', entidadeId: 'n1', tipo: 'nota', criadoEm: '2026-07-18T09:00:00.000Z' }
    ];
    expect(CrmCalculos.diasNaEtapa(historico, negocio, '2026-07-22')).toBe(12);
    expect(CrmCalculos.diasNaEtapa([], negocio, '2026-07-22')).toBe(21);
  });

  it('idadeEmDias e diasInativo', () => {
    const negocio = { id: 'n1', criadoEm: '2026-07-01T00:00:00.000Z', atualizadoEm: '2026-07-15T00:00:00.000Z' };
    expect(CrmCalculos.idadeEmDias(negocio, '2026-07-22')).toBe(21);
    // última atividade feita (20/07) é mais recente que atualizadoEm (15/07)
    expect(CrmCalculos.diasInativo(negocio, atividades, '2026-07-22')).toBe(2);
    expect(CrmCalculos.diasInativo(negocio, [], '2026-07-22')).toBe(7);
  });

  it('agruparPorMesFechamento ordena meses e põe "sem data" por último', () => {
    const negocios = [
      { id: 'n1', dataPrevisao: '2026-08-15' },
      { id: 'n2', dataPrevisao: '2026-07-30' },
      { id: 'n3', dataPrevisao: null },
      { id: 'n4', dataPrevisao: '2026-08-01' }
    ];
    const grupos = CrmCalculos.agruparPorMesFechamento(negocios);
    expect(grupos.map(g => g.mes)).toEqual(['2026-07', '2026-08', null]);
    expect(grupos[1].negocios.map(n => n.id)).toEqual(['n1', 'n4']);
    expect(grupos[2].negocios.map(n => n.id)).toEqual(['n3']);
  });
});

describe('CrmCalculos.timelineDe', () => {
  it('filtra pela entidade e ordena do mais recente para o mais antigo', () => {
    const historico = [
      { entidade: 'negocio', entidadeId: 'n1', criadoEm: '2026-01-01T00:00:00.000Z' },
      { entidade: 'negocio', entidadeId: 'n1', criadoEm: '2026-01-03T00:00:00.000Z' },
      { entidade: 'negocio', entidadeId: 'n2', criadoEm: '2026-01-02T00:00:00.000Z' }
    ];
    const out = CrmCalculos.timelineDe(historico, 'negocio', 'n1');
    expect(out.map(h => h.criadoEm)).toEqual(['2026-01-03T00:00:00.000Z', '2026-01-01T00:00:00.000Z']);
  });
});
