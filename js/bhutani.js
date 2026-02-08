/**
 * Bhutani Nomogram Module
 * Plots hour-specific bilirubin risk zones and classifies patient risk.
 * Uses scatter chart with numeric x-axis for EXACT patient point positioning.
 */
const BhutaniNomogram = (() => {
    let chart = null;

    function init() {
        document.getElementById('bhutani-calculate').addEventListener('click', evaluate);
        drawChart();
    }

    function evaluate() {
        const hours = parseFloat(document.getElementById('bhutani-hours').value);
        const bt = parseFloat(document.getElementById('bhutani-bt').value);

        if (isNaN(hours) || isNaN(bt)) {
            alert('Preencha as horas de vida e a bilirrubina total.');
            return;
        }
        if (hours < 0 || hours > 144) {
            alert('Horas de vida devem estar entre 0 e 144.');
            return;
        }

        const result = getBhutaniZone(hours, bt);

        const resultBox = document.getElementById('bhutani-result');
        resultBox.className = 'result-box';

        const zoneClassMap = {
            'high': 'zone-high',
            'high-int': 'zone-high-int',
            'low-int': 'zone-low-int',
            'low': 'zone-low'
        };
        resultBox.classList.add(zoneClassMap[result.zone]);

        document.getElementById('bhutani-result-content').innerHTML = `
            <div class="classification" style="color: ${result.color}">${result.label}</div>
            <p style="margin-top: 0.5rem; font-size: 0.9rem;">${result.description}</p>
            <p class="percentile-info" style="margin-top: 0.5rem;">
                BT: ${bt} mg/dL às ${hours}h de vida
            </p>
        `;

        drawChart(hours, bt, result);
    }

    function curveToXY(curve) {
        return curve.map(p => ({ x: p[0], y: p[1] }));
    }

    function drawChart(patientHours, patientBT, patientResult) {
        const ctx = document.getElementById('bhutani-chart').getContext('2d');
        if (chart) chart.destroy();

        const p40XY = curveToXY(BHUTANI_DATA.p40);
        const p75XY = curveToXY(BHUTANI_DATA.p75);
        const p95XY = curveToXY(BHUTANI_DATA.p95);
        const maxXY = BHUTANI_DATA.p95.map(p => ({ x: p[0], y: p[1] + 3 }));

        const datasets = [
            {
                label: 'Baixo Risco (< P40)',
                data: p40XY,
                borderColor: '#27ae60',
                backgroundColor: 'rgba(39, 174, 96, 0.1)',
                borderWidth: 2,
                fill: 'origin',
                pointRadius: 0,
                tension: 0.3
            },
            {
                label: 'Risco Interm. Baixo (P40-P75)',
                data: p75XY,
                borderColor: '#d4ac0d',
                backgroundColor: 'rgba(241, 196, 15, 0.15)',
                borderWidth: 2,
                fill: '-1',
                pointRadius: 0,
                tension: 0.3
            },
            {
                label: 'Risco Interm. Alto (P75-P95)',
                data: p95XY,
                borderColor: '#e67e22',
                backgroundColor: 'rgba(230, 126, 34, 0.15)',
                borderWidth: 2,
                fill: '-1',
                pointRadius: 0,
                tension: 0.3
            },
            {
                label: 'Alto Risco (>= P95)',
                data: maxXY,
                borderColor: 'transparent',
                backgroundColor: 'rgba(231, 76, 60, 0.12)',
                borderWidth: 0,
                fill: '-1',
                pointRadius: 0
            }
        ];

        // Patient point at EXACT hour (not snapped)
        if (patientHours !== undefined && patientBT !== undefined && patientResult) {
            datasets.push({
                label: `Paciente (${patientResult.label})`,
                data: [{ x: patientHours, y: patientBT }],
                borderColor: patientResult.color,
                backgroundColor: patientResult.color,
                pointRadius: 9,
                pointStyle: 'crossRot',
                pointBorderWidth: 3,
                showLine: false
            });
        }

        chart = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                showLine: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Nomograma de Bhutani — Zonas de Risco por Bilirrubina',
                        font: { size: 13 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 10 }, usePointStyle: true }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} mg/dL (${ctx.parsed.x}h)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Horas de Vida' },
                        min: 0,
                        max: 148,
                        ticks: { stepSize: 12 }
                    },
                    y: {
                        title: { display: true, text: 'Bilirrubina Total (mg/dL)' },
                        min: 0,
                        max: 22
                    }
                }
            }
        });
    }

    return { init };
})();
