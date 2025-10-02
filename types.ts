export interface MeterGroup {
    id: number;
    type: string;
    typeName: string;
    count: number;
    capacity: number;
    demandFactor: number;
    coincidenceFactor: number;
    cdlPerMeter: number;
    totalCDL: number;
    category: string;
    timePattern: string;
}

// FIX: Allow IndividualMeter id to be a string for uniqueness when splitting or expanding meter groups.
export interface IndividualMeter extends Omit<MeterGroup, 'id'> {
    id: number | string;
    cdl: number;
    note?: string;
}

export interface Breaker {
    id: number;
    number: number;
    load: number;
    meters: IndividualMeter[];
    utilizationPercent: number;
    meterTypes: Set<string>;
    categories: Set<string>;
    timePatterns: Set<string>;
    dedicated?: boolean;
    dedicatedFor?: string;
}

export interface TransformerType {
    capacity: number;
    maxCurrent: number;
    breakers: number;
    name: string;
    maxLoad: number;
    safeLoad: number;
    minLoad: number;
}

export interface Transformer {
    id: number;
    type: TransformerType;
    assignedLoad: number;
    breakers: Breaker[];
    isDedicated?: boolean;
    dedicatedFor?: string;
}

export interface DistributionSummary {
    totalTransformers: number;
    totalBreakers: number;
    distributionEntries?: number; // Add a property to hold the count of display rows
    totalMeters: number;
    totalLoad: string;
    totalLoadKVA: string;
    overloadedBreakers: number;
    overloadedTransformers: number;
    maxUtilization: string;
    minUtilization: string;
    avgUtilization: string;
    balanceScore: string;
    efficiency: string;
    transformerDetails: string;
}

export interface DistributionResults {
    totalLoad: number;
    transformers: Transformer[];
    balanceScore: number;
    summary: DistributionSummary;
}