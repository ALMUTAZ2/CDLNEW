import { MeterGroup, IndividualMeter, Breaker, Transformer, TransformerType, DistributionResults, DistributionSummary } from '../types';
import { MAX_BREAKER_CAPACITY, TRANSFORMER_TYPES } from '../constants';

// --- Helper Functions ---
const updateBreakerStats = (breaker: Breaker, transformerType: TransformerType) => {
    breaker.load = breaker.meters.reduce((sum, meter) => sum + meter.cdl, 0);

    let maxCapacity: number;

    // Rule for dedicated large meters (1600A/2500A): compare against meter's own capacity
    if (breaker.dedicated && breaker.meters.length === 1) {
        const meterCapacity = breaker.meters[0].capacity;
        if (meterCapacity === 1600 || meterCapacity === 2500) {
            maxCapacity = meterCapacity;
        } else {
            // Fallback for other potential dedicated breakers
            maxCapacity = 310;
        }
    } else {
        // Rule for ALL other breakers: compare against 310A
        maxCapacity = 310;
    }

    breaker.utilizationPercent = maxCapacity > 0 ? (breaker.load / maxCapacity) * 100 : 0;
    
    breaker.meterTypes.clear();
    breaker.categories.clear();
    breaker.timePatterns.clear();

    breaker.meters.forEach(meter => {
        breaker.meterTypes.add(meter.typeName);
        breaker.categories.add(meter.category);
        breaker.timePatterns.add(meter.timePattern);
    });
};

const addMeterToBreaker = (breaker: Breaker, meter: IndividualMeter, transformerType: TransformerType) => {
    breaker.meters.push(meter);
    updateBreakerStats(breaker, transformerType);
};

// --- Scoring and Selection ---

const findBestTwoBreakers = (breakers: Breaker[], halfLoad: number): Breaker[] => {
    // Breakers for split loads must also not exceed the 248A limit
    const available = breakers.filter(b => !b.dedicated && (b.load + halfLoad) <= MAX_BREAKER_CAPACITY);
    if (available.length < 2) return [];

    let bestPair: Breaker[] = [];
    let bestScore = -1;

    for (let i = 0; i < available.length; i++) {
        for (let j = i + 1; j < available.length; j++) {
            const b1 = available[i];
            const b2 = available[j];
            const score = (100 - Math.abs(b1.load - b2.load)) + (200 - b1.load - b2.load);
            if (score > bestScore) {
                bestScore = score;
                bestPair = [b1, b2];
            }
        }
    }
    return bestPair;
};

/**
 * Scoring Algorithm: Calculates the best breaker for a meter.
 * The primary goal is to get the breaker's load as close as possible to a target load.
 */
const calculateBreakerScore = (breaker: Breaker, meter: IndividualMeter, allBreakersInGroup: Breaker[], targetLoad: number): number => {
    const newLoad = breaker.load + meter.cdl;
    if (newLoad > MAX_BREAKER_CAPACITY) return -1; // Disqualify if overloaded

    let score = 1000.0;

    // 1. Target Load Factor (Primary Goal): Reward getting closer to the target.
    const currentDiff = Math.abs(breaker.load - targetLoad);
    const newDiff = Math.abs(newLoad - targetLoad);
    score += (currentDiff - newDiff) * 10;

    // 2. Balance Factor (Secondary Goal): Prefer placements that keep breakers balanced among themselves.
    const avgLoad = allBreakersInGroup.reduce((sum, b) => sum + b.load, 0) / allBreakersInGroup.length;
    const currentBalanceDiff = Math.abs(breaker.load - avgLoad);
    const newBalanceDiff = Math.abs(newLoad - avgLoad);
    score -= (newBalanceDiff - currentBalanceDiff) * 2;

    // 3. Diversity Factor (Tie-breaker): Bonus for mixing load types.
    if (!breaker.categories.has(meter.category)) score += 0.5;
    if (!breaker.timePatterns.has(meter.timePattern)) score += 0.25;
    
    // 4. Fill Factor (Tie-breaker): Slightly prefer filling emptier breakers first.
    // This helps in the initial stages of filling.
    if (breaker.load < targetLoad) {
        score -= breaker.load / 100;
    }

    return score;
};


// --- Main Distribution Logic ---

const distributeMetersOnTransformer = (transformer: Transformer, meters: IndividualMeter[]): IndividualMeter[] => {
    const sortedMeters = [...meters].sort((a, b) => b.cdl - a.cdl);
    
    const largeMeters = sortedMeters.filter(m => m.capacity >= 1600);
    const dualBreakerMeters = sortedMeters.filter(m => m.capacity >= 400 && m.capacity < 1600);
    const regularMeters = sortedMeters.filter(m => m.capacity < 400);

    const unplacedMeters: IndividualMeter[] = [];

    // Phase 1: Large meters (dedicated breaker)
    largeMeters.forEach(meter => {
        const dedicatedBreaker = transformer.breakers.find(b => b.meters.length === 0);
        if (dedicatedBreaker) {
            addMeterToBreaker(dedicatedBreaker, meter, transformer.type);
            dedicatedBreaker.dedicated = true;
            dedicatedBreaker.dedicatedFor = `${meter.capacity}A`;
        } else {
            unplacedMeters.push(meter);
        }
    });

    // Phase 2: Dual-breaker meters
    const breakersAlreadyPaired = new Set<number>(); // Track breaker IDs used in pairs
    dualBreakerMeters.forEach(meter => {
        const halfLoad = meter.cdl / 2;

        if (halfLoad > MAX_BREAKER_CAPACITY) {
            unplacedMeters.push(meter);
            return;
        }

        // Find best pair from breakers that haven't been paired yet
        const candidateBreakers = transformer.breakers.filter(b => !breakersAlreadyPaired.has(b.id));
        const bestPair = findBestTwoBreakers(candidateBreakers, halfLoad);
        
        if (bestPair.length === 2) {
            addMeterToBreaker(bestPair[0], { ...meter, id: `${meter.id}_p1`, cdl: halfLoad, note: `جزء 1` }, transformer.type);
            addMeterToBreaker(bestPair[1], { ...meter, id: `${meter.id}_p2`, cdl: halfLoad, note: `جزء 2` }, transformer.type);
            
            // Mark these breakers as used in a pair to prevent reuse for another split meter
            breakersAlreadyPaired.add(bestPair[0].id);
            breakersAlreadyPaired.add(bestPair[1].id);
        } else {
             unplacedMeters.push(meter);
        }
    });
    
    // Phase 3: NEW LOGIC - Distribute regular meters based on calculated breaker needs
    if (regularMeters.length > 0) {
        const totalRegularLoad = regularMeters.reduce((sum, m) => sum + m.cdl, 0);
        // Available breakers are those not dedicated AND not part of a pair
        const availableBreakers = transformer.breakers.filter(b => !b.dedicated && !breakersAlreadyPaired.has(b.id));


        // Step 1: Determine exactly how many breakers are needed for this load.
        const requiredBreakersCount = Math.ceil(totalRegularLoad / MAX_BREAKER_CAPACITY);
        const numBreakersToUse = Math.min(requiredBreakersCount, availableBreakers.length);

        if (numBreakersToUse > 0) {
            // Step 2: Select the breakers we will distribute onto.
            const breakersToUse = availableBreakers.slice(0, numBreakersToUse);
            
            // The ideal average load for each of these active breakers.
            const idealTargetLoad = totalRegularLoad / numBreakersToUse;
            // The realistic target load cannot exceed the breaker's maximum capacity.
            const targetLoad = Math.min(idealTargetLoad, MAX_BREAKER_CAPACITY);


            // Step 3: Distribute meters onto the selected breakers.
            regularMeters.forEach(meter => {
                let bestBreaker: Breaker | null = null;
                // FIX: Initialize bestScore to -1 (the invalid score) to ensure that only
                // valid placements are ever chosen. This prevents the bug where the first
                // checked breaker was chosen even if it resulted in an overload.
                let bestScore = -1;

                for (const breaker of breakersToUse) {
                    const score = calculateBreakerScore(breaker, meter, breakersToUse, targetLoad);
                    if (score > bestScore) {
                        bestScore = score;
                        bestBreaker = breaker;
                    }
                }
                
                if (bestBreaker) {
                    addMeterToBreaker(bestBreaker, meter, transformer.type);
                } else {
                    unplacedMeters.push(meter);
                }
            });
        } else {
             unplacedMeters.push(...regularMeters);
        }
    }


    return unplacedMeters;
};

const selectOptimalTransformer = (load: number): TransformerType => {
    return TRANSFORMER_TYPES.find(t => load <= t.safeLoad) || TRANSFORMER_TYPES[TRANSFORMER_TYPES.length - 1];
};


const distributeOnMultipleTransformers = (individualMeters: IndividualMeter[], startId: number = 1): Transformer[] => {
    if (individualMeters.length === 0) return [];
    
    const transformers: Transformer[] = [];
    let remainingMeters = [...individualMeters];
    let transformerId = startId;

    while(remainingMeters.length > 0) {
        const remainingLoad = remainingMeters.reduce((sum, m) => sum + m.cdl, 0);
        const selectedType = selectOptimalTransformer(remainingLoad);

        const transformer: Transformer = {
            id: transformerId++,
            type: selectedType,
            assignedLoad: 0,
            breakers: Array.from({ length: selectedType.breakers }, (_, i) => ({
                id: i + 1, number: i + 1, load: 0, meters: [], utilizationPercent: 0,
                meterTypes: new Set(), categories: new Set(), timePatterns: new Set(),
            }))
        };
        
        const assignedMeters: IndividualMeter[] = [];
        let currentTransformerLoad = 0;
        
        // Greedily pull meters for this transformer up to its safe load
        const tempRemaining = [...remainingMeters].sort((a,b) => b.cdl - a.cdl);
        remainingMeters = [];
        for (const meter of tempRemaining) {
            if (currentTransformerLoad + meter.cdl <= selectedType.safeLoad) {
                assignedMeters.push(meter);
                currentTransformerLoad += meter.cdl;
            } else {
                remainingMeters.push(meter);
            }
        }
        
        if (assignedMeters.length > 0) {
            const unplaced = distributeMetersOnTransformer(transformer, assignedMeters);
            remainingMeters.push(...unplaced); // Add unplaced meters back to the main pool

            transformer.assignedLoad = transformer.breakers.reduce((sum, b) => sum + b.load, 0);
            
            if (transformer.assignedLoad > 0) {
                transformers.push(transformer);
            } else {
                // This case handles if all assigned meters ended up being unplaced.
                // Add them back to the main pool to be re-evaluated for another transformer.
                remainingMeters.push(...assignedMeters);
            }
        }
    }
    return transformers;
}


// --- Summary & Scoring ---

const calculateOverallBalanceScore = (transformers: Transformer[]): number => {
    if (transformers.length === 0) return 0;
    const allBreakers = transformers.filter(t => !t.isDedicated).flatMap(t => t.breakers).filter(b => b.meters.length > 0);
    if (allBreakers.length === 0) return 100;

    const utils = allBreakers.map(b => b.utilizationPercent);
    const avg = utils.reduce((sum, v) => sum + v, 0) / utils.length;
    const stdDev = Math.sqrt(utils.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / utils.length);
    
    return Math.max(0, Math.min(100, 100 - stdDev * 2));
};

const calculateMultiTransformerSummary = (transformers: Transformer[], totalLoad: number, balanceScore: number, originalMeters: MeterGroup[]): DistributionSummary => {
    const allBreakers = transformers.flatMap(t => t.breakers).filter(b => b.meters.length > 0);
    const utils = allBreakers.map(b => b.utilizationPercent);
    const totalMeters = originalMeters.reduce((sum, m) => sum + m.count, 0);
    
    // Calculate the number of display entries (rows in the table)
    const part1MetersCount = allBreakers.flatMap(b => b.meters).filter(m => m.note === 'جزء 1').length;
    const distributionEntries = allBreakers.length - part1MetersCount;

    const transformerCapacities: {[key: string]: number} = {};
    transformers.forEach(t => {
        transformerCapacities[t.type.capacity] = (transformerCapacities[t.type.capacity] || 0) + 1;
    });

    return {
        totalTransformers: transformers.length,
        totalBreakers: allBreakers.length,
        distributionEntries: distributionEntries,
        totalMeters: totalMeters,
        totalLoad: totalLoad.toFixed(1),
        totalLoadKVA: (totalLoad * 0.4 * 1.73).toFixed(1),
        overloadedBreakers: allBreakers.filter(b => b.utilizationPercent > 100).length,
        overloadedTransformers: transformers.filter(t => (t.assignedLoad / t.type.safeLoad) * 100 > 100).length,
        maxUtilization: (utils.length > 0 ? Math.max(...utils) : 0).toFixed(1),
        minUtilization: (utils.length > 0 ? Math.min(...utils) : 0).toFixed(1),
        avgUtilization: (utils.length > 0 ? utils.reduce((s, v) => s + v, 0) / utils.length : 0).toFixed(1),
        balanceScore: balanceScore.toFixed(1),
        efficiency: (() => {
            const totalUsed = transformers.reduce((s, t) => s + t.assignedLoad, 0);
            const totalCapacity = transformers.reduce((s, t) => s + t.type.safeLoad, 0);
            return totalCapacity > 0 ? (totalUsed / totalCapacity * 100).toFixed(1) : '0.0';
        })(),
        transformerDetails: Object.entries(transformerCapacities)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))
            .map(([capacity, count]) => `${count}x ${capacity} KVA`).join('<br>')
    };
};

// --- Main Exported Function ---

export const performBalancedDistributionMultiTransformer = (meterGroups: MeterGroup[]): DistributionResults => {
    const totalLoad = meterGroups.reduce((sum, meter) => sum + meter.totalCDL, 0);

    const individualMeters: IndividualMeter[] = meterGroups.flatMap(group =>
        Array.from({ length: group.count }, (_, i) => ({
            ...group,
            id: `${group.id}_${i}`,
            cdl: group.cdlPerMeter
        }))
    );

    const dedicatedTransformerMeters = individualMeters.filter(m => m.capacity >= 1600);
    const regularMeters = individualMeters.filter(m => m.capacity < 1600);

    const dedicatedTransformers: Transformer[] = [];
    let transformerIdCounter = 1;

    dedicatedTransformerMeters.forEach(meter => {
        let selectedType: TransformerType | undefined;

        if (meter.capacity === 1600) {
            selectedType = TRANSFORMER_TYPES.find(t => t.capacity === 1000);
        } else if (meter.capacity === 2500) {
            selectedType = TRANSFORMER_TYPES.find(t => t.capacity === 1500);
        }

        if (!selectedType) {
            selectedType = selectOptimalTransformer(meter.cdl);
        }

        const transformer: Transformer = {
            id: transformerIdCounter++,
            type: selectedType,
            assignedLoad: meter.cdl,
            breakers: Array.from({ length: selectedType.breakers }, (_, i) => ({
                id: i + 1, number: i + 1, load: 0, meters: [], utilizationPercent: 0,
                meterTypes: new Set(), categories: new Set(), timePatterns: new Set(),
            })),
            isDedicated: true,
            dedicatedFor: `عداد ${meter.capacity}A`,
        };

        const breaker = transformer.breakers[0];
        
        breaker.dedicated = true;
        breaker.dedicatedFor = `عداد ${meter.capacity}A`;
        addMeterToBreaker(breaker, meter, transformer.type);
        
        dedicatedTransformers.push(transformer);
    });

    const regularTransformers = distributeOnMultipleTransformers(regularMeters, transformerIdCounter);

    const allTransformers = [...dedicatedTransformers, ...regularTransformers];
    
    allTransformers.forEach((t, i) => t.id = i + 1);

    const balanceScore = calculateOverallBalanceScore(allTransformers);
    const summary = calculateMultiTransformerSummary(allTransformers, totalLoad, balanceScore, meterGroups);

    return {
        totalLoad,
        transformers: allTransformers,
        balanceScore,
        summary
    };
};