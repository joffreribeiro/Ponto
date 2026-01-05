/**
 * validators.js - Validações robustas para dados
 * Centraliza todas as validações de entrada
 */

const Validators = {
    /**
     * Valida formato de data (YYYY-MM-DD)
     */
    isValidDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return false;
        return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
    },

    /**
     * Valida formato de hora (HH:MM)
     */
    isValidTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return false;
        const match = /^(\d{1,2}):(\d{2})$/.test(timeStr);
        if (!match) return false;
        const [h, m] = timeStr.split(':').map(Number);
        return h >= 0 && h < 24 && m >= 0 && m < 60;
    },

    /**
     * Valida um registro de ponto completo
     */
    validateRegistro(registro) {
        const errors = [];

        if (!registro || typeof registro !== 'object') {
            errors.push('Registro deve ser um objeto válido');
            return errors;
        }

        // Data obrigatória
        if (!this.isValidDate(registro.data)) {
            errors.push('Data inválida (use formato YYYY-MM-DD)');
        }

        // Entrada obrigatória
        if (!this.isValidTime(registro.entrada)) {
            errors.push('Hora de entrada inválida (use formato HH:MM)');
        }

        // Saída é OPCIONAL - permite registros com só entrada
        if (registro.saida && !this.isValidTime(registro.saida)) {
            errors.push('Hora de saída inválida (use formato HH:MM)');
        }

        // Validações opcionais se fornecidas
        if (registro.saidaAlmoco && !this.isValidTime(registro.saidaAlmoco)) {
            errors.push('Hora de saída de almoço inválida');
        }

        if (registro.retornoAlmoco && !this.isValidTime(registro.retornoAlmoco)) {
            errors.push('Hora de retorno de almoço inválida');
        }

        // Saída deve ser após entrada, mas só valida se saída está preenchida
        if (this.isValidTime(registro.entrada) && registro.saida && this.isValidTime(registro.saida)) {
            const [hE, mE] = registro.entrada.split(':').map(Number);
            const [hS, mS] = registro.saida.split(':').map(Number);
            const minE = hE * 60 + mE;
            const minS = hS * 60 + mS;
            if (minS <= minE) {
                errors.push('Hora de saída deve ser posterior à entrada');
            }
        }

        // Periodo do evento (opcional) — aceitar valores específicos
        if (registro.periodoEvento !== undefined && registro.periodoEvento !== null && registro.periodoEvento !== '') {
            const allowed = ['dia_todo', 'matutino', 'vespertino'];
            if (typeof registro.periodoEvento !== 'string' || !allowed.includes(registro.periodoEvento)) {
                errors.push('Período do registro inválido');
            }
        }

        // createLinkedEvent (opcional) deve ser booleano quando presente
        if (registro.createLinkedEvent !== undefined && registro.createLinkedEvent !== null) {
            if (typeof registro.createLinkedEvent !== 'boolean') {
                errors.push('Flag createLinkedEvent inválida');
            }
        }

        // Tipo de evento vinculado ao registro (opcional)
        if (registro.tipoEventoRegistro !== undefined && registro.tipoEventoRegistro !== null && registro.tipoEventoRegistro !== '') {
            if (typeof registro.tipoEventoRegistro !== 'string') {
                errors.push('Tipo de evento do registro inválido');
            }
        }

        return errors;
    },

    /**
     * Valida um período de compensação
     */
    validatePeriodo(periodo) {
        const errors = [];

        if (!periodo || typeof periodo !== 'object') {
            errors.push('Período deve ser um objeto válido');
            return errors;
        }

        if (!this.isValidDate(periodo.inicio)) {
            errors.push('Data de início do período inválida');
        }

        if (!this.isValidDate(periodo.fim)) {
            errors.push('Data de fim do período inválida');
        }

        if (this.isValidDate(periodo.inicio) && this.isValidDate(periodo.fim)) {
            if (periodo.fim < periodo.inicio) {
                errors.push('Data de fim não pode ser anterior à de início');
            }
        }

        const minExtras = Number(periodo.minutosExtras || 0);
        if (isNaN(minExtras) || minExtras < 0) {
            errors.push('Minutos extras deve ser um número não-negativo');
        }

        return errors;
    },

    /**
     * Valida uma regra de horário
     */
    validateRegraHorario(regra) {
        const errors = [];

        if (!regra || typeof regra !== 'object') {
            errors.push('Regra deve ser um objeto válido');
            return errors;
        }

        if (!this.isValidDate(regra.inicio)) {
            errors.push('Data de início da regra inválida');
        }

        if (!this.isValidDate(regra.fim)) {
            errors.push('Data de fim da regra inválida');
        }

        if (this.isValidDate(regra.inicio) && this.isValidDate(regra.fim)) {
            if (regra.fim < regra.inicio) {
                errors.push('Data de fim não pode ser anterior à de início');
            }
        }

        // Validações numéricas
        const almocoMin = Number(regra.almocoMin || 60);
        if (isNaN(almocoMin) || almocoMin < 0 || almocoMin > 480) {
            errors.push('Almoço deve estar entre 0 e 480 minutos');
        }

        const tolAlmoco = Number(regra.tolAlmoco || 5);
        if (isNaN(tolAlmoco) || tolAlmoco < 0) {
            errors.push('Tolerância de almoço deve ser não-negativa');
        }

        const tolSaida = Number(regra.tolSaida || 5);
        if (isNaN(tolSaida) || tolSaida < 0) {
            errors.push('Tolerância de saída deve ser não-negativa');
        }

        const vale = Number(regra.vale || 0);
        if (isNaN(vale) || vale < 0) {
            errors.push('Valor do vale deve ser não-negativo');
        }

        return errors;
    },

    /**
     * Valida um evento completo
     */
    validateEvento(evento) {
        const errors = [];

        if (!evento || typeof evento !== 'object') {
            errors.push('Evento deve ser um objeto válido');
            return errors;
        }

        if (!evento.tipoEvento || typeof evento.tipoEvento !== 'string') {
            errors.push('Tipo de evento é obrigatório');
        }

        if (!evento.descricaoEvento || typeof evento.descricaoEvento !== 'string') {
            errors.push('Descrição do evento é obrigatória');
        }

        if (!this.isValidDate(evento.dataInicioEvento)) {
            errors.push('Data de início do evento inválida');
        }

        if (!this.isValidDate(evento.dataFimEvento)) {
            errors.push('Data de fim do evento inválida');
        }

        if (this.isValidDate(evento.dataInicioEvento) && this.isValidDate(evento.dataFimEvento)) {
            if (evento.dataFimEvento < evento.dataInicioEvento) {
                errors.push('Data de fim não pode ser anterior à de início');
            }
        }

        if (evento.acordoIndex !== undefined && evento.acordoIndex !== null) {
            if (!Number.isInteger(evento.acordoIndex) || evento.acordoIndex < 0) {
                errors.push('Índice de acordo inválido');
            }
        }

        // Periodo (opcional) - validar valores permitidos
        if (evento.periodo !== undefined && evento.periodo !== null) {
            const allowed = ['dia_todo', 'matutino', 'vespertino'];
            if (typeof evento.periodo !== 'string' || !allowed.includes(evento.periodo)) {
                errors.push('Período do evento inválido');
            }
        }

        return errors;
    },

    /**
     * Valida um acordo completo
     */
    validateAcordo(acordo) {
        const errors = [];

        if (!acordo || typeof acordo !== 'object') {
            errors.push('Acordo deve ser um objeto válido');
            return errors;
        }

        if (!acordo.nome || typeof acordo.nome !== 'string' || !acordo.nome.trim()) {
            errors.push('Nome do acordo é obrigatório');
        }

        if (!Array.isArray(acordo.periodos) || acordo.periodos.length === 0) {
            errors.push('Acordo deve ter pelo menos um período');
        }

        // Validar cada período
        (acordo.periodos || []).forEach((p, idx) => {
            const errosPeriodo = this.validatePeriodo(p);
            errosPeriodo.forEach(erro => {
                errors.push(`Período ${idx + 1}: ${erro}`);
            });
        });

        // Validar cada regra (opcional)
        (acordo.regrasHorario || []).forEach((r, idx) => {
            const errosRegra = this.validateRegraHorario(r);
            errosRegra.forEach(erro => {
                errors.push(`Regra ${idx + 1}: ${erro}`);
            });
        });

        return errors;
    },

    /**
     * Valida uma atividade (usada pelo modal Nova Atividade)
     */
    validateAtividade(atividade) {
        const errors = [];
        if (!atividade || typeof atividade !== 'object') {
            errors.push('Atividade deve ser um objeto válido');
            return errors;
        }

        // ordem (string/numero) obrigatória
        if (!atividade.ordem || String(atividade.ordem).trim() === '') {
            errors.push('Ordem da atividade é obrigatória');
        }

        // prazo (opcional) deve ser data válida se preenchido
        if (atividade.prazo && !this.isValidDate(String(atividade.prazo))) {
            errors.push('Prazo inválido (use YYYY-MM-DD)');
        }

        // status (se fornecido) deve ser um dos permitidos
        if (atividade.status) {
            const allowed = ['pendente','em andamento','bloqueada','concluida'];
            if (typeof atividade.status !== 'string' || !allowed.includes(atividade.status)) {
                errors.push('Status da atividade inválido');
            }
        }

        // prioridade (se fornecida)
        if (atividade.prioridade) {
            const allowedP = ['baixa','media','alta','critica'];
            if (typeof atividade.prioridade !== 'string' || !allowedP.includes(atividade.prioridade)) {
                errors.push('Prioridade inválida');
            }
        }

        // finalizado deve ser booleano quando fornecido
        if (atividade.finalizado !== undefined && typeof atividade.finalizado !== 'boolean') {
            errors.push('Campo finalizado deve ser booleano');
        }

        return errors;
    },

    /**
     * Valida as configurações globais
     */
    validateConfiguracoes(config) {
        const errors = [];

        if (!config || typeof config !== 'object') {
            errors.push('Configurações devem ser um objeto válido');
            return errors;
        }

        const tipoJornada = Number(config.tipoJornada || 44);
        if (isNaN(tipoJornada) || tipoJornada <= 0 || tipoJornada > 168) {
            errors.push('Tipo de jornada deve estar entre 1 e 168 horas');
        }

        const almocoMinutos = Number(config.almocoMinutos || 60);
        if (isNaN(almocoMinutos) || almocoMinutos < 0 || almocoMinutos > 480) {
            errors.push('Almoço deve estar entre 0 e 480 minutos');
        }

        const toleranciaAtraso = Number(config.toleranciaAtraso || 5);
        if (isNaN(toleranciaAtraso) || toleranciaAtraso < 0) {
            errors.push('Tolerância deve ser não-negativa');
        }

        if (config.inicioPeriodoBanco && !this.isValidDate(config.inicioPeriodoBanco)) {
            errors.push('Data de início do banco de horas inválida');
        }

        if (config.fimPeriodoBanco && !this.isValidDate(config.fimPeriodoBanco)) {
            errors.push('Data de fim do banco de horas inválida');
        }

        return errors;
    }
};
