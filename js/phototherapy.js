/**
 * Phototherapy Tool Module — AAP 2004 Guidelines
 * Evaluates need for phototherapy and exchange transfusion for RN >= 35 weeks
 */
const PhototherapyTool = (() => {
    let chart = null;
    let currentChartMode = 'photo'; // 'photo' or 'exchange'

    function init() {
        document.getElementById('photo-calculate').addEventListener('click', evaluate);

        document.querySelectorAll('#tool-phototherapy .chart-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#tool-phototherapy .chart-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentChartMode = tab.dataset.chart;
                drawChart();
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
        if (document.getElementById('photo-risk-albumin').checked) factors.push('Albumina < 3.0 g/dL');
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

        drawChart(hours, bt, result);
    }

    function drawChart(patientHours, patientBT, patientResult) {
        const ctx = document.getElementById('photo-chart').getContext('2d');
        if (chart) chart.destroy();

        const curveSet = currentChartMode === 'photo' ? AAP_2004.phototherapy : AAP_2004.exchange;
        const title = currentChartMode === 'photo'
            ? 'Indicação de Fototerapia — AAP 2004'
            : 'Indicação de Exsanguíneotransfusão — AAP 2004';

        const hours = curveSet.lowerRisk.map(p => p[0]);

        const datasets = [
            {
                label: 'Menor risco (≥38 sem, sem FR)',
                data: curveSet.lowerRisk.map(p => p[1]),
                borderColor: '#27ae60',
                backgroundColor: 'rgba(39, 174, 96, 0.05)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                fill: false
            },
            {
                label: 'Risco médio (≥38+FR ou 35-37 sem)',
                data: curveSet.mediumRisk.map(p => p[1]),
                borderColor: '#f39c12',
                backgroundColor: 'rgba(243, 156, 18, 0.05)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                fill: false
            },
            {
                label: 'Maior risco (35-37 sem + FR)',
                data: curveSet.higherRisk.map(p => p[1]),
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.05)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                fill: false
            }
        ];

        // Add patient point
        if (patientHours !== undefined && patientBT !== undefined) {
            const pointData = hours.map(() => null);
            let closestIdx = 0;
            let closestDiff = Infinity;
            hours.forEach((h, i) => {
                const diff = Math.abs(h - patientHours);
                if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
            });
            pointData[closestIdx] = patientBT;

            const color = patientResult
                ? (patientResult.severity === 'exchange' ? '#e74c3c' : patientResult.severity === 'photo' ? '#f39c12' : '#27ae60')
                : '#8e44ad';

            datasets.push({
                label: 'Paciente',
                data: pointData,
                borderColor: color,
                backgroundColor: color,
                pointRadius: 8,
                pointStyle: 'crossRot',
                pointBorderWidth: 3,
                showLine: false
            });
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours.map(h => h + 'h'),
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: title, font: { size: 13 } },
                    legend: { position: 'bottom', labels: { font: { size: 10 }, usePointStyle: true } }
                },
                scales: {
                    x: { title: { display: true, text: 'Horas de Vida' } },
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
