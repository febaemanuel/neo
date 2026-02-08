/**
 * Phototherapy Tool Module — AAP 2004 Guidelines
 * Evaluates need for phototherapy and exchange transfusion for RN >= 35 weeks.
 * Uses scatter chart with numeric x-axis for EXACT patient point positioning.
 *
 * AAP 2004 Risk Factors:
 * - Isoimmune hemolytic disease, G6PD deficiency, asphyxia,
 *   significant lethargy, temperature instability, sepsis,
 *   acidosis (pH < 7.15), albumin < 3.0 g/dL
 */
const PhototherapyTool = (() => {
    let chart = null;
    let currentChartMode = 'photo';
    let lastEval = null;

    function init() {
        document.getElementById('photo-calculate').addEventListener('click', evaluate);

        document.querySelectorAll('#tool-phototherapy .chart-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#tool-phototherapy .chart-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentChartMode = tab.dataset.chart;
                if (lastEval) {
                    drawChart(lastEval.hours, lastEval.bt, lastEval.result);
                } else {
                    drawChart();
                }
            });
        });

        drawChart();
    }

    function hasRiskFactors() {
        return document.getElementById('photo-risk-isoimmune').checked ||
               document.getElementById('photo-risk-g6pd').checked ||
               document.getElementById('photo-risk-asphyxia').checked ||
               document.getElementById('photo-risk-lethargy').checked ||
               document.getElementById('photo-risk-temp').checked ||
               document.getElementById('photo-risk-sepsis').checked ||
               document.getElementById('photo-risk-acidosis').checked ||
               document.getElementById('photo-risk-albumin').checked;
    }

    function getCheckedRiskFactors() {
        const factors = [];
        if (document.getElementById('photo-risk-isoimmune').checked) factors.push('Doença hemolítica isoimune');
        if (document.getElementById('photo-risk-g6pd').checked) factors.push('Deficiência de G6PD');
        if (document.getElementById('photo-risk-asphyxia').checked) factors.push('Asfixia perinatal');
        if (document.getElementById('photo-risk-lethargy').checked) factors.push('Letargia significativa');
        if (document.getElementById('photo-risk-temp').checked) factors.push('Instabilidade térmica');
        if (document.getElementById('photo-risk-sepsis').checked) factors.push('Sepse');
        if (document.getElementById('photo-risk-acidosis').checked) factors.push('Acidose (pH < 7,15)');
        if (document.getElementById('photo-risk-albumin').checked) factors.push('Albumina < 3,0 g/dL');
        return factors;
    }

    function evaluate() {
        const gaWeeks = parseInt(document.getElementById('photo-ig').value);
        const hours = parseFloat(document.getElementById('photo-hours').value);
        const bt = parseFloat(document.getElementById('photo-bt').value);
        const riskFactors = hasRiskFactors();

        if (isNaN(hours) || isNaN(bt)) {
            alert('Preencha as horas de vida e a bilirrubina total.');
            return;
        }
        if (hours < 0 || hours > 168) {
            alert('Horas de vida devem estar entre 0 e 168.');
            return;
        }

        const result = evaluateAAP2004(gaWeeks, hours, bt, riskFactors);
        const checkedFactors = getCheckedRiskFactors();

        const resultBox = document.getElementById('photo-result');
        resultBox.className = 'result-box';

        if (result.severity === 'exchange') {
            resultBox.classList.add('needs-exchange');
        } else if (result.severity === 'photo') {
            resultBox.classList.add('needs-photo');
        } else {
            resultBox.classList.add('no-photo');
        }

        const severityColors = { exchange: '#e74c3c', photo: '#f39c12', none: '#27ae60' };

        let html = `
            <div class="classification" style="color: ${severityColors[result.severity]}">
                ${result.indication}
            </div>
            <p style="margin-top: 0.5rem; font-size: 0.88rem;">
                <strong>Categoria:</strong> ${result.categoryLabel}
            </p>
            <p class="percentile-info">
                BT: ${bt} mg/dL às ${hours}h de vida<br>
                Limiar de fototerapia: ${result.photoThreshold} mg/dL<br>
                Limiar de exsanguíneo: ${result.exchangeThreshold} mg/dL
            </p>
        `;

        if (checkedFactors.length > 0) {
            html += `<p style="margin-top: 0.4rem; font-size: 0.82rem; color: #7f8c8d;">
                <strong>Fatores de risco:</strong> ${checkedFactors.join(', ')}
            </p>`;
        }

        document.getElementById('photo-result-content').innerHTML = html;

        lastEval = { hours, bt, result };
        drawChart(hours, bt, result);
    }

    function curveToXY(curve) {
        return curve.map(p => ({ x: p[0], y: p[1] }));
    }

    function drawChart(patientHours, patientBT, patientResult) {
        const ctx = document.getElementById('photo-chart').getContext('2d');
        if (chart) chart.destroy();

        const curveSet = currentChartMode === 'photo' ? AAP_2004.phototherapy : AAP_2004.exchange;
        const title = currentChartMode === 'photo'
            ? 'Indicação de Fototerapia — AAP 2004'
            : 'Indicação de Exsanguíneotransfusão — AAP 2004';

        const datasets = [
            {
                label: 'Menor risco (>=38 sem, sem FR)',
                data: curveToXY(curveSet.lowerRisk),
                borderColor: '#27ae60',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                fill: false
            },
            {
                label: 'Risco médio (>=38+FR ou 35-37 sem)',
                data: curveToXY(curveSet.mediumRisk),
                borderColor: '#f39c12',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                fill: false
            },
            {
                label: 'Maior risco (35-37 sem + FR)',
                data: curveToXY(curveSet.higherRisk),
                borderColor: '#e74c3c',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                fill: false
            }
        ];

        // Patient point at EXACT hour
        if (patientHours !== undefined && patientBT !== undefined) {
            const color = patientResult
                ? (patientResult.severity === 'exchange' ? '#e74c3c' : patientResult.severity === 'photo' ? '#f39c12' : '#27ae60')
                : '#8e44ad';

            datasets.push({
                label: 'Paciente',
                data: [{ x: patientHours, y: patientBT }],
                borderColor: color,
                backgroundColor: color,
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
                    title: { display: true, text: title, font: { size: 13 } },
                    legend: { position: 'bottom', labels: { font: { size: 10 }, usePointStyle: true } },
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
                        max: 172,
                        ticks: { stepSize: 12 }
                    },
                    y: {
                        title: { display: true, text: 'Bilirrubina Total Sérica (mg/dL)' },
                        min: 0,
                        max: currentChartMode === 'exchange' ? 30 : 25
                    }
                }
            }
        });
    }

    return { init };
})();
