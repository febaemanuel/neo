/**
 * Rodwell Index Module — Hematological Scoring System for Neonatal Sepsis
 * Reference: Rodwell RL, Leslie AL, Tudehope DI. Early diagnosis of neonatal sepsis
 * using a hematologic scoring system. J Pediatr 1988;112(5):761-7.
 *
 * DYNAMIC: user inputs real lab values, system auto-calculates each criterion.
 *
 * 7 Criteria:
 * 1. WBC abnormal (age-dependent ranges)
 * 2. Total neutrophil count abnormal
 * 3. Immature neutrophils elevated (>10% of WBC)
 * 4. I/T ratio >= 0.2
 * 5. I/M ratio >= 0.3
 * 6. Degenerative changes in neutrophils
 * 7. Platelets <= 150,000/mm³
 *
 * Score: <= 2 unlikely, 3-4 possible, >= 5 probable
 */
const RodwellIndex = (() => {
    function init() {
        document.getElementById('rodwell-calculate').addEventListener('click', calculate);
    }

    /**
     * WBC normal ranges by age (Rodwell 1988 / Manroe 1979 reference ranges):
     * - At birth (<12h): 5,000 - 25,000
     * - 12-24h: 5,000 - 30,000
     * - >2 days: 5,000 - 21,000
     */
    function isWBCAbnormal(wbc, age) {
        if (age === 'birth') return wbc < 5000 || wbc > 25000;
        if (age === '12-24') return wbc < 5000 || wbc > 30000;
        return wbc < 5000 || wbc > 21000;
    }

    /**
     * Neutrophil normal ranges (Manroe/Monroe reference ranges):
     * - At birth: 1800 - 5400
     * - 12-24h: 7800 - 14500 (peak)
     * - >2 days: 1800 - 5400
     * Abnormal = neutropenia or neutrophilia outside range
     */
    function isNeutrophilAbnormal(neutrophils, age) {
        if (age === '12-24') return neutrophils < 7800 || neutrophils > 14500;
        return neutrophils < 1800 || neutrophils > 5400;
    }

    /**
     * Immature neutrophils elevated: absolute count > 600/mm³
     * OR > 10% of total WBC
     */
    function isImmatureElevated(immature, wbc) {
        if (wbc <= 0) return false;
        return immature > 600 || (immature / wbc) > 0.10;
    }

    function calculate() {
        const age = document.getElementById('rodwell-age').value;
        const wbc = parseFloat(document.getElementById('rodwell-wbc').value);
        const neutrophils = parseFloat(document.getElementById('rodwell-neutrophils').value);
        const immature = parseFloat(document.getElementById('rodwell-immature').value);
        const platelets = parseFloat(document.getElementById('rodwell-platelets').value);
        const hasDegenerative = document.getElementById('rodwell-degenerative').checked;

        if (isNaN(wbc) || isNaN(neutrophils) || isNaN(immature) || isNaN(platelets)) {
            alert('Preencha todos os campos do hemograma.');
            return;
        }

        const matureNeutrophils = neutrophils - immature;
        const itRatio = neutrophils > 0 ? immature / neutrophils : 0;
        const imRatio = matureNeutrophils > 0 ? immature / matureNeutrophils : 0;

        // Evaluate each criterion
        const criteria = [
            { name: 'Leucócitos totais', abnormal: isWBCAbnormal(wbc, age), detail: `${wbc.toLocaleString('pt-BR')}/mm³` },
            { name: 'Neutrófilos totais', abnormal: isNeutrophilAbnormal(neutrophils, age), detail: `${neutrophils.toLocaleString('pt-BR')}/mm³` },
            { name: 'Neutrófilos imaturos', abnormal: isImmatureElevated(immature, wbc), detail: `${immature.toLocaleString('pt-BR')}/mm³` },
            { name: 'Relação I/T', abnormal: itRatio >= 0.2, detail: `${itRatio.toFixed(2)} (limiar: 0,20)` },
            { name: 'Relação I/M', abnormal: imRatio >= 0.3, detail: `${imRatio.toFixed(2)} (limiar: 0,30)` },
            { name: 'Alterações degenerativas', abnormal: hasDegenerative, detail: hasDegenerative ? 'Presente' : 'Ausente' },
            { name: 'Plaquetas', abnormal: platelets <= 150000, detail: `${platelets.toLocaleString('pt-BR')}/mm³` }
        ];

        const total = criteria.filter(c => c.abnormal).length;

        let interpretation, cssClass, color;
        if (total <= 2) {
            interpretation = 'Sepse improvável';
            cssClass = 'sepsis-unlikely';
            color = '#27ae60';
        } else if (total <= 4) {
            interpretation = 'Sepse possível — Investigar';
            cssClass = 'sepsis-possible';
            color = '#f39c12';
        } else {
            interpretation = 'Sepse provável — Iniciar tratamento';
            cssClass = 'sepsis-probable';
            color = '#e74c3c';
        }

        // Build detailed breakdown
        let breakdownHtml = '<table class="score-table" style="margin-top: 0.75rem; font-size: 0.85rem;">';
        breakdownHtml += '<thead><tr><th>#</th><th>Critério</th><th>Valor</th><th>Pts</th></tr></thead><tbody>';
        criteria.forEach((c, i) => {
            const rowStyle = c.abnormal ? 'color: #e74c3c; font-weight: 600;' : '';
            breakdownHtml += `<tr style="${rowStyle}">
                <td>${i + 1}</td>
                <td>${c.name}</td>
                <td>${c.detail}</td>
                <td>${c.abnormal ? '1' : '0'}</td>
            </tr>`;
        });
        breakdownHtml += '</tbody></table>';

        const resultBox = document.getElementById('rodwell-result');
        resultBox.className = 'result-box';
        resultBox.classList.add(cssClass);

        document.getElementById('rodwell-result-content').innerHTML = `
            <div class="rodwell-score-display" style="color: ${color}">${total}/7</div>
            <div class="classification" style="color: ${color}; text-align: center;">${interpretation}</div>
            <p class="percentile-info" style="text-align: center; margin-top: 0.5rem;">
                ${total <= 2
                    ? 'Valor preditivo negativo de aproximadamente 99% para exclusão de sepse.'
                    : total <= 4
                    ? 'Considerar hemoculturas, PCR, procalcitonina e monitorização clínica.'
                    : 'Forte suspeita de sepse. Coletar culturas e iniciar antibioticoterapia empírica.'}
            </p>
            ${breakdownHtml}
        `;
    }

    return { init };
})();
