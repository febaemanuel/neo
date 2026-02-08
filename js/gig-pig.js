/**
 * GIG/PIG Calculator Module
 * Uses Fenton 2013 for preterm (<37 weeks) and INTERGROWTH-21st for term (>=37 weeks)
 *
 * IMPORTANT: GIG/PIG/AIG classification applies ONLY to birth weight.
 * Length and head circumference show percentile ranges only.
 */
const GigPigCalculator = (() => {
    let chart = null;
    let currentChartType = 'weight';
    let lastCalcData = null;

    function init() {
        document.getElementById('gig-calculate').addEventListener('click', calculate);

        document.querySelectorAll('#tool-gig-pig .chart-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#tool-gig-pig .chart-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentChartType = tab.dataset.chart;
                if (lastCalcData) {
                    drawChart(lastCalcData.gaWeeks, lastCalcData.sex, lastCalcData.gaDecimal,
                              lastCalcData.weight, lastCalcData.length, lastCalcData.hc);
                } else {
                    drawChart(30);
                }
            });
        });

        drawChart(30);
    }

    function getDataSource(gaWeeks) {
        return gaWeeks < 37 ? 'fenton' : 'intergrowth';
    }

    function getCurveData(gaWeeks, sex, metric) {
        const source = getDataSource(gaWeeks);
        return source === 'fenton' ? FENTON_2013[sex][metric] : INTERGROWTH21[sex][metric];
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

    function getPercentileRange(value, data, gaDecimal) {
        const p3 = interpolatePercentile(data, gaDecimal, 'p3');
        const p10 = interpolatePercentile(data, gaDecimal, 'p10');
        const p50 = interpolatePercentile(data, gaDecimal, 'p50');
        const p90 = interpolatePercentile(data, gaDecimal, 'p90');
        const p97 = interpolatePercentile(data, gaDecimal, 'p97');

        let approxPercentile;
        if (value <= p3) approxPercentile = '< 3';
        else if (value <= p10) approxPercentile = '3 - 10';
        else if (value <= p50) approxPercentile = '10 - 50';
        else if (value <= p90) approxPercentile = '50 - 90';
        else if (value <= p97) approxPercentile = '90 - 97';
        else approxPercentile = '> 97';

        return { approxPercentile, p3, p10, p50, p90, p97 };
    }

    function classifyWeight(weight, data, gaDecimal) {
        const pData = getPercentileRange(weight, data, gaDecimal);
        const p10 = pData.p10;
        const p90 = pData.p90;

        let classification, cssClass;
        if (weight < p10) {
            classification = 'PIG (Pequeno para Idade Gestacional)';
            cssClass = 'pig';
        } else if (weight > p90) {
            classification = 'GIG (Grande para Idade Gestacional)';
            cssClass = 'gig';
        } else {
            classification = 'AIG (Adequado para Idade Gestacional)';
            cssClass = 'aig';
        }

        return { classification, cssClass, ...pData };
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

        // WEIGHT — only metric that gets GIG/PIG/AIG classification
        const weightData = getCurveData(weeks, sex, 'weight');
        const weightResult = classifyWeight(weight, weightData, gaDecimal);

        let html = `
            <div class="classification ${weightResult.cssClass}">${weightResult.classification}</div>
            <div class="percentile-info">
                <strong>Peso:</strong> ${weight}g — Percentil aproximado: ${weightResult.approxPercentile}
            </div>
        `;

        // LENGTH — percentile only, NO GIG/PIG/AIG
        if (!isNaN(length) && length > 0) {
            const lengthData = getCurveData(weeks, sex, 'length');
            const lengthResult = getPercentileRange(length, lengthData, gaDecimal);
            html += `
                <div class="percentile-info">
                    <strong>Comprimento:</strong> ${length}cm — Percentil: ${lengthResult.approxPercentile}
                </div>
            `;
        }

        // HEAD CIRCUMFERENCE — percentile only, NO GIG/PIG/AIG
        if (!isNaN(hc) && hc > 0) {
            const hcData = getCurveData(weeks, sex, 'hc');
            const hcResult = getPercentileRange(hc, hcData, gaDecimal);
            html += `
                <div class="percentile-info">
                    <strong>Per. Cefálico:</strong> ${hc}cm — Percentil: ${hcResult.approxPercentile}
                </div>
            `;
        }

        const resultBox = document.getElementById('gig-result');
        document.getElementById('gig-result-content').innerHTML = html;
        document.getElementById('gig-curve-ref').textContent = `Curva de referência: ${sourceName}`;
        resultBox.classList.remove('hidden');

        lastCalcData = { gaWeeks: weeks, sex, gaDecimal, weight, length, hc };
        drawChart(weeks, sex, gaDecimal, weight, length, hc);
    }

    function drawChart(gaWeeks, sex, gaDecimal, weight, length, hc) {
        sex = sex || document.getElementById('gig-sex').value || 'male';

        const metric = currentChartType;
        const unitMap = { weight: 'g', length: 'cm', hc: 'cm' };
        const labelMap = { weight: 'Peso', length: 'Comprimento', hc: 'Perímetro Cefálico' };
        const unit = unitMap[metric];
        const label = labelMap[metric];

        const source = getDataSource(gaWeeks || 30);
        const data = source === 'fenton' ? FENTON_2013[sex][metric] : INTERGROWTH21[sex][metric];

        // Use numeric values for x-axis so we can plot exact decimal GA
        const xValues = data.ga;

        const datasets = [
            { label: 'P3', data: xValues.map((g, i) => ({ x: g, y: data.p3[i] })), borderColor: '#e74c3c', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false },
            { label: 'P10', data: xValues.map((g, i) => ({ x: g, y: data.p10[i] })), borderColor: '#e67e22', borderWidth: 1.5, borderDash: [3, 3], pointRadius: 0, fill: false },
            { label: 'P50', data: xValues.map((g, i) => ({ x: g, y: data.p50[i] })), borderColor: '#2980b9', borderWidth: 2.5, pointRadius: 0, fill: false },
            { label: 'P90', data: xValues.map((g, i) => ({ x: g, y: data.p90[i] })), borderColor: '#e67e22', borderWidth: 1.5, borderDash: [3, 3], pointRadius: 0, fill: false },
            { label: 'P97', data: xValues.map((g, i) => ({ x: g, y: data.p97[i] })), borderColor: '#e74c3c', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false },
        ];

        // Patient point at EXACT position (interpolated GA)
        let pointValue = null;
        if (metric === 'weight' && weight) pointValue = weight;
        else if (metric === 'length' && length) pointValue = length;
        else if (metric === 'hc' && hc) pointValue = hc;

        if (pointValue && gaDecimal) {
            datasets.push({
                label: 'Paciente',
                data: [{ x: gaDecimal, y: pointValue }],
                borderColor: '#8e44ad',
                backgroundColor: '#8e44ad',
                pointRadius: 9,
                pointStyle: 'crossRot',
                pointBorderWidth: 3,
                showLine: false
            });
        }

        const ctx = document.getElementById('gig-chart').getContext('2d');
        if (chart) chart.destroy();

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
                        text: `${label} (${unit}) — ${source === 'fenton' ? 'Fenton 2013' : 'INTERGROWTH-21st'} — ${sex === 'male' ? 'Masculino' : 'Feminino'}`,
                        font: { size: 13 }
                    },
                    legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return `${ctx.dataset.label}: ${ctx.parsed.y} ${unit} (${ctx.parsed.x.toFixed(1)} sem)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Idade Gestacional (semanas)' },
                        min: xValues[0],
                        max: xValues[xValues.length - 1],
                        ticks: { stepSize: 1 }
                    },
                    y: { title: { display: true, text: `${label} (${unit})` } }
                },
                elements: {
                    line: { tension: 0.3 }
                }
            }
        });
    }

    return { init };
})();
