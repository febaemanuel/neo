/**
 * Bhutani Nomogram Data - Hour-specific bilirubin risk zones
 * Reference: Bhutani VK, Johnson L, Sivieri EM. Predictive ability of a predischarge
 * hour-specific serum bilirubin for subsequent significant hyperbilirubinemia in healthy
 * term and near-term newborns. Pediatrics 1999;103(1):6-14.
 *
 * Zones: High Risk (>=p95), High-Intermediate (p75-p95),
 *        Low-Intermediate (p40-p75), Low Risk (<p40)
 *
 * Data points: [hours, bilirubin mg/dL]
 */
const BHUTANI_DATA = {
    // Percentile 40 boundary (low risk / low-intermediate boundary)
    p40: [
        [0, 0], [12, 2.5], [18, 3.5], [24, 4.2], [30, 5.0],
        [36, 5.8], [42, 6.4], [48, 7.0], [54, 7.5], [60, 7.9],
        [66, 8.2], [72, 8.5], [78, 8.7], [84, 8.9], [90, 9.0],
        [96, 9.1], [102, 9.2], [108, 9.2], [114, 9.2], [120, 9.2],
        [126, 9.1], [132, 9.0], [138, 8.9], [144, 8.8]
    ],
    // Percentile 75 boundary (low-intermediate / high-intermediate boundary)
    p75: [
        [0, 0], [12, 3.8], [18, 5.0], [24, 6.0], [30, 7.0],
        [36, 8.0], [42, 8.8], [48, 9.5], [54, 10.2], [60, 10.7],
        [66, 11.2], [72, 11.6], [78, 11.9], [84, 12.1], [90, 12.3],
        [96, 12.5], [102, 12.6], [108, 12.6], [114, 12.6], [120, 12.6],
        [126, 12.5], [132, 12.4], [138, 12.2], [144, 12.0]
    ],
    // Percentile 95 boundary (high-intermediate / high risk boundary)
    p95: [
        [0, 0], [12, 5.2], [18, 6.8], [24, 8.1], [30, 9.4],
        [36, 10.5], [42, 11.5], [48, 12.3], [54, 13.1], [60, 13.7],
        [66, 14.2], [72, 14.7], [78, 15.1], [84, 15.4], [90, 15.7],
        [96, 15.9], [102, 16.0], [108, 16.1], [114, 16.1], [120, 16.1],
        [126, 16.0], [132, 15.9], [138, 15.7], [144, 15.5]
    ]
};

/**
 * Interpolate bilirubin threshold for a given hour from a curve
 */
function bhutaniInterpolate(curve, hours) {
    if (hours <= curve[0][0]) return curve[0][1];
    if (hours >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];
    for (let i = 0; i < curve.length - 1; i++) {
        if (hours >= curve[i][0] && hours <= curve[i + 1][0]) {
            const ratio = (hours - curve[i][0]) / (curve[i + 1][0] - curve[i][0]);
            return curve[i][1] + ratio * (curve[i + 1][1] - curve[i][1]);
        }
    }
    return null;
}

/**
 * Determine Bhutani risk zone
 */
function getBhutaniZone(hours, bt) {
    const p40 = bhutaniInterpolate(BHUTANI_DATA.p40, hours);
    const p75 = bhutaniInterpolate(BHUTANI_DATA.p75, hours);
    const p95 = bhutaniInterpolate(BHUTANI_DATA.p95, hours);

    if (bt >= p95) {
        return { zone: 'high', label: 'Alto Risco', color: '#e74c3c', description: 'Zona de alto risco (>= percentil 95). Considerar avaliação e tratamento imediatos.' };
    } else if (bt >= p75) {
        return { zone: 'high-int', label: 'Risco Intermediário Alto', color: '#e67e22', description: 'Zona de risco intermediário alto (percentil 75-95). Monitorar de perto e considerar fatores de risco.' };
    } else if (bt >= p40) {
        return { zone: 'low-int', label: 'Risco Intermediário Baixo', color: '#d4ac0d', description: 'Zona de risco intermediário baixo (percentil 40-75). Seguimento habitual com atenção aos fatores de risco.' };
    } else {
        return { zone: 'low', label: 'Baixo Risco', color: '#27ae60', description: 'Zona de baixo risco (< percentil 40). Seguimento de rotina.' };
    }
}
