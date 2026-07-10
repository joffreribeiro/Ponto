/**
 * calculations.js - Todas as lógicas de cálculo de horas
 * Separação total da lógica de negócio do UI
 */

const Calculations = {
    /**
     * Normaliza data para formato YYYY-MM-DD para comparação
     * Aceita DD/MM/YYYY ou YYYY-MM-DD
     */
    normalizeDateForComparison(dateStr) {
        if (!dateStr) return null;
        
        // Se já está em YYYY-MM-DD, retorna
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
        }
        
        // Se está em DD/MM/YYYY, converte
        const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) {
            const [, day, month, year] = m;
            return `${year}-${month}-${day}`;
        }
        
        return null;
    },

    /**
     * Obtém o evento vigente para uma data específica
     */
    getEventoByData(eventos, dataStr) {
        if (!Array.isArray(eventos) || !dataStr) return null;
        
        const dataNormalizada = this.normalizeDateForComparison(dataStr);
        
        return eventos.find(e =>
            this.normalizeDateForComparison(e.dataInicioEvento) <= dataNormalizada &&
            this.normalizeDateForComparison(e.dataFimEvento) >= dataNormalizada
        ) || null;
    },

    /**
     * Obtém acordo vigente para uma data
     */
    getAcordoByData(acordos, dataStr) {
        if (!Array.isArray(acordos) || !dataStr) return null;

        const dataNormalizada = this.normalizeDateForComparison(dataStr);

        for (const acordo of acordos) {
            if (!Array.isArray(acordo.periodos)) continue;
            
            const periodo = acordo.periodos.find(p =>
                this.normalizeDateForComparison(p.inicio) <= dataNormalizada && 
                this.normalizeDateForComparison(p.fim) >= dataNormalizada
            );
            
            if (periodo) return acordo;
        }
        return null;
    },

    /**
     * Obtém minutos extras válidos para um dia
     */
    getMinutosExtrasForDay(acordo, dataStr) {
        if (!acordo || !Array.isArray(acordo.periodos) || !dataStr) return 0;

        const dataNormalizada = this.normalizeDateForComparison(dataStr);
        
        const periodo = acordo.periodos.find(p =>
            this.normalizeDateForComparison(p.inicio) <= dataNormalizada && 
            this.normalizeDateForComparison(p.fim) >= dataNormalizada
        );

        return periodo ? Number(periodo.minutosExtras || 0) : 0;
    },

    /**
     * Obtém regra de horário vigente
     */
    getRegraHorarioForDay(acordo, dataStr) {
        if (!acordo || !Array.isArray(acordo.regrasHorario) || !dataStr) {
            return this.getDefaultRegra();
        }

        const dataNormalizada = this.normalizeDateForComparison(dataStr);

        return acordo.regrasHorario.find(r =>
            this.normalizeDateForComparison(r.inicio) <= dataNormalizada && 
            this.normalizeDateForComparison(r.fim) >= dataNormalizada
        ) || this.getDefaultRegra();
    },

    /**
     * Regra padrão para dias sem regra específica
     */
    getDefaultRegra() {
        return {
            almocoMin: 60,
            tolAlmoco: 0,
            tolSaida: 0,
            minutosExtras: 0
        };
    },

    /**
     * Calcula horas trabalhadas para um dia com detalhes
     */
    calculateDayDetail(registro, minutosExtrasPeriodo, regra) {
        // Sem registro = sem horas
        if (!registro || !registro.entrada || !registro.saida) {
            return {
                trabalhadas: 0,
                saldo: 0,
                temRegistro: !!registro,
                status: 'sem_registro',
                detalhes: {}
            };
        }

        const entrada = DateUtils.timeToMinutes(registro.entrada);
        const saida = DateUtils.timeToMinutes(registro.saida);
        const saidaAlm = registro.saidaAlmoco ? DateUtils.timeToMinutes(registro.saidaAlmoco) : null;
        const retornoAlm = registro.retornoAlmoco ? DateUtils.timeToMinutes(registro.retornoAlmoco) : null;

        // Validação de entrada/saída
        if (entrada === null || saida === null) {
            return {
                trabalhadas: 0,
                saldo: 0,
                temRegistro: true,
                status: 'erro_hora',
                detalhes: { erro: 'Horários inválidos' }
            };
        }

        // Calcular almoço
        const almocoPadrao = (regra.almocoMin != null) ? regra.almocoMin : 60;
        const tolAlmoco = (regra.tolAlmoco != null) ? regra.tolAlmoco : 5;
        const tolSaida = (regra.tolSaida != null) ? regra.tolSaida : 5;

        let duracaoAlmoco = almocoPadrao;

        // Se houver horários de almoço registrados
        if (saidaAlm !== null && retornoAlm !== null && retornoAlm > saidaAlm) {
            duracaoAlmoco = retornoAlm - saidaAlm;

            // Aplicar tolerância
            const diffAlmoco = duracaoAlmoco - almocoPadrao;
            if (Math.abs(diffAlmoco) <= tolAlmoco) {
                duracaoAlmoco = almocoPadrao;
            }
        }

        // Calcular horas trabalhadas
        const trabalhadas = (saida - entrada) - duracaoAlmoco;
        
        // IMPORTANTE: Usar os minutos extras da REGRA DE HORÁRIO, não do período
        const minutosExtrasRegra = regra.minutosExtras || 0;
        // Carga esperada = 8h (480 min) + minutos extras da regra
        const carga = 480 + minutosExtrasRegra;
        let saldo = trabalhadas - carga;

        // Aplicar tolerância na saída
        if (Math.abs(saldo) <= tolSaida) {
            saldo = 0;
        }

        // Determinar status
        let status = 'ok';
        if (saldo > 0) status = 'extra';
        if (saldo < 0) status = 'falta';

        return {
            trabalhadas,
            saldo,
            temRegistro: true,
            status,
            detalhes: {
                entrada,
                saida,
                duracaoAlmoco,
                carga,
                minutosExtrasRegra,
                minutosExtrasPeriodo
            }
        };
    },

    /**
     * Calcula horas com contexto de acordo/eventos
     */
    calculateDayWithContext(registros, eventos, acordos, dataStr, registro) {
        const evento = this.getEventoByData(eventos, dataStr);
        const acordo = this.getAcordoByData(acordos, dataStr);
        const minutosExtras = this.getMinutosExtrasForDay(acordo, dataStr);
        const regra = this.getRegraHorarioForDay(acordo, dataStr);

        // Atestado de comparecimento vespertino: jornada completa — saldo sempre zero
        // Horários reais são mantidos no registro; o cálculo ignora-os e retorna carga cheia
        if (registro && registro.tipoAtestado === 'comparecimento_vespertino') {
            const minutosExtrasRegra = regra.minutosExtras || 0;
            const carga = 480 + minutosExtrasRegra;
            return {
                trabalhadas: carga,
                saldo: 0,
                temRegistro: true,
                status: 'ok',
                evento,
                acordo,
                regra,
                tipoAtestado: 'comparecimento_vespertino',
                detalhes: { carga, atestado: true }
            };
        }

        // Atestado de comparecimento matutino: entrada efetiva = 07:45 (ignora hora real registrada)
        if (registro && registro.tipoAtestado === 'comparecimento_matutino') {
            const entradaEfetiva = (regra && regra.inicioExpediente) || '07:45';
            const registroAjustado = { ...registro, entrada: entradaEfetiva };
            const calc = this.calculateDayDetail(registroAjustado, minutosExtras, regra);
            return {
                ...calc,
                evento,
                acordo,
                regra,
                tipoAtestado: 'comparecimento_matutino'
            };
        }

        // Abono (manhã, tarde ou dia todo): horários reais preservados, saldo zero
        if (registro && (registro.tipoAtestado === 'abono_matutino' ||
                         registro.tipoAtestado === 'abono_vespertino' ||
                         registro.tipoAtestado === 'abono_dia_todo' ||
                         registro.tipoAtestado === 'abono_acordo_matutino' ||
                         registro.tipoAtestado === 'abono_acordo_vespertino' ||
                         registro.tipoAtestado === 'abono_acordo_dia_todo')) {
            const minutosExtrasRegra = regra.minutosExtras || 0;
            const carga = 480 + minutosExtrasRegra;
            return {
                trabalhadas: carga,
                saldo: 0,
                temRegistro: true,
                status: 'ok',
                evento,
                acordo,
                regra,
                tipoAtestado: registro.tipoAtestado,
                detalhes: { carga, atestado: true }
            };
        }

        // Pagar hora acordo via registro de ponto: saldo negativo no período
        if (registro && (registro.tipoAtestado === 'pagar_hora_acordo_matutino' ||
                         registro.tipoAtestado === 'pagar_hora_acordo_vespertino' ||
                         registro.tipoAtestado === 'pagar_hora_acordo_dia_todo')) {
            const minutosExtrasRegra = regra.minutosExtras || 0;
            const cargaDia = 480 + minutosExtrasRegra;
            const meioPeriodo = registro.tipoAtestado !== 'pagar_hora_acordo_dia_todo';
            const cargaPeriodo = meioPeriodo ? cargaDia / 2 : cargaDia;
            const temPonto = registro.entrada || registro.saida;
            if (!temPonto) {
                return {
                    trabalhadas: 0,
                    saldo: -cargaPeriodo,
                    temRegistro: false,
                    status: 'falta',
                    evento,
                    acordo,
                    regra,
                    tipoAtestado: registro.tipoAtestado,
                    detalhes: { carga: cargaPeriodo }
                };
            }
        }

        // Atestado de afastamento: dia inteiro coberto — saldo zero, carga cheia
        if (registro && registro.tipoAtestado === 'afastamento') {
            const minutosExtrasRegra = regra.minutosExtras || 0;
            const carga = 480 + minutosExtrasRegra;
            return {
                trabalhadas: carga,
                saldo: 0,
                temRegistro: true,
                status: 'ok',
                evento,
                acordo,
                regra,
                tipoAtestado: 'afastamento',
                detalhes: { carga, atestado: true }
            };
        }

        // Dias marcados como "Pagar Hora (Acordo)" = ausência total ou parcial, saldo negativo
        if (evento && evento.tipoEvento === 'pagar_hora_acordo') {
            const minutosExtrasRegra = regra.minutosExtras || 0;
            const cargaDia = 480 + minutosExtrasRegra;
            const periodo = evento.periodo || 'dia_todo';
            const meioPeriodo = (periodo === 'matutino' || periodo === 'vespertino');

            const temPonto = registro && (registro.entrada || registro.saida);

            if (!temPonto) {
                const cargaPeriodo = meioPeriodo ? cargaDia / 2 : cargaDia;
                return {
                    trabalhadas: 0,
                    saldo: -cargaPeriodo,
                    temRegistro: false,
                    status: 'falta',
                    evento,
                    acordo,
                    regra,
                    detalhes: { carga: cargaPeriodo }
                };
            }
        }

        const calc = this.calculateDayDetail(registro, minutosExtras, regra);

        return {
            ...calc,
            evento,
            acordo,
            regra
        };
    },

    /**
     * Calcula totalizações para um período
     */
    calculatePeriodTotals(registros, eventos, acordos) {
        let totalTrabalhadas = 0;
        let totalSaldo = 0;
        let horasExtras = 0;
        let horasFaltas = 0;
        let horasAcordo = 0;
        let diasComExtra = 0;
        let diasComFalta = 0;

        registros.forEach(registro => {
            const calc = this.calculateDayWithContext(
                registros, eventos, acordos, registro.data, registro
            );

            totalTrabalhadas += calc.trabalhadas;
            totalSaldo += calc.saldo;

            if (calc.saldo > 0) {
                horasExtras += calc.saldo;
                diasComExtra++;
            } else if (calc.saldo < 0) {
                horasFaltas += Math.abs(calc.saldo);
                diasComFalta++;
            }

            if (calc.minutosExtras && calc.minutosExtras > 0) {
                horasAcordo += calc.minutosExtras;
            }
        });

        return {
            totalTrabalhadas,
            totalSaldo,
            horasExtras,
            horasFaltas,
            horasAcordo,
            diasComExtra,
            diasComFalta,
            diasProcessados: registros.length
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculations;
}
