import { describe, it, expect } from 'vitest';
import Calculations from '../calculations.js';

describe('Calculations.normalizeDateForComparison', () => {
  it('mantém YYYY-MM-DD', () => {
    expect(Calculations.normalizeDateForComparison('2026-07-10')).toBe('2026-07-10');
  });

  it('converte DD/MM/YYYY para YYYY-MM-DD', () => {
    expect(Calculations.normalizeDateForComparison('10/07/2026')).toBe('2026-07-10');
  });

  it('retorna null para formato desconhecido ou vazio', () => {
    expect(Calculations.normalizeDateForComparison('10-07-2026')).toBeNull();
    expect(Calculations.normalizeDateForComparison('')).toBeNull();
  });
});

describe('Calculations.getEventoByData / getAcordoByData', () => {
  const eventos = [
    { dataInicioEvento: '2026-07-01', dataFimEvento: '2026-07-05', tipoEvento: 'ferias' }
  ];
  const acordos = [
    { nome: 'Acordo A', periodos: [{ inicio: '2026-01-01', fim: '2026-06-30', minutosExtras: 30 }] },
    { nome: 'Acordo B', periodos: [{ inicio: '2026-07-01', fim: '2026-12-31', minutosExtras: 60 }] }
  ];

  it('encontra evento vigente na data', () => {
    expect(Calculations.getEventoByData(eventos, '2026-07-03').tipoEvento).toBe('ferias');
  });

  it('retorna null quando não há evento vigente', () => {
    expect(Calculations.getEventoByData(eventos, '2026-08-01')).toBeNull();
  });

  it('encontra o acordo cujo período cobre a data', () => {
    expect(Calculations.getAcordoByData(acordos, '2026-08-01').nome).toBe('Acordo B');
    expect(Calculations.getAcordoByData(acordos, '2026-03-01').nome).toBe('Acordo A');
  });

  it('getMinutosExtrasForDay usa o período vigente do acordo', () => {
    expect(Calculations.getMinutosExtrasForDay(acordos[1], '2026-08-01')).toBe(60);
    expect(Calculations.getMinutosExtrasForDay(acordos[1], '2027-01-01')).toBe(0);
  });
});

describe('Calculations.calculateDayDetail', () => {
  const regraDefault = Calculations.getDefaultRegra(); // almoco 60, tol 0/0, extras 0

  it('sem entrada/saída retorna sem_registro e zero saldo', () => {
    const r = Calculations.calculateDayDetail(null, 0, regraDefault);
    expect(r).toMatchObject({ trabalhadas: 0, saldo: 0, status: 'sem_registro' });
  });

  it('jornada exata de 8h (com 1h de almoço padrão) fecha saldo zero', () => {
    const r = Calculations.calculateDayDetail(
      { entrada: '08:00', saida: '17:00' }, 0, regraDefault
    );
    expect(r.trabalhadas).toBe(480); // 8h
    expect(r.saldo).toBe(0);
    expect(r.status).toBe('ok');
  });

  it('jornada de 10h gera 1h de hora extra', () => {
    const r = Calculations.calculateDayDetail(
      { entrada: '08:00', saida: '18:00' }, 0, regraDefault
    );
    expect(r.trabalhadas).toBe(540); // 9h líquidas (10h - 1h almoço)
    expect(r.saldo).toBe(60);
    expect(r.status).toBe('extra');
  });

  it('jornada curta gera falta (saldo negativo)', () => {
    const r = Calculations.calculateDayDetail(
      { entrada: '08:00', saida: '15:00' }, 0, regraDefault
    );
    expect(r.saldo).toBe(-120);
    expect(r.status).toBe('falta');
  });

  it('respeita minutosExtras da regra de horário ao calcular a carga esperada', () => {
    // regra com 30min extras/dia contratuais → carga = 480 + 30 = 510
    const regra = { almocoMin: 60, tolAlmoco: 0, tolSaida: 0, minutosExtras: 30 };
    const r = Calculations.calculateDayDetail(
      { entrada: '08:00', saida: '17:30' }, 0, regra
    ); // 570 brutos - 60 almoço = 510 trabalhadas
    expect(r.trabalhadas).toBe(510);
    expect(r.saldo).toBe(0);
    expect(r.status).toBe('ok');
  });

  it('aplica tolerância de saída para zerar pequenas diferenças', () => {
    const regra = { almocoMin: 60, tolAlmoco: 0, tolSaida: 10, minutosExtras: 0 };
    const r = Calculations.calculateDayDetail(
      { entrada: '08:00', saida: '17:03' }, 0, regra
    ); // saldo bruto = 3min, dentro da tolerância de 10
    expect(r.saldo).toBe(0);
    expect(r.status).toBe('ok');
  });

  it('aplica tolerância de almoço: pequena variação não altera a duração computada', () => {
    // tolSaida menor que o saldo esperado (3min), só para isolar o efeito da tolerância de almoço
    const regra = { almocoMin: 60, tolAlmoco: 5, tolSaida: 1, minutosExtras: 0 };
    const r = Calculations.calculateDayDetail(
      { entrada: '08:00', saida: '17:03', saidaAlmoco: '12:00', retornoAlmoco: '13:03' },
      0, regra
    ); // almoço real = 63min, diff=3 <= tolAlmoco(5) → duração tratada como 60min
    expect(r.trabalhadas).toBe(483); // (17:03-08:00)=543 - 60
    expect(r.saldo).toBe(3);
  });

  it('respeita tolSaida/tolAlmoco/almocoMin = 0 explícito (tolerância zero de verdade)', () => {
    // Antes usava `regra.tolSaida || 5`, que tratava 0 como "não informado".
    // Agora a checagem é por null/undefined, então 0 configurado é respeitado.
    const regra = { almocoMin: 60, tolAlmoco: 0, tolSaida: 0, minutosExtras: 0 };
    const r = Calculations.calculateDayDetail(
      { entrada: '08:00', saida: '17:03' }, 0, regra
    ); // saldo bruto = 3min; com tolSaida=0 de verdade, não zera
    expect(r.saldo).toBe(3);
    expect(r.status).toBe('extra');
  });
});

describe('Calculations.calculateDayWithContext — atestados e abonos', () => {
  const eventos = [];
  const acordos = [];

  it('comparecimento_vespertino: saldo sempre zero, carga cheia', () => {
    const r = Calculations.calculateDayWithContext(
      [], eventos, acordos, '2026-07-10',
      { data: '2026-07-10', tipoAtestado: 'comparecimento_vespertino', entrada: '13:00', saida: '17:00' }
    );
    expect(r.trabalhadas).toBe(480);
    expect(r.saldo).toBe(0);
    expect(r.status).toBe('ok');
  });

  it('comparecimento_matutino: usa entrada efetiva 07:45 por padrão, ignorando a real', () => {
    const r = Calculations.calculateDayWithContext(
      [], eventos, acordos, '2026-07-10',
      { data: '2026-07-10', tipoAtestado: 'comparecimento_matutino', entrada: '10:00', saida: '17:00' }
    );
    // 07:45 -> 17:00 = 555min, -60 almoço = 495 trabalhadas, carga 480 => saldo 15 extra
    expect(r.trabalhadas).toBe(495);
    expect(r.saldo).toBe(15);
    expect(r.status).toBe('extra');
  });

  it('abono_dia_todo: saldo zero e carga cheia mesmo sem ponto', () => {
    const r = Calculations.calculateDayWithContext(
      [], eventos, acordos, '2026-07-10',
      { data: '2026-07-10', tipoAtestado: 'abono_dia_todo' }
    );
    expect(r.trabalhadas).toBe(480);
    expect(r.saldo).toBe(0);
  });

  it('afastamento: dia inteiro coberto, saldo zero', () => {
    const r = Calculations.calculateDayWithContext(
      [], eventos, acordos, '2026-07-10',
      { data: '2026-07-10', tipoAtestado: 'afastamento' }
    );
    expect(r.trabalhadas).toBe(480);
    expect(r.saldo).toBe(0);
    expect(r.tipoAtestado).toBe('afastamento');
  });

  it('pagar_hora_acordo_dia_todo sem ponto registrado gera falta do dia inteiro', () => {
    const r = Calculations.calculateDayWithContext(
      [], eventos, acordos, '2026-07-10',
      { data: '2026-07-10', tipoAtestado: 'pagar_hora_acordo_dia_todo' }
    );
    expect(r.saldo).toBe(-480);
    expect(r.status).toBe('falta');
    expect(r.temRegistro).toBe(false);
  });

  it('pagar_hora_acordo_matutino sem ponto gera falta de meio período', () => {
    const r = Calculations.calculateDayWithContext(
      [], eventos, acordos, '2026-07-10',
      { data: '2026-07-10', tipoAtestado: 'pagar_hora_acordo_matutino' }
    );
    expect(r.saldo).toBe(-240);
  });

  it('dia normal sem atestado cai no cálculo padrão', () => {
    const r = Calculations.calculateDayWithContext(
      [], eventos, acordos, '2026-07-10',
      { data: '2026-07-10', entrada: '08:00', saida: '17:00' }
    );
    expect(r.saldo).toBe(0);
    expect(r.status).toBe('ok');
  });
});

describe('Calculations.calculatePeriodTotals', () => {
  it('agrega saldo positivo e negativo de múltiplos registros', () => {
    const registros = [
      { data: '2026-07-06', entrada: '08:00', saida: '17:00' }, // saldo 0
      { data: '2026-07-07', entrada: '08:00', saida: '18:00' }, // saldo +60
      { data: '2026-07-08', entrada: '08:00', saida: '15:00' }  // saldo -120
    ];
    const totals = Calculations.calculatePeriodTotals(registros, [], []);
    expect(totals.diasProcessados).toBe(3);
    expect(totals.horasExtras).toBe(60);
    expect(totals.horasFaltas).toBe(120);
    expect(totals.diasComExtra).toBe(1);
    expect(totals.diasComFalta).toBe(1);
    expect(totals.totalSaldo).toBe(-60);
  });
});
