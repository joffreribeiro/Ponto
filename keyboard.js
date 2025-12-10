/**
 * keyboard.js - Sistema de atalhos de teclado
 * Melhora a produtividade com shortcuts
 */

const Keyboard = {
    shortcuts: {},
    enabled: true,

    /**
     * Inicializa o sistema de atalhos
     */
    init() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Registrar atalhos padrão
        this.registerDefaults();
    },

    /**
     * Registra atalhos padrão do sistema
     */
    registerDefaults() {
        // Ctrl/Cmd + N: Novo registro
        this.register('ctrl+n', (e) => {
            e.preventDefault();
            if (typeof abrirModalRegistro === 'function') {
                abrirModalRegistro();
            }
        }, 'Novo registro');

        // Ctrl/Cmd + S: Salvar (se modal aberto)
        this.register('ctrl+s', (e) => {
            e.preventDefault();
            const modalRegistro = document.getElementById('modalRegistro');
            if (modalRegistro && modalRegistro.classList.contains('show')) {
                if (typeof salvarRegistro === 'function') {
                    salvarRegistro();
                }
            }
        }, 'Salvar registro');

        // ESC: Fechar modais
        this.register('escape', (e) => {
            // Fechar modal de registro
            const modalRegistro = document.getElementById('modalRegistro');
            if (modalRegistro && modalRegistro.classList.contains('show')) {
                if (typeof fecharModalRegistro === 'function') {
                    fecharModalRegistro();
                }
                return;
            }

            // Fechar modal de acordo
            const modalAcordo = document.getElementById('modalAcordo');
            if (modalAcordo && modalAcordo.classList.contains('show')) {
                if (typeof fecharModalAcordo === 'function') {
                    fecharModalAcordo();
                }
                return;
            }

            // Fechar modal de evento
            const modalEvento = document.getElementById('modalEvento');
            if (modalEvento && modalEvento.classList.contains('show')) {
                if (typeof fecharModalEvento === 'function') {
                    fecharModalEvento();
                }
            }
        }, 'Fechar modal');

        // Ctrl/Cmd + E: Exportar
        this.register('ctrl+e', (e) => {
            e.preventDefault();
            if (typeof exportarRegistrosCSV === 'function') {
                exportarRegistrosCSV();
            }
        }, 'Exportar registros');

        // Ctrl/Cmd + K: Busca rápida (preparação futura)
        this.register('ctrl+k', (e) => {
            e.preventDefault();
            // Placeholder para busca rápida futura
            Notifications.info('Busca rápida: funcionalidade em desenvolvimento');
        }, 'Busca rápida');

        // F1: Ajuda
        this.register('f1', (e) => {
            e.preventDefault();
            this.showHelp();
        }, 'Mostrar ajuda');

        // Alt + 1/2/3: Trocar abas
        this.register('alt+1', (e) => {
            e.preventDefault();
            this.switchTab('dashboard');
        }, 'Ir para Dashboard');

        this.register('alt+2', (e) => {
            e.preventDefault();
            this.switchTab('ponto');
        }, 'Ir para Ponto');
    },

    /**
     * Registra um novo atalho
     * @param {string} combo - Combinação (ex: 'ctrl+n', 'alt+shift+s')
     * @param {Function} handler - Função a executar
     * @param {string} description - Descrição do atalho
     */
    register(combo, handler, description = '') {
        const normalized = this.normalizeCombo(combo);
        this.shortcuts[normalized] = { handler, description };
    },

    /**
     * Remove um atalho
     */
    unregister(combo) {
        const normalized = this.normalizeCombo(combo);
        delete this.shortcuts[normalized];
    },

    /**
     * Processa teclas pressionadas
     */
    handleKeyPress(e) {
        if (!this.enabled) return;

        // Ignorar se estiver digitando em input/textarea
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            // Exceto ESC que sempre funciona
            if (e.key !== 'Escape') return;
        }

        const combo = this.buildCombo(e);
        const shortcut = this.shortcuts[combo];

        if (shortcut) {
            shortcut.handler(e);
        }
    },

    /**
     * Constrói string de combinação a partir do evento
     */
    buildCombo(e) {
        const parts = [];

        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');

        const key = e.key.toLowerCase();
        parts.push(key);

        return parts.join('+');
    },

    /**
     * Normaliza combinação de teclas
     */
    normalizeCombo(combo) {
        return combo.toLowerCase().split('+').sort().join('+');
    },

    /**
     * Ativa/desativa atalhos
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    },

    /**
     * Mostra ajuda de atalhos
     */
    showHelp() {
        const shortcuts = Object.entries(this.shortcuts)
            .filter(([, data]) => data.description)
            .map(([combo, data]) => {
                const formatted = combo
                    .replace('ctrl', '⌃')
                    .replace('alt', '⌥')
                    .replace('shift', '⇧')
                    .toUpperCase();
                return `<tr><td class="shortcut-key">${formatted}</td><td>${data.description}</td></tr>`;
            })
            .join('');

        const html = `
            <div class="shortcuts-help">
                <h3>⌨️ Atalhos de Teclado</h3>
                <table class="shortcuts-table">
                    <thead>
                        <tr>
                            <th>Atalho</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${shortcuts}
                    </tbody>
                </table>
                <p class="shortcuts-footer">
                    <small>Pressione <kbd>ESC</kbd> para fechar</small>
                </p>
            </div>
        `;

        // Criar modal de ajuda
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `<div class="modal-content">${html}</div>`;
        document.body.appendChild(modal);

        // Fechar com ESC ou clique fora
        const close = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentElement) {
                    modal.parentElement.removeChild(modal);
                }
            }, 300);
        };

        modal.onclick = (e) => {
            if (e.target === modal) close();
        };

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', escHandler);
            }
        };
        setTimeout(() => document.addEventListener('keydown', escHandler), 100);
    },

    /**
     * Troca de aba
     */
    switchTab(tabId) {
        const btn = document.querySelector(`[data-tab="${tabId}"]`);
        if (btn) {
            btn.click();
        }
    }
};

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Keyboard.init());
} else {
    Keyboard.init();
}
