/**
 * storage.js - Gerenciamento de persistência em localStorage
 * Separação total de lógica de armazenamento
 */

const STORAGE_KEY = 'controle_ponto_avancado_v1';

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
     * Carrega dados do Firestore (cloud) e faz merge com local.
     * Cloud tem prioridade. Retorna os dados finais ou null se não houver cloud.
     * Deve ser chamado quando o usuário fizer login.
     */
    async loadFromCloud() {
        try {
            if (!window.FirebaseSync || typeof window.FirebaseSync.loadFromFirestore !== 'function') {
                return null; // sem Firebase disponível
            }
            const cloudData = await window.FirebaseSync.loadFromFirestore();
            if (!cloudData || !this.isValidDataStructure(cloudData)) {
                return null; // sem dados na cloud ou estrutura inválida
            }
            // Cloud tem prioridade: salvar no localStorage local (sem re-sync para cloud)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
            return cloudData;
        } catch (e) {
            // Se falhar (ex.: não autenticado, timeout), retornar null silenciosamente
            return null;
        }
    },

    /**
     * Salva dados no localStorage com validação
     */
    save(dados) {
        try {
            // Bloquear gravação se usuário não for admin (exigimos backend claim 'admin')
            try {
                // se o objeto FirebaseSync não estiver presente, bloquear por segurança
                if (!window.FirebaseSync) {
                    alert('Serviço de autenticação indisponível. Faça login para editar os dados.');
                    return false;
                }
                // preferimos a checagem síncrona requireAdminSync quando disponível
                if (typeof window.FirebaseSync.requireAdminSync === 'function') {
                    try {
                        window.FirebaseSync.requireAdminSync();
                    } catch (errAdmin) {
                        alert('Permissão negada: ' + (errAdmin && errAdmin.message ? errAdmin.message : 'somente administradores podem modificar os dados.'));
                        return false;
                    }
                } else if (typeof window.FirebaseSync.getIsAdminSync === 'function') {
                    if (!window.FirebaseSync.getIsAdminSync()) {
                        alert('Permissão negada: somente administradores podem modificar os dados.');
                        return false;
                    }
                } else {
                    // Se não houver nenhum helper síncrono, bloquear por segurança
                    alert('Serviço de autenticação incompleto. Faça login para editar os dados.');
                    return false;
                }
            } catch (e) {
                console.warn('Falha ao checar permissões antes de salvar:', e);
                alert('Erro ao verificar permissões de autenticação. Ação bloqueada.');
                return false;
            }
            if (!this.isValidDataStructure(dados)) {
                throw new Error('Estrutura de dados inválida');
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));

            // Tentativa assíncrona de sincronizar com Firestore (se disponível)
            try {
                if (window.FirebaseSync && typeof window.FirebaseSync.syncToCloud === 'function') {
                    // Não aguardamos a promise aqui para não bloquear a UI
                    window.FirebaseSync.syncToCloud(dados).then(res => {
                        if (!res || !res.ok) console.warn('Sync cloud retornou erro', res && res.error ? res.error : res);
                    }).catch(err => console.warn('Erro ao sincronizar com Firestore:', err));
                }
            } catch (e) {
                console.warn('Erro ao iniciar syncToCloud:', e);
            }

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
        // Bloquear debounce se usuário não autenticado (evita agendar saves que serão indevidos)
        try {
            if (window.FirebaseSync && typeof window.FirebaseSync.getCurrentUserSync === 'function') {
                const cur = window.FirebaseSync.getCurrentUserSync();
                if (!cur) {
                    console.warn('saveDebounced: usuário não autenticado — operação abortada');
                    return false;
                }
            }
        } catch (e) {
            console.warn('Falha ao checar autenticação antes de saveDebounced:', e);
        }

        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }

        this._saveTimer = setTimeout(() => {
            const ok = this.save(dados);
            this._saveTimer = null;

            // Em caso de não ter sincronizado automaticamente via save (ou se quiser forçar),
            // tentamos novamente chamar syncToCloud se disponível.
            try {
                if (window.FirebaseSync && typeof window.FirebaseSync.syncToCloud === 'function') {
                    window.FirebaseSync.syncToCloud(dados).then(res => {
                        if (!res || !res.ok) console.warn('Sync cloud retornou erro (debounced)', res && res.error ? res.error : res);
                    }).catch(err => console.warn('Erro ao sincronizar com Firestore (debounced):', err));
                }
            } catch (e) {
                console.warn('Erro ao iniciar syncToCloud (debounced):', e);
            }
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
