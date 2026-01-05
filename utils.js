/**
 * utils.js - Funções utilitárias gerais
 * Inclui debounce, throttle e outras helpers
 */

const Utils = {
    /**
     * Debounce - Executa função após delay sem novas chamadas
     * @param {Function} func - Função a executar
     * @param {number} wait - Tempo de espera em ms
     * @param {boolean} immediate - Executar imediatamente na primeira chamada
     */
    debounce(func, wait = 300, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const context = this;
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    },

    /**
     * Throttle - Limita execuções a uma por intervalo
     * @param {Function} func - Função a executar
     * @param {number} limit - Intervalo mínimo em ms
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Sanitiza HTML para prevenir XSS
     * @param {string} text - Texto a sanitizar
     */
    sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Formata número com padding
     * @param {number} num - Número
     * @param {number} size - Tamanho mínimo
     */
    pad(num, size = 2) {
        return String(num).padStart(size, '0');
    },

    /**
     * Copia texto para clipboard
     * @param {string} text - Texto a copiar
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback para navegadores antigos
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                return success;
            }
        } catch (err) {
            console.error('Erro ao copiar:', err);
            return false;
        }
    },

    /**
     * Formata bytes em formato legível
     * @param {number} bytes - Bytes
     * @param {number} decimals - Casas decimais
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    },

    /**
     * Download de arquivo
     * @param {string} content - Conteúdo do arquivo
     * @param {string} filename - Nome do arquivo
     * @param {string} type - MIME type
     */
    downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Verifica se dispositivo é mobile
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    },

    /**
     * Verifica se está online
     */
    isOnline() {
        return navigator.onLine;
    },

    /**
     * Gera ID único
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Deep clone de objeto
     * @param {any} obj - Objeto a clonar
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (obj instanceof Object) {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },

    /**
     * Retry com backoff exponencial
     * @param {Function} fn - Função a executar
     * @param {number} maxRetries - Máximo de tentativas
     * @param {number} delay - Delay inicial em ms
     */
    async retry(fn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    },

    /**
     * Formata data para exibição
     * @param {string} dateStr - Data no formato YYYY-MM-DD
     */
    formatDateDisplay(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    },

    /**
     * Valida e-mail
     */
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    /**
     * Agrupa array por propriedade
     * @param {Array} array - Array a agrupar
     * @param {string|Function} key - Chave ou função
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = typeof key === 'function' ? key(item) : item[key];
            if (!result[group]) result[group] = [];
            result[group].push(item);
            return result;
        }, {});
    }
};

// Exportar para uso global
window.Utils = Utils;
