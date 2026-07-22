import { describe, it, expect } from 'vitest';
import CrmModel from '../crm-model.js';

describe('CrmModel.normalizarCrm', () => {
  it('devolve estrutura completa com todos os arrays a partir de undefined', () => {
    const crm = CrmModel.normalizarCrm(undefined);
    expect(crm.versao).toBe(1);
    expect(Array.isArray(crm.funis)).toBe(true);
    expect(Array.isArray(crm.negocios)).toBe(true);
    expect(Array.isArray(crm.pessoas)).toBe(true);
    expect(Array.isArray(crm.organizacoes)).toBe(true);
    expect(Array.isArray(crm.historico)).toBe(true);
    expect(crm.funis.length).toBe(0);
    expect(crm.config).toBeTruthy();
  });

  it('preenche defaults sem perder o id de um negócio existente', () => {
    const crm = CrmModel.normalizarCrm({
      funis: [{ id: 'fnl_x', etapas: [{ id: 'etp_x', tipo: 'aberta' }] }],
      negocios: [{ id: 'a', funilId: 'fnl_x', etapaId: 'etp_x' }]
    });
    expect(crm.negocios[0].id).toBe('a');
    expect(crm.negocios[0].titulo).toBe('');
    expect(crm.negocios[0].status).toBe('aberto');
  });

  it('realoca negócio com etapaId inexistente para a primeira etapa aberta do funil', () => {
    const crm = CrmModel.normalizarCrm({
      funis: [{
        id: 'fnl_x',
        etapas: [
          { id: 'etp_aberta', tipo: 'aberta' },
          { id: 'etp_ganho', tipo: 'ganho' }
        ]
      }],
      negocios: [{ id: 'a', funilId: 'fnl_x', etapaId: 'nao-existe' }]
    });
    expect(crm.negocios[0].etapaId).toBe('etp_aberta');
  });

  it('realoca negócio de funil inexistente para o primeiro funil disponível', () => {
    const crm = CrmModel.normalizarCrm({
      funis: [{ id: 'fnl_x', etapas: [{ id: 'etp_x', tipo: 'aberta' }] }],
      negocios: [{ id: 'a', funilId: 'nao-existe', etapaId: 'nao-existe' }]
    });
    expect(crm.negocios[0].funilId).toBe('fnl_x');
    expect(crm.negocios[0].etapaId).toBe('etp_x');
  });

  it('preenche defaults de origem e dataRecebimento e preserva valores existentes', () => {
    const semCampos = CrmModel.normalizarNegocio({});
    expect(semCampos.origem).toBe('');
    expect(semCampos.dataRecebimento).toBeNull();

    const comCampos = CrmModel.normalizarNegocio({
      origem: 'e-mail do Cliente X',
      dataRecebimento: '2026-07-20'
    });
    expect(comCampos.origem).toBe('e-mail do Cliente X');
    expect(comCampos.dataRecebimento).toBe('2026-07-20');
  });

  it('é idempotente: normalizar(normalizar(x)) é igual a normalizar(x)', () => {
    const entrada = {
      funis: [{ nome: 'Comercial', etapas: [{ nome: 'Qualificação' }, { nome: 'Ganho', tipo: 'ganho' }] }],
      negocios: [{ titulo: 'Negócio 1' }],
      pessoas: [{ nome: 'Fulano' }]
    };
    const uma = CrmModel.normalizarCrm(entrada);
    const duas = CrmModel.normalizarCrm(uma);
    expect(duas).toEqual(uma);
  });
});

describe('CrmModel.funilDeTemplate', () => {
  it('template "demandas" não mostra valor e tem exatamente uma etapa ganho e uma perdido', () => {
    const funil = CrmModel.funilDeTemplate('demandas');
    expect(funil.mostrarValor).toBe(false);
    const ganhos = funil.etapas.filter(e => e.tipo === 'ganho');
    const perdidos = funil.etapas.filter(e => e.tipo === 'perdido');
    expect(ganhos.length).toBe(1);
    expect(perdidos.length).toBe(1);
  });

  it('template "vendas" mostra valor', () => {
    const funil = CrmModel.funilDeTemplate('vendas');
    expect(funil.mostrarValor).toBe(true);
  });

  it('devolve null para chave desconhecida', () => {
    expect(CrmModel.funilDeTemplate('inexistente')).toBeNull();
  });
});

describe('CrmModel.validarNegocio', () => {
  const funilComValor = { mostrarValor: true };
  const funilSemValor = { mostrarValor: false };

  it('rejeita título vazio', () => {
    const erros = CrmModel.validarNegocio({ titulo: '' }, funilComValor);
    expect(erros.length).toBeGreaterThan(0);
  });

  it('rejeita valor em funil que não usa valor', () => {
    const erros = CrmModel.validarNegocio({ titulo: 'X', valor: 100 }, funilSemValor);
    expect(erros.some(e => /valor/i.test(e))).toBe(true);
  });

  it('aceita valor 0 em funil que usa valor', () => {
    const erros = CrmModel.validarNegocio({ titulo: 'X', valor: 0 }, funilComValor);
    expect(erros).toEqual([]);
  });

  it('rejeita valor negativo', () => {
    const erros = CrmModel.validarNegocio({ titulo: 'X', valor: -10 }, funilComValor);
    expect(erros.length).toBeGreaterThan(0);
  });

  it('rejeita dataRecebimento malformada e aceita YYYY-MM-DD', () => {
    expect(CrmModel.validarNegocio({ titulo: 'X', dataRecebimento: '20/07/2026' }, funilSemValor).length).toBeGreaterThan(0);
    expect(CrmModel.validarNegocio({ titulo: 'X', dataRecebimento: '2026-07-20' }, funilSemValor)).toEqual([]);
  });
});

describe('CrmModel.validarPessoa / validarOrganizacao', () => {
  it('rejeita pessoa sem nome', () => {
    expect(CrmModel.validarPessoa({ nome: '' }).length).toBeGreaterThan(0);
  });

  it('rejeita e-mail malformado', () => {
    expect(CrmModel.validarPessoa({ nome: 'X', email: 'nao-e-email' }).length).toBeGreaterThan(0);
  });

  it('rejeita organização sem nome', () => {
    expect(CrmModel.validarOrganizacao({ nome: '' }).length).toBeGreaterThan(0);
  });
});
