/**
 * Bhutani Nomogram Module
 * Plots hour-specific bilirubin risk zones and classifies patient risk
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

    function drawChart(patientHours, patientBT, patientResult) {
        const ctx = document.getElementById('bhutani-chart').getContext('2d');
        if (chart) chart.destroy();

        // Build datasets from curves
        const hours = BHUTANI_DATA.p95.map(p => p[0]);

        const p40Values = BHUTANI_DATA.p40.map(p => p[1]);
        const p75Values = BHUTANI_DATA.p75.map(p => p[1]);
        const p95Values = BHUTANI_DATA.p95.map(p => p[1]);

        // Create a max line for visual fill
        const maxValues = p95Values.map(v => v + 3);

        const datasets = [
            {
                label: 'Baixo Risco (< P40)',
                data: p40Values,
                borderColor: '#27ae60',
                backgroundColor: 'rgba(39, 174, 96, 0.1)',
                borderWidth: 2,
                fill: 'origin',
                pointRadius: 0,
                tension: 0.3
            },
            {
                label: 'Risco Interm. Baixo (P40-P75)',
                data: p75Values,
                borderColor: '#d4ac0d',
                backgroundColor: 'rgba(241, 196, 15, 0.15)',
                borderWidth: 2,
                fill: '-1',
                pointRadius: 0,
                tension: 0.3
            },
            {
                label: 'Risco Interm. Alto (P75-P95)',
                data: p95Values,
                borderColor: '#e67e22',
                backgroundColor: 'rgba(230, 126, 34, 0.15)',
                borderWidth: 2,
                fill: '-1',
                pointRadius: 0,
                tension: 0.3
            },
            {
                label: 'Alto Risco (≥ P95)',
                data: maxValues,
                borderColor: 'transparent',
                backgroundColor: 'rgba(231, 76, 60, 0.12)',
                borderWidth: 0,
                fill: '-1',
                pointRadius: 0
            }
        ];

        // Add patient point
        if (patientHours !== undefined && patientBT !== undefined && patientResult) {
            const pointData = hours.map(() => null);
            let closestIdx = 0;
            let closestDiff = Infinity;
            hours.forEach((h, i) => {
                const diff = Math.abs(h - patientHours);
                if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
            });
            pointData[closestIdx] = patientBT;

            datasets.push({
                label: `Paciente (${patientResult.label})`,
                data: pointData,
                borderColor: patientResult.color,
                backgroundColor: patientResult.color,
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
                    title: {
                        display: true,
                        text: 'Nomograma de Bhutani — Zonas de Risco por Bilirrubina',
                        font: { size: 13 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 10 }, usePointStyle: true }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Horas de Vida' } },
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
