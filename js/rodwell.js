/**
 * Rodwell Index Module — Hematological Scoring System for Neonatal Sepsis
 * Reference: Rodwell RL, Leslie AL, Tudehope DI. Early diagnosis of neonatal sepsis
 * using a hematologic scoring system. J Pediatr 1988;112(5):761-7.
 *
 * Neutrophil reference ranges by birth weight:
 * - PN >= 1500g: Manroe BL et al. J Pediatr 1979;95(1):89-98.
 * - PN < 1500g: Mouzinho A et al. Pediatrics 1994;94:76-82.
 *
 * 7 Criteria (1 point each):
 * 1. WBC abnormal (age-dependent ranges)
 * 2. Total neutrophil count abnormal (age + birth weight dependent)
 * 3. Immature neutrophils elevated (>600/mm³ or >10% of WBC)
 * 4. I/T ratio >= 0.2
 * 5. I/M ratio >= 0.3
 * 6. Degenerative changes in neutrophils
 * 7. Platelets <= 150,000/mm³
 *
 * Score: <= 2 unlikely (NPV ~99%), 3-4 possible, >= 5 probable
 */
const RodwellIndex = (() => {
    /**
     * Neutrophil reference ranges by age and birth weight.
     * neutropenia = ANC below this value
     * neutrophilia = ANC above this value
     *
     * PN >= 1500g: Manroe BL et al., J Pediatr 1979;95:89-98
     * PN < 1500g:  Mouzinho A et al., Pediatrics 1994;94:76-82
     */
    const NEUTROPHIL_REF = {
        term: {
            'nascimento': { neutropenia: 1800,  neutrophilia: 5400 },
            '12h':        { neutropenia: 7800,  neutrophilia: 14400 },
            '24h':        { neutropenia: 7200,  neutrophilia: 12400 },
            '36h':        { neutropenia: 3600,  neutrophilia: 10000 },
            '48h':        { neutropenia: 1800,  neutrophilia: 8000 },
            '60h':        { neutropenia: 1800,  neutrophilia: 7200 },
            '72h':        { neutropenia: 1800,  neutrophilia: 7200 },
            '120h':       { neutropenia: 1800,  neutrophilia: 5400 },
            '4-28d':      { neutropenia: 1800,  neutrophilia: 5400 },
        },
        vlbw: {
            'nascimento': { neutropenia: null,   neutrophilia: 6300 },
            '12h':        { neutropenia: 500,    neutrophilia: 6300 },
            '24h':        { neutropenia: 1100,   neutrophilia: 6300 },
            '36h':        { neutropenia: 1100,   neutrophilia: 6300 },
            '48h':        { neutropenia: 1100,   neutrophilia: 6300 },
            '60h':        { neutropenia: 1100,   neutrophilia: 6000 },
            '72h':        { neutropenia: 1100,   neutrophilia: 6000 },
            '120h':       { neutropenia: 1100,   neutrophilia: 6000 },
            '4-28d':      { neutropenia: 1100,   neutrophilia: 6000 },
        }
    };

    /**
     * WBC normal ranges by age (Rodwell 1988 / Manroe 1979):
     * - Nascimento (<12h): 5,000 - 25,000/mm³
     * - 12-24h: 5,000 - 30,000/mm³
     * - >48h: 5,000 - 21,000/mm³
     */
    function getWBCRange(age) {
        if (age === 'nascimento') return { min: 5000, max: 25000 };
        if (age === '12h' || age === '24h') return { min: 5000, max: 30000 };
        return { min: 5000, max: 21000 };
    }

    function isWBCAbnormal(wbc, age) {
        const range = getWBCRange(age);
        return wbc < range.min || wbc > range.max;
    }

    function isNeutrophilAbnormal(neutrophils, age, weightCat) {
        const ref = NEUTROPHIL_REF[weightCat][age];
        if (!ref) return false;
        const belowLower = ref.neutropenia !== null && neutrophils < ref.neutropenia;
        const aboveUpper = ref.neutrophilia !== null && neutrophils > ref.neutrophilia;
        return belowLower || aboveUpper;
    }

    function isImmatureElevated(immature, wbc) {
        if (wbc <= 0) return false;
        return immature > 600 || (immature / wbc) > 0.10;
    }

    function init() {
        document.getElementById('rodwell-calculate').addEventListener('click', calculate);
    }

    function calculate() {
        const age = document.getElementById('rodwell-age').value;
        const weightCat = document.getElementById('rodwell-weight-category').value;
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

        const ref = NEUTROPHIL_REF[weightCat][age];
        const refLabel = weightCat === 'vlbw' ? 'Mouzinho 1994' : 'Manroe 1979';
        const wbcRange = getWBCRange(age);

        // Build reference info strings
        let neutRefStr = '';
        if (ref) {
            const parts = [];
            if (ref.neutropenia !== null) parts.push(`< ${ref.neutropenia.toLocaleString('pt-BR')}`);
            else parts.push('N/D');
            parts.push(`–`);
            if (ref.neutrophilia !== null) parts.push(`> ${ref.neutrophilia.toLocaleString('pt-BR')}`);
            neutRefStr = `Ref: ${parts.join(' ')}`;
        }

        const immPercent = wbc > 0 ? (immature / wbc * 100).toFixed(1) : '0.0';

        const criteria = [
            {
                name: 'Leucócitos totais',
                abnormal: isWBCAbnormal(wbc, age),
                detail: `${wbc.toLocaleString('pt-BR')}/mm³ (Ref: ${wbcRange.min.toLocaleString('pt-BR')}–${wbcRange.max.toLocaleString('pt-BR')})`
            },
            {
                name: 'Neutrófilos totais',
                abnormal: isNeutrophilAbnormal(neutrophils, age, weightCat),
                detail: `${neutrophils.toLocaleString('pt-BR')}/mm³ (${neutRefStr}) [${refLabel}]`
            },
            {
                name: 'Neutrófilos imaturos',
                abnormal: isImmatureElevated(immature, wbc),
                detail: `${immature.toLocaleString('pt-BR')}/mm³ (${immPercent}% dos leuc.; limiar: > 600 ou > 10%)`
            },
            {
                name: 'Relação I/T',
                abnormal: itRatio >= 0.2,
                detail: `${itRatio.toFixed(2)} (limiar: &ge; 0,20)`
            },
            {
                name: 'Relação I/M',
                abnormal: imRatio >= 0.3,
                detail: `${imRatio.toFixed(2)} (limiar: &ge; 0,30)`
            },
            {
                name: 'Alterações degenerativas',
                abnormal: hasDegenerative,
                detail: hasDegenerative ? 'Presente' : 'Ausente'
            },
            {
                name: 'Plaquetas',
                abnormal: platelets <= 150000,
                detail: `${platelets.toLocaleString('pt-BR')}/mm³ (limiar: &le; 150.000)`
            }
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
            <p style="text-align: center; margin-top: 0.3rem; font-size: 0.8rem; color: #7f8c8d;">
                Referência neutrófilos: ${refLabel} (PN ${weightCat === 'vlbw' ? '&lt; 1.500g' : '&ge; 1.500g'})
            </p>
            ${breakdownHtml}
        `;
    }

    return { init };
})();
