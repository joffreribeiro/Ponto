import { describe, it, expect } from 'vitest';
import Validators from '../validators.js';

describe('Validators.isValidDate', () => {
  it('aceita ISO válida', () => {
    expect(Validators.isValidDate('2026-07-10')).toBe(true);
  });

  it('aceita BR válida', () => {
    expect(Validators.isValidDate('10/07/2026')).toBe(true);
  });

  it('rejeita data BR inexistente (31/02)', () => {
    expect(Validators.isValidDate('31/02/2026')).toBe(false);
  });

  it('rejeita string vazia, nula ou fora de formato', () => {
    expect(Validators.isValidDate('')).toBe(false);
    expect(Validators.isValidDate(null)).toBe(false);
    expect(Validators.isValidDate('10-07-2026')).toBe(false);
  });
});

describe('Validators.isValidTime', () => {
  it('aceita HH:MM dentro do range', () => {
    expect(Validators.isValidTime('08:00')).toBe(true);
    expect(Validators.isValidTime('23:59')).toBe(true);
  });

  it('rejeita hora ou minuto fora do range', () => {
    expect(Validators.isValidTime('24:00')).toBe(false);
    expect(Validators.isValidTime('12:60')).toBe(false);
  });

  it('rejeita formato inválido', () => {
    expect(Validators.isValidTime('8h00')).toBe(false);
    expect(Validators.isValidTime('')).toBe(false);
  });
});

describe('Validators.validateRegistro', () => {
  it('não retorna erro para registro mínimo válido (sem horários)', () => {
    expect(Validators.validateRegistro({ data: '2026-07-10' })).toEqual([]);
  });

  it('acusa data inválida', () => {
    const errors = Validators.validateRegistro({ data: '31/02/2026' });
    expect(errors).toContain('Data inválida (use formato YYYY-MM-DD)');
  });

  it('acusa saída antes ou igual à entrada', () => {
    const errors = Validators.validateRegistro({
      data: '2026-07-10', entrada: '17:00', saida: '08:00'
    });
    expect(errors).toContain('Hora de saída deve ser posterior à entrada');
  });

  it('aceita entrada/saída coerentes', () => {
    const errors = Validators.validateRegistro({
      data: '2026-07-10', entrada: '08:00', saida: '17:00'
    });
    expect(errors).toEqual([]);
  });
});

describe('Validators.validatePeriodo', () => {
  it('acusa fim anterior ao início', () => {
    const errors = Validators.validatePeriodo({ inicio: '2026-07-10', fim: '2026-07-01' });
    expect(errors).toContain('Data de fim não pode ser anterior à de início');
  });

  it('acusa minutosExtras negativo', () => {
    const errors = Validators.validatePeriodo({
      inicio: '2026-07-01', fim: '2026-07-10', minutosExtras: -5
    });
    expect(errors).toContain('Minutos extras deve ser um número não-negativo');
  });

  it('aceita período válido', () => {
    const errors = Validators.validatePeriodo({
      inicio: '2026-07-01', fim: '2026-07-10', minutosExtras: 30
    });
    expect(errors).toEqual([]);
  });
});

describe('Validators.validateAcordo', () => {
  it('exige nome e ao menos um período', () => {
    const errors = Validators.validateAcordo({ nome: '', periodos: [] });
    expect(errors).toContain('Nome do acordo é obrigatório');
    expect(errors).toContain('Acordo deve ter pelo menos um período');
  });

  it('propaga erros de período com prefixo do índice', () => {
    const errors = Validators.validateAcordo({
      nome: 'Acordo 2026',
      periodos: [{ inicio: '2026-07-10', fim: '2026-07-01' }]
    });
    expect(errors.some(e => e.startsWith('Período 1:'))).toBe(true);
  });

  it('aceita acordo válido', () => {
    const errors = Validators.validateAcordo({
      nome: 'Acordo 2026',
      periodos: [{ inicio: '2026-01-01', fim: '2026-12-31', minutosExtras: 0 }]
    });
    expect(errors).toEqual([]);
  });
});

describe('Validators.validateConfiguracoes', () => {
  it('acusa tipoJornada fora do range', () => {
    const errors = Validators.validateConfiguracoes({ tipoJornada: 200 });
    expect(errors).toContain('Tipo de jornada deve estar entre 1 e 168 horas');
  });

  it('aceita configuração default (objeto vazio)', () => {
    expect(Validators.validateConfiguracoes({})).toEqual([]);
  });
});
