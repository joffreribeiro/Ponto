/**
 * dateUtils.js - Utilitários centralizados para datas e horas
 */

const DateUtils = {
    /**
     * Normaliza uma data em qualquer formato comum para YYYY-MM-DD
     */
    normalize(str) {
        if (!str) return '';
        const s = str.trim();

        // DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
            const [d, m, a] = s.split('/');
            return `${a}-${m}-${d}`;
        }

        // DD-MM-YYYY
        if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
            const [d, m, a] = s.split('-');
            return `${a}-${m}-${d}`;
        }

        // YYYY/MM/DD
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
            const [a, m, d] = s.split('/');
            return `${a}-${m}-${d}`;
        }

        // YYYY-M-D ou YYYY-MM-DD (já no formato correto, apenas normaliza padding)
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
            const [a, m, d] = s.split('-');
            return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }

        return s;
    },

    /**
     * Parse data flexível (aceita múltiplos formatos)
     * Cria data na meia-noite local (não UTC) para comparações consistentes
     */
    parse(str) {
        if (!str) return null;
        const normalized = this.normalize(str);
        const [year, month, day] = normalized.split('-').map(Number);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
        
        // Cria data na meia-noite da timezone local
        const d = new Date(year, month - 1, day, 0, 0, 0, 0);
        return !isNaN(d.getTime()) ? d : null;
    },

    /**
     * Converte tempo HH:MM para minutos totais
     */
    timeToMinutes(timeStr) {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return null;
        return h * 60 + m;
    },

    /**
     * Converte minutos para HH:MM
     */
    minutesToTime(totalMinutes) {
        const signal = totalMinutes < 0 ? '-' : '';
        const abs = Math.abs(totalMinutes);
        const h = Math.floor(abs / 60);
        const m = abs % 60;
        return `${signal}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },

    /**
     * Verifica se é dia útil (segunda a sexta)
     */
    isBusinessDay(dateObj) {
        if (!(dateObj instanceof Date)) return false;
        const dow = dateObj.getDay();
        return dow !== 0 && dow !== 6;
    },

    /**
     * Calcula diferença entre dois horários em minutos
     */
    timeDifference(startTime, endTime) {
        const start = this.timeToMinutes(startTime);
        const end = this.timeToMinutes(endTime);
        
        if (start === null || end === null) return null;
        
        return end - start;
    },

    /**
     * Obtém data ISO do formato string
     */
    getIsoDate(dateObj) {
        if (typeof dateObj === 'string') return dateObj;
        if (!(dateObj instanceof Date)) return null;
        return dateObj.toISOString().split('T')[0];
    },

    /**
     * Obtém data atual em formato YYYY-MM-DD
     */
    today() {
        return this.getIsoDate(new Date());
    },

    /**
     * Formata data para display
     */
    format(dateStr, pattern = 'DD/MM/YYYY') {
        const normalized = this.normalize(dateStr);
        const d = this.parse(normalized);
        if (!d) return dateStr;

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return pattern
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
    }
};
