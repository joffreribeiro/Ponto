/**
 * loading.js - Sistema de indicadores de carregamento
 * Fornece feedback visual durante operações assíncronas
 */

const Loading = {
    overlay: null,
    activeLoaders: 0,

    /**
     * Inicializa o overlay de loading
     */
    init() {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'loading-overlay';
        this.overlay.className = 'loading-overlay';
        this.overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-circle"></div>
                <p class="loading-text">Carregando...</p>
            </div>
        `;
        document.body.appendChild(this.overlay);
    },

    /**
     * Mostra o loading global
     * @param {string} text - Texto opcional
     */
    show(text = 'Carregando...') {
        this.init();
        this.activeLoaders++;
        
        const loadingText = this.overlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }
        
        this.overlay.classList.add('loading-visible');
    },

    /**
     * Esconde o loading global
     */
    hide() {
        if (!this.overlay) return;
        
        this.activeLoaders = Math.max(0, this.activeLoaders - 1);
        
        if (this.activeLoaders === 0) {
            this.overlay.classList.remove('loading-visible');
        }
    },

    /**
     * Executa uma função com loading
     * @param {Function} fn - Função a executar
     * @param {string} text - Texto do loading
     */
    async wrap(fn, text = 'Processando...') {
        this.show(text);
        try {
            const result = await Promise.resolve(fn());
            return result;
        } finally {
            // Pequeno delay para melhor UX
            setTimeout(() => this.hide(), 300);
        }
    },

    /**
     * Cria um spinner inline para elementos específicos
     * @param {HTMLElement} element - Elemento alvo
     */
    showInline(element) {
        if (!element) return;

        const spinner = document.createElement('span');
        spinner.className = 'inline-spinner';
        spinner.innerHTML = '<span class="spinner-small"></span>';
        spinner.dataset.loadingSpinner = 'true';

        element.style.position = 'relative';
        element.appendChild(spinner);

        return spinner;
    },

    /**
     * Remove spinner inline
     * @param {HTMLElement} element - Elemento alvo
     */
    hideInline(element) {
        if (!element) return;

        const spinner = element.querySelector('[data-loading-spinner]');
        if (spinner && spinner.parentElement) {
            spinner.parentElement.removeChild(spinner);
        }
    },

    /**
     * Mostra loading em um botão
     * @param {HTMLElement} button - Botão
     * @param {boolean} show - Mostrar ou esconder
     */
    button(button, show = true) {
        if (!button) return;

        if (show) {
            button.dataset.originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<span class="spinner-small"></span> Processando...';
            button.classList.add('btn-loading');
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || button.innerHTML;
            button.classList.remove('btn-loading');
            delete button.dataset.originalText;
        }
    },

    /**
     * Barra de progresso
     * @param {number} percent - Porcentagem (0-100)
     * @param {string} text - Texto opcional
     */
    showProgress(percent, text = '') {
        this.init();
        
        let progressBar = this.overlay.querySelector('.progress-bar');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.innerHTML = `
                <div class="progress-fill"></div>
                <div class="progress-text"></div>
            `;
            const spinner = this.overlay.querySelector('.loading-spinner');
            if (spinner) {
                spinner.appendChild(progressBar);
            }
        }

        const fill = progressBar.querySelector('.progress-fill');
        const textEl = progressBar.querySelector('.progress-text');

        if (fill) fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        if (textEl) textEl.textContent = text || `${Math.round(percent)}%`;

        this.overlay.classList.add('loading-visible');
    },

    /**
     * Força reset de todos os loadings
     */
    reset() {
        this.activeLoaders = 0;
        if (this.overlay) {
            this.overlay.classList.remove('loading-visible');
        }
    }
};

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Loading.init());
} else {
    Loading.init();
}
