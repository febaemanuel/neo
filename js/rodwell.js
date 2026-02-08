/**
 * Rodwell Index Module — Hematological Scoring System for Neonatal Sepsis
 * Reference: Rodwell RL, Leslie AL, Tudehope DI. Early diagnosis of neonatal sepsis
 * using a hematologic scoring system. J Pediatr 1988;112(5):761-7.
 *
 * Score interpretation:
 *   <= 2: Sepsis unlikely (NPV ~99%)
 *   3-4: Sepsis possible — investigate
 *   >= 5: Sepsis probable — treat
 */
const RodwellIndex = (() => {
    function init() {
        document.getElementById('rodwell-calculate').addEventListener('click', calculate);
    }

    function calculate() {
        let total = 0;
        for (let i = 1; i <= 7; i++) {
            const selected = document.querySelector(`input[name="rodwell-${i}"]:checked`);
            if (selected) {
                total += parseInt(selected.value);
            }
        }

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
        `;
    }

    return { init };
})();
