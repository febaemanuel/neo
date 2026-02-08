/**
 * AAP 2004 Guidelines for Phototherapy and Exchange Transfusion
 * Reference: American Academy of Pediatrics Subcommittee on Hyperbilirubinemia.
 * Management of hyperbilirubinemia in the newborn infant 35 or more weeks of gestation.
 * Pediatrics 2004;114(1):297-316.
 *
 * Three risk categories:
 * - Lower risk: >= 38 weeks AND well
 * - Medium risk: >= 38 weeks + risk factors OR 35-37 6/7 weeks AND well
 * - Higher risk: 35-37 6/7 weeks + risk factors
 *
 * Risk factors: isoimmune hemolytic disease, G6PD deficiency, asphyxia,
 * significant lethargy, temperature instability, sepsis, albumin < 3.0 g/dL
 *
 * Curves: [hours, bilirubin mg/dL]
 */
const AAP_2004 = {
    phototherapy: {
        // >= 38 weeks, no risk factors (lower risk)
        lowerRisk: [
            [0, 0], [12, 5], [24, 8], [36, 10], [48, 12],
            [60, 14], [72, 15], [84, 17], [96, 18],
            [108, 19], [120, 20], [132, 21], [144, 21], [168, 21]
        ],
        // >= 38 weeks + RF, OR 35-37 6/7 well (medium risk)
        mediumRisk: [
            [0, 0], [12, 4], [24, 7], [36, 9], [48, 11],
            [60, 12.5], [72, 13], [84, 14.5], [96, 15],
            [108, 16], [120, 17], [132, 17.5], [144, 18], [168, 18]
        ],
        // 35-37 6/7 + risk factors (higher risk)
        higherRisk: [
            [0, 0], [12, 3], [24, 5.5], [36, 7.5], [48, 9],
            [60, 10.5], [72, 11], [84, 12], [96, 13],
            [108, 13.5], [120, 14], [132, 14.5], [144, 15], [168, 15]
        ]
    },
    exchange: {
        // >= 38 weeks, no risk factors (lower risk)
        lowerRisk: [
            [0, 0], [12, 10], [24, 15], [36, 18], [48, 20],
            [60, 22], [72, 23], [84, 24], [96, 25],
            [108, 25], [120, 25], [132, 25], [144, 25], [168, 25]
        ],
        // >= 38 weeks + RF, OR 35-37 6/7 well (medium risk)
        mediumRisk: [
            [0, 0], [12, 8], [24, 13], [36, 15], [48, 17],
            [60, 18.5], [72, 19.5], [84, 20.5], [96, 21.5],
            [108, 22], [120, 22.5], [132, 22.5], [144, 22.5], [168, 22.5]
        ],
        // 35-37 6/7 + risk factors (higher risk)
        higherRisk: [
            [0, 0], [12, 6], [24, 10.5], [36, 13], [48, 14.5],
            [60, 16], [72, 17], [84, 17.5], [96, 18],
            [108, 18.5], [120, 19], [132, 19], [144, 19], [168, 19]
        ]
    }
};

/**
 * Determine the risk category based on GA and risk factors
 */
function getAAPRiskCategory(gaWeeks, hasRiskFactors) {
    if (gaWeeks >= 38 && !hasRiskFactors) {
        return 'lowerRisk';
    } else if ((gaWeeks >= 38 && hasRiskFactors) || (gaWeeks >= 35 && gaWeeks < 38 && !hasRiskFactors)) {
        return 'mediumRisk';
    } else {
        return 'higherRisk';
    }
}

/**
 * Interpolate threshold from AAP curve for a given hour
 */
function aapInterpolate(curve, hours) {
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
 * Evaluate phototherapy and exchange transfusion indication
 */
function evaluateAAP2004(gaWeeks, hoursOfLife, bt, hasRiskFactors) {
    const category = getAAPRiskCategory(gaWeeks, hasRiskFactors);
    const photoThreshold = aapInterpolate(AAP_2004.phototherapy[category], hoursOfLife);
    const exchangeThreshold = aapInterpolate(AAP_2004.exchange[category], hoursOfLife);

    const categoryLabels = {
        lowerRisk: 'Menor risco (≥38 sem, sem fatores de risco)',
        mediumRisk: 'Risco médio (≥38 sem + FR, ou 35-37 sem sem FR)',
        higherRisk: 'Maior risco (35-37 sem + fatores de risco)'
    };

    let indication;
    let severity;
    if (bt >= exchangeThreshold) {
        indication = 'INDICAÇÃO DE EXSANGUÍNEOTRANSFUSÃO';
        severity = 'exchange';
    } else if (bt >= photoThreshold) {
        indication = 'INDICAÇÃO DE FOTOTERAPIA';
        severity = 'photo';
    } else {
        indication = 'Abaixo do limiar de fototerapia';
        severity = 'none';
    }

    return {
        category,
        categoryLabel: categoryLabels[category],
        photoThreshold: photoThreshold ? photoThreshold.toFixed(1) : null,
        exchangeThreshold: exchangeThreshold ? exchangeThreshold.toFixed(1) : null,
        indication,
        severity
    };
}
