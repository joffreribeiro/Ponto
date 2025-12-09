/**
 * storage.js - Gerenciamento de persistência em localStorage
 * Separação total de lógica de armazenamento
 */

const STORAGE_KEY = 'controle_ponto_avancado_v1';

const Storage = {
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
        acordos: []
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
