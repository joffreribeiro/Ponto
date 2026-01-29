/**
 * storage.js - Gerenciamento de persistência em localStorage
 * Separação total de lógica de armazenamento
 */

const STORAGE_KEY = 'controle_ponto_avancado_v1';

// Atividade de teste padrão para diagnóstico
const ATIVIDADE_TESTE = {
    id: 'TESTE_001',
    ordem: '1',
    tedPtrab: 'TED-001',
    objeto: 'Atividade de Teste',
    processoPrincipal: 'PROC-2024-001',
    assunto: 'Verificar se a tabela está funcionando',
    processoSolicitacao: 'SOL-001',
    dataDoc: '2025-01-15',
    tipoDoc: 'MEMO',
    numeroDoc: '001/2025',
    remetente: 'Sistema',
    destinatario: 'Usuário',
    acaoRealizar: 'Testar renderização',
    prazo: '2025-01-30',
    dias: 15,
    observacoes: 'Esta é uma atividade de teste para verificar se a tabela está sendo renderizada corretamente.',
    finalizado: false,
    status: 'pendente',
    prioridade: 'alta',
    progresso: 0,
    criadoEm: new Date().toISOString()
};

const Storage = {
    _saveTimer: null,

    /**
     * Dados padrão/esquema
     */
    DEFAULT_DATA: {
        registros: [],
        configuracoes: {
            tipoJornada: 44,
            entradaPadrao: '',
            saidaPadrao: '',
            almocoMinutos: 60,
            toleranciaAtraso: 5,
            inicioPeriodoBanco: '',
            fimPeriodoBanco: ''
        },
        eventos: [],
        acordos: [],
        tiposEvento: [
            { id: 'feriado', nome: 'Feriado', cor: '#dc2626' },
            { id: 'ferias', nome: 'Férias', cor: '#d97706' },
            { id: 'afastamento', nome: 'Afastamento', cor: '#0891b2' },
            { id: 'viagem', nome: 'Viagem', cor: '#7c3aed' },
            { id: 'abono_acordo', nome: 'Abono (acordo)', cor: '#059669' },
            { id: 'compensar_acordo', nome: 'Pagar Hora (acordo)', cor: '#db2777' },
            { id: 'outro', nome: 'Outro', cor: '#64748b' }
        ]
    },

    /**
     * Carrega dados do localStorage com fallback seguro
     */
    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return this.getDefaultData();

            const parsed = JSON.parse(raw);
            
            // Validar estrutura básica
            if (!this.isValidDataStructure(parsed)) {
                console.warn('Estrutura de dados inválida, restaurando padrão');
                return this.getDefaultData();
            }

            // Garantir que tiposEvento existe
            if (!parsed.tiposEvento || !Array.isArray(parsed.tiposEvento)) {
                console.log('Adicionando tiposEvento aos dados existentes');
                parsed.tiposEvento = JSON.parse(JSON.stringify(this.DEFAULT_DATA.tiposEvento));
                this.save(parsed);
            } else {
                // Migração: Atualizar cores dos tipos de evento se necessário
                const defaultTipos = this.DEFAULT_DATA.tiposEvento;
                parsed.tiposEvento = parsed.tiposEvento.map(tipo => {
                    const defaultTipo = defaultTipos.find(t => t.id === tipo.id);
                    // Se a cor for uma cor antiga (pastel), atualiza para a nova
                    if (defaultTipo && (tipo.cor.startsWith('#ff') || tipo.cor.startsWith('#fe') || tipo.cor.startsWith('#dc') || tipo.cor.startsWith('#e0') || tipo.cor.startsWith('#ed') || tipo.cor.startsWith('#f3'))) {
                        const isOldColor = tipo.cor.length === 7 && (
                            tipo.cor === '#ffe4e6' || // feriado antigo
                            tipo.cor === '#fef9c3' || // ferias antigo
                            tipo.cor === '#e0f2fe' || // afastamento antigo
                            tipo.cor === '#ede9fe' || // viagem antigo
                            tipo.cor === '#dcfce7' || // abono antigo
                            tipo.cor === '#fef3c7' || // compensar antigo
                            tipo.cor === '#f3f4f6'    // outro antigo
                        );
                        if (isOldColor) {
                            return { ...tipo, cor: defaultTipo.cor };
                        }
                    }
                    return tipo;
                });
                // Salvar migração
                this.save(parsed);
            }

            return parsed;
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            return this.getDefaultData();
        }
    },

    /**
     * Salva dados no localStorage com validação
     */
    save(dados) {
        try {
            if (!this.isValidDataStructure(dados)) {
                throw new Error('Estrutura de dados inválida');
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            return false;
        }
    },

    /**
     * Salva dados com debounce (otimizado para múltiplas chamadas)
     * @param {Object} dados - Dados a salvar
     * @param {number} delay - Delay em ms (padrão 1000ms)
     */
    saveDebounced(dados, delay = 1000) {
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }

        this._saveTimer = setTimeout(() => {
            this.save(dados);
            this._saveTimer = null;
        }, delay);
    },

    /**
     * Obtém dados padrão
     */
    getDefaultData() {
        return JSON.parse(JSON.stringify(this.DEFAULT_DATA));
    },

    /**
     * Valida se a estrutura de dados é válida
     */
    isValidDataStructure(dados) {
        if (!dados || typeof dados !== 'object') return false;
        
        return (
            Array.isArray(dados.registros) &&
            typeof dados.configuracoes === 'object' &&
            Array.isArray(dados.eventos) &&
            Array.isArray(dados.acordos)
        );
        // Nota: tiposEvento é opcional e será adicionado automaticamente se não existir
    },

    /**
     * Limpa todos os dados (com confirmação)
     */
    clear() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            return false;
        }
    },

    /**
     * Exporta dados como JSON
     */
    export(dados) {
        try {
            return JSON.stringify(dados, null, 2);
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            return null;
        }
    },

    /**
     * Importa dados de JSON
     */
    import(jsonStr) {
        try {
            const parsed = JSON.parse(jsonStr);
            if (!this.isValidDataStructure(parsed)) {
                throw new Error('Estrutura inválida no arquivo importado');
            }
            return parsed;
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            return null;
        }
    }
};
