/**
 * GIG/PIG Calculator Module
 * Uses Fenton 2013 for preterm (<37 weeks) and INTERGROWTH-21st for term (>=37 weeks)
 */
const GigPigCalculator = (() => {
    let chart = null;
    let currentChartType = 'weight';

    function init() {
        document.getElementById('gig-calculate').addEventListener('click', calculate);

        document.querySelectorAll('#tool-gig-pig .chart-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#tool-gig-pig .chart-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentChartType = tab.dataset.chart;
                const weeks = parseInt(document.getElementById('gig-ig-weeks').value);
                if (!isNaN(weeks)) {
                    drawChart(weeks);
                }
            });
        });

        drawChart(30); // default chart
    }

    function getDataSource(gaWeeks) {
        return gaWeeks < 37 ? 'fenton' : 'intergrowth';
    }

    function getCurveData(gaWeeks, sex, metric) {
        const source = getDataSource(gaWeeks);
        if (source === 'fenton') {
            return FENTON_2013[sex][metric];
        } else {
            return INTERGROWTH21[sex][metric];
        }
    }

    function interpolatePercentile(data, gaDecimal, percentileKey) {
        const gaArr = data.ga;
        const pArr = data[percentileKey];

        if (gaDecimal <= gaArr[0]) return pArr[0];
        if (gaDecimal >= gaArr[gaArr.length - 1]) return pArr[pArr.length - 1];

        for (let i = 0; i < gaArr.length - 1; i++) {
            if (gaDecimal >= gaArr[i] && gaDecimal <= gaArr[i + 1]) {
                const ratio = (gaDecimal - gaArr[i]) / (gaArr[i + 1] - gaArr[i]);
                return pArr[i] + ratio * (pArr[i + 1] - pArr[i]);
            }
        }
        return null;
    }

    function classifyValue(value, data, gaDecimal) {
        const p10 = interpolatePercentile(data, gaDecimal, 'p10');
        const p90 = interpolatePercentile(data, gaDecimal, 'p90');
        const p3 = interpolatePercentile(data, gaDecimal, 'p3');
        const p50 = interpolatePercentile(data, gaDecimal, 'p50');
        const p97 = interpolatePercentile(data, gaDecimal, 'p97');

        let classification, cssClass;
        if (value < p10) {
            classification = 'PIG (Pequeno para Idade Gestacional)';
            cssClass = 'pig';
        } else if (value > p90) {
            classification = 'GIG (Grande para Idade Gestacional)';
            cssClass = 'gig';
        } else {
            classification = 'AIG (Adequado para Idade Gestacional)';
            cssClass = 'aig';
        }

        // Estimate approximate percentile
        let approxPercentile;
        if (value <= p3) approxPercentile = '< 3';
        else if (value <= p10) approxPercentile = '3 - 10';
        else if (value <= p50) approxPercentile = '10 - 50';
        else if (value <= p90) approxPercentile = '50 - 90';
        else if (value <= p97) approxPercentile = '90 - 97';
        else approxPercentile = '> 97';

        return { classification, cssClass, approxPercentile, p3, p10, p50, p90, p97 };
    }

    function calculate() {
        const weeks = parseInt(document.getElementById('gig-ig-weeks').value);
        const days = parseInt(document.getElementById('gig-ig-days').value) || 0;
        const sex = document.getElementById('gig-sex').value;
        const weight = parseFloat(document.getElementById('gig-weight').value);
        const length = parseFloat(document.getElementById('gig-length').value);
        const hc = parseFloat(document.getElementById('gig-hc').value);

        if (isNaN(weeks) || isNaN(weight)) {
            alert('Preencha a idade gestacional (semanas) e o peso.');
            return;
        }

        if (weeks < 22 || weeks > 42) {
            alert('Idade gestacional deve estar entre 22 e 42 semanas.');
            return;
        }

        const gaDecimal = weeks + days / 7;
        const source = getDataSource(weeks);
        const sourceName = source === 'fenton' ? 'Fenton 2013 (Pré-termo)' : 'INTERGROWTH-21st (Termo)';

        const weightData = getCurveData(weeks, sex, 'weight');
        const weightResult = classifyValue(weight, weightData, gaDecimal);

        let html = `
            <div class="classification ${weightResult.cssClass}">${weightResult.classification}</div>
            <div class="percentile-info">
                <strong>Peso:</strong> ${weight}g — Percentil aproximado: ${weightResult.approxPercentile}
            </div>
        `;

        if (!isNaN(length) && length > 0) {
            const lengthData = getCurveData(weeks, sex, 'length');
            const lengthResult = classifyValue(length, lengthData, gaDecimal);
            html += `
                <div class="percentile-info">
                    <strong>Comprimento:</strong> ${length}cm — Percentil: ${lengthResult.approxPercentile} (${lengthResult.classification})
                </div>
            `;
        }

        if (!isNaN(hc) && hc > 0) {
            const hcData = getCurveData(weeks, sex, 'hc');
            const hcResult = classifyValue(hc, hcData, gaDecimal);
            html += `
                <div class="percentile-info">
                    <strong>Per. Cefálico:</strong> ${hc}cm — Percentil: ${hcResult.approxPercentile} (${hcResult.classification})
                </div>
            `;
        }

        const resultBox = document.getElementById('gig-result');
        document.getElementById('gig-result-content').innerHTML = html;
        document.getElementById('gig-curve-ref').textContent = `Curva de referência: ${sourceName}`;
        resultBox.classList.remove('hidden');

        drawChart(weeks, sex, gaDecimal, weight, length, hc);
    }

    function drawChart(gaWeeks, sex, gaDecimal, weight, length, hc) {
        sex = sex || document.getElementById('gig-sex').value || 'male';

        const metricMap = { weight: 'weight', length: 'length', hc: 'hc' };
        const metric = metricMap[currentChartType];
        const unitMap = { weight: 'g', length: 'cm', hc: 'cm' };
        const labelMap = { weight: 'Peso', length: 'Comprimento', hc: 'Perímetro Cefálico' };
        const unit = unitMap[currentChartType];
        const label = labelMap[currentChartType];

        const source = getDataSource(gaWeeks || 30);
        const data = source === 'fenton' ? FENTON_2013[sex][metric] : INTERGROWTH21[sex][metric];

        const labels = data.ga.map(g => g + ' sem');

        const datasets = [
            { label: 'P3', data: data.p3, borderColor: '#e74c3c', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false },
            { label: 'P10', data: data.p10, borderColor: '#e67e22', borderWidth: 1.5, borderDash: [3, 3], pointRadius: 0, fill: false },
            { label: 'P50', data: data.p50, borderColor: '#2980b9', borderWidth: 2, pointRadius: 0, fill: false },
            { label: 'P90', data: data.p90, borderColor: '#e67e22', borderWidth: 1.5, borderDash: [3, 3], pointRadius: 0, fill: false },
            { label: 'P97', data: data.p97, borderColor: '#e74c3c', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false },
        ];

        // Add patient point if available
        let pointValue = null;
        if (currentChartType === 'weight' && weight) pointValue = weight;
        else if (currentChartType === 'length' && length) pointValue = length;
        else if (currentChartType === 'hc' && hc) pointValue = hc;

        if (pointValue && gaDecimal) {
            const pointData = data.ga.map(() => null);
            // Find closest index
            let closestIdx = 0;
            let closestDiff = Infinity;
            data.ga.forEach((g, i) => {
                const diff = Math.abs(g - gaDecimal);
                if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
            });
            pointData[closestIdx] = pointValue;

            datasets.push({
                label: 'Paciente',
                data: pointData,
                borderColor: '#8e44ad',
                backgroundColor: '#8e44ad',
                pointRadius: 8,
                pointStyle: 'crossRot',
                pointBorderWidth: 3,
                showLine: false
            });
        }

        const ctx = document.getElementById('gig-chart').getContext('2d');
        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${label} (${unit}) — ${source === 'fenton' ? 'Fenton 2013' : 'INTERGROWTH-21st'} — ${sex === 'male' ? 'Masculino' : 'Feminino'}`,
                        font: { size: 13 }
                    },
                    legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } }
                },
                scales: {
                    x: { title: { display: true, text: 'Idade Gestacional' } },
                    y: { title: { display: true, text: `${label} (${unit})` } }
                }
            }
        });
    }

    return { init };
})();
