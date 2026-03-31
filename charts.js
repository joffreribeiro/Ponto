/**
 * charts.js - Sistema de gráficos e analytics
 * Visualização de dados com Chart.js
 */

const Charts = {
    instances: {},

    /**
     * Inicializa biblioteca Chart.js
     */
    async init() {
        // Lazy-load Chart.js sob demanda
        if (typeof Chart === 'undefined' && typeof window._loadChartJS === 'function') {
            await window._loadChartJS();
        }
        if (typeof Chart === 'undefined') {
            console.warn('[Charts] Chart.js não carregado');
            return false;
        }
        
        // Configuração global
        Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif';
        Chart.defaults.color = '#1f2933';
        return true;
    },

    /**
     * Cria gráfico de horas trabalhadas (linha)
     */
    createHoursChart(canvasId, registros) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        // Agrupar por mês
        const byMonth = {};
        registros.forEach(reg => {
            const month = reg.data.substring(0, 7); // YYYY-MM
            if (!byMonth[month]) byMonth[month] = 0;
            
            // Calcular horas do dia
            const entrada = DateUtils.timeToMinutes(reg.entrada);
            const saida = DateUtils.timeToMinutes(reg.saida);
            const almoco = reg.saidaAlmoco && reg.retornoAlmoco
                ? DateUtils.timeToMinutes(reg.retornoAlmoco) - DateUtils.timeToMinutes(reg.saidaAlmoco)
                : 0;
            
            byMonth[month] += (saida - entrada - almoco) / 60; // converter para horas
        });

        const labels = Object.keys(byMonth).sort();
        const data = labels.map(m => byMonth[m].toFixed(1));

        return this.createChart(canvasId, {
            type: 'line',
            data: {
                labels: labels.map(m => {
                    const [year, month] = m.split('-');
                    return `${month}/${year}`;
                }),
                datasets: [{
                    label: 'Horas Trabalhadas',
                    data: data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Horas Trabalhadas por Mês'
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
     * Cria gráfico de saldo (barras)
     */
    createBalanceChart(canvasId, registros, acordos) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        // Calcular saldo por mês
        const byMonth = {};
        registros.forEach(reg => {
            const month = reg.data.substring(0, 7);
            if (!byMonth[month]) byMonth[month] = 0;
            
            // Simplificado - calcular saldo do dia
            const calc = Calculations.calculateDayWithContext(
                registros, [], acordos, reg.data, reg
            );
            byMonth[month] += calc.saldo || 0;
        });

        const labels = Object.keys(byMonth).sort();
        const data = labels.map(m => (byMonth[m] / 60).toFixed(1));

        return this.createChart(canvasId, {
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
        const counts = {};
        eventos.forEach(evt => {
            counts[evt.tipoEvento] = (counts[evt.tipoEvento] || 0) + 1;
        });

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
                    title: {
                        display: true,
                        text: 'Distribuição de Eventos',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 13,
                                weight: '600'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return ` ${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    },

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
    exportAsImage(canvasId, filename = 'grafico.png') {
        const chart = this.instances[canvasId];
        if (!chart) return;

        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
    }
};
