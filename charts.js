/**
 * charts.js - Sistema de gráficos e analytics
 * Visualização de dados com Chart.js
 */

const Charts = {
    /**
     * Cria gráfico pizza de tipos de evento (doughnut)
     */
    createEventTypesChart(canvasId, eventos = [], tiposEvento = []) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const counts = {};
        eventos.forEach(ev => {
            const tipo = ev.tipo || ev.tipoId || ev.tipo_evento || ev.tipoEvento || ev.type || ev.tipo_id || 'outro';
            const key = (typeof tipo === 'object' && tipo !== null) ? (tipo.id || tipo.nome || 'outro') : (tipo || 'outro');
            counts[String(key)] = (counts[String(key)] || 0) + 1;
        });

        const labels = Object.keys(counts);
        const data = labels.map(l => counts[l]);

        const defaultColors = [
            '#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706',
            '#dc2626', '#db2777', '#6366f1', '#0d9488', '#ea580c'
        ];

        const colors = labels.map((tipo, index) => {
            const tipoInfo = tiposEvento.find(t => t.id === tipo || String(t.id) === tipo || t.nome === tipo);
            return tipoInfo && tipoInfo.cor ? tipoInfo.cor : defaultColors[index % defaultColors.length];
        });

        return this.createChart(canvasId, {
            type: 'doughnut',
            data: {
                labels: labels.map(l => {
                    const tipoInfo = tiposEvento.find(t => t.id === l || String(t.id) === l || t.nome === l);
                    return tipoInfo ? (tipoInfo.nome || String(l)) : String(l);
                }),
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 4,
                    borderColor: '#ffffff',
                    hoverOffset: 8,
                    hoverBorderWidth: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const val = ctx.raw;
                                const total = ctx.dataset.data.reduce((a,b)=>a+b,0) || 0;
                                const pct = total ? ((val/total)*100).toFixed(1) : 0;
                                return `${ctx.label}: ${val} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
            type: 'bar',
            data: {
                labels: labels.map(m => {
                    const [year, month] = m.split('-');
                    return `${month}/${year}`;
                }),
                datasets: [{
                    label: 'Saldo (horas)',
                    data: data,
                    backgroundColor: data.map(v => v >= 0 ? '#059669' : '#dc2626'),
                    borderWidth: 0,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Saldo de Horas por Mês'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Horas'
                        }
                    }
                }
            }
        });
    },

    /**
     * Cria gráfico pizza de tipos de evento
     */
    createEventTypesChart(canvasId, eventos, tiposEvento) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        // Contar por tipo
        const labels = Object.keys(byMonth).sort();
        const data = labels.map(m => byMonth[m].toFixed(1));

        // Calculate monthly target(s)
        const horasDiarias = (opts && typeof opts.horasDiarias === 'number') ? opts.horasDiarias : 8;
        const providedMeta = (opts && typeof opts.metaMensal === 'number') ? opts.metaMensal : null;
        const monthlyTargets = labels.map(m => {
            try {
                if (providedMeta !== null) return providedMeta;
                const [yy, mm] = m.split('-');
                const y = Number(yy);
                const mo = Number(mm) - 1;
                const last = new Date(y, mo + 1, 0).getDate();
                let businessDays = 0;
                for (let d = 1; d <= last; d++) {
                    const dt = new Date(y, mo, d);
                    if (typeof DateUtils !== 'undefined' && typeof DateUtils.isBusinessDay === 'function') {
                        if (DateUtils.isBusinessDay(dt)) businessDays++;
                    } else {
                        const dow = dt.getDay();
                        if (dow !== 0 && dow !== 6) businessDays++;
                    }
                }
                return horasDiarias * businessDays;
            } catch (e) { return providedMeta || 176; }
        });

        const cfg = {

        const labels = Object.keys(counts);
        const data = Object.values(counts);

        // Cores dos tipos - paleta profissional com alto contraste
        const defaultColors = [
            '#2563eb', // Azul
            '#7c3aed', // Roxo
            '#0891b2', // Ciano
            '#059669', // Verde
            '#d97706', // Laranja
            '#dc2626', // Vermelho
            '#db2777', // Rosa
            '#6366f1', // Índigo
            '#0d9488', // Teal
            '#ea580c'  // Laranja escuro
        ];
        
        const colors = labels.map((tipo, index) => {
            const tipoInfo = tiposEvento.find(t => t.id === tipo);
            return tipoInfo?.cor || defaultColors[index % defaultColors.length];
        });

        return this.createChart(canvasId, {
            type: 'doughnut',
            data: {
                labels: labels.map(l => {
                    const tipo = tiposEvento.find(t => t.id === l);
                    return tipo?.nome || l;
                }),
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 4,
                    borderColor: '#ffffff',
                    hoverOffset: 8,
                    hoverBorderWidth: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
        };

        // Add fallback 'Meta Mensal' dataset (dashed red). If an annotation plugin exists, try to add it too.
        try {
            // add second dataset for monthly target values
            cfg.data.datasets.push({
                label: 'Meta Mensal',
                data: monthlyTargets.map(v => Number(v.toFixed(1))),
                borderColor: '#ef4444',
                borderDash: [6,6],
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
                tension: 0,
                yAxisID: 'y'
            });

            // Attempt to add an annotation if plugin is available
            try {
                if (typeof Chart !== 'undefined' && Chart.registry && typeof Chart.registry.get === 'function' && Chart.registry.get('annotation')) {
                    // annotation plugin detected — add a simple horizontal annotation for the last computed target
                    const lastTarget = monthlyTargets.length ? monthlyTargets[monthlyTargets.length - 1] : (providedMeta || 176);
                    cfg.options.plugins.annotation = cfg.options.plugins.annotation || {};
                    cfg.options.plugins.annotation.annotations = cfg.options.plugins.annotation.annotations || {};
                    cfg.options.plugins.annotation.annotations.metaMensal = {
                        type: 'line',
                        yMin: lastTarget,
                        yMax: lastTarget,
                        borderColor: '#ef4444',
                        borderDash: [6,6],
                        borderWidth: 2,
                        label: {
                            content: 'Meta Mensal',
                            enabled: true,
                            position: 'end'
                        }
                    };
                }
            } catch (e) { /* ignore annotation errors */ }
        } catch (e) { console.warn('Erro ao adicionar meta mensal ao gráfico:', e); }

        return this.createChart(canvasId, cfg);
    /**
     * Cria gráfico de heatmap semanal
     */
    createWeeklyHeatmap(canvasId, registros) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        // Agrupar por dia da semana
        const byWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

        registros.forEach(reg => {
            const date = new Date(reg.data + 'T00:00:00');
            const weekday = date.getDay();
            
            const entrada = DateUtils.timeToMinutes(reg.entrada);
            const saida = DateUtils.timeToMinutes(reg.saida);
            const almoco = reg.saidaAlmoco && reg.retornoAlmoco
                ? DateUtils.timeToMinutes(reg.retornoAlmoco) - DateUtils.timeToMinutes(reg.saidaAlmoco)
                : 0;
            
            byWeekday[weekday] += (saida - entrada - almoco) / 60;
            counts[weekday]++;
        });

        const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const data = Object.keys(byWeekday).map(day => 
            counts[day] > 0 ? (byWeekday[day] / counts[day]).toFixed(1) : 0
        );

        return this.createChart(canvasId, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Média de Horas',
                    data: data,
                    backgroundColor: [
                        '#94a3b8',  // Domingo - cinza mais claro
                        '#2563eb',  // Segunda - azul
                        '#7c3aed',  // Terça - roxo
                        '#0891b2',  // Quarta - ciano
                        '#059669',  // Quinta - verde
                        '#d97706',  // Sexta - laranja
                        '#94a3b8'   // Sábado - cinza mais claro
                    ],
                    borderWidth: 0,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Média de Horas por Dia da Semana'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Horas'
                        }
                    }
                }
            }
        });
    },

    /**
     * Cria gráfico genérico
     */
    createChart(canvasId, config) {
        // Destruir instância anterior se existir
        if (this.instances[canvasId]) {
            this.instances[canvasId].destroy();
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        this.instances[canvasId] = new Chart(ctx, config);
        
        return this.instances[canvasId];
    },

    /**
     * Atualiza dados de um gráfico
     */
    updateChart(canvasId, newData) {
        const chart = this.instances[canvasId];
        if (!chart) return;

        chart.data = newData;
        chart.update();
    },

    /**
     * Destrói um gráfico
     */
    destroyChart(canvasId) {
        const chart = this.instances[canvasId];
        if (chart) {
            chart.destroy();
            delete this.instances[canvasId];
        }
    },

    /**
     * Destrói todos os gráficos
     */
    destroyAll() {
        Object.keys(this.instances).forEach(id => {
            this.destroyChart(id);
        });
    },

    /**
     * Exporta gráfico como imagem
     */
    exportAsImage(canvasId, filename) {
        const chart = this.instances[canvasId];
        if (!chart) return;

        // Determine chart title (if any) to compose filename
        let titleText = '';
        try {
            const t = chart.options && chart.options.plugins && chart.options.plugins.title;
            if (t) {
                if (typeof t.text === 'string') titleText = t.text;
                else if (Array.isArray(t.text)) titleText = t.text.join(' ');
                else if (typeof t.text === 'function') {
                    try { titleText = t.text(); } catch(e) { titleText = ''; }
                }
            }
            if (!titleText && chart.data && chart.data.datasets && chart.data.datasets[0]) {
                titleText = chart.data.datasets[0].label || '';
            }
        } catch (e) { titleText = ''; }
        titleText = String(titleText || '').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const defaultName = `grafico${titleText ? '_' + titleText : ''}_${dateStr}.png`;

        const outName = filename || defaultName;

        // Temporarily ensure title is displayed for export
        let prevTitleDisplay;
        try {
            if (chart.options && chart.options.plugins && chart.options.plugins.title) {
                prevTitleDisplay = chart.options.plugins.title.display;
                chart.options.plugins.title.display = true;
                try { chart.update(); } catch(e) { /* ignore */ }
            }
        } catch (e) { /* ignore */ }

        const url = chart.toBase64Image();

        // restore title display state
        try {
            if (typeof prevTitleDisplay !== 'undefined' && chart.options && chart.options.plugins && chart.options.plugins.title) {
                chart.options.plugins.title.display = prevTitleDisplay;
                try { chart.update(); } catch(e) { /* ignore */ }
            }
        } catch (e) { /* ignore */ }

        const link = document.createElement('a');
        link.href = url;
        link.download = outName;
        link.click();
    }
};
// Expor globalmente para compatibilidade com outras partes do app
if (typeof window !== 'undefined') {
    window.Charts = Charts;
}
