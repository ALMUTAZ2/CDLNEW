
import { TransformerType } from './types';

export const MAX_BREAKER_CAPACITY = 248;
export const TARGET_UTILIZATION = 75;

export const TRANSFORMER_TYPES: TransformerType[] = [
    { capacity: 500, maxCurrent: 721, breakers: 4, name: '500 KVA', maxLoad: 576.80, safeLoad: 576.80, minLoad: 216 },
    { capacity: 1000, maxCurrent: 1443, breakers: 8, name: '1000 KVA', maxLoad: 1154.40, safeLoad: 1154.40, minLoad: 433 },
    { capacity: 1500, maxCurrent: 2164, breakers: 10, name: '1500 KVA', maxLoad: 1731.20, safeLoad: 1731.20, minLoad: 800 }
];

export const METER_TYPE_NAMES: { [key: string]: string } = {
    'C1': 'سكني عادي', 'C2': 'محلات تجارية', 'C3': 'شقق مفروشة / سكن ععمال', 'C4': 'فنادق',
    'C5': 'مولات / مراكز تسوق', 'C6': 'مطاعم / مقاهي', 'C7': 'مكاتب (حكومية/تجارية)', 'C8': 'مدارس / حضانات',
    'C9': 'مساجد', 'C10': 'ميزانين فندق', 'C11': 'خدمات مشتركة في المباني', 'C12': 'مرافق عامة',
    'C13': 'مواقف سيارات داخلية', 'C14': 'مواقف خارجية', 'C15': 'إنارة شوارع', 'C16': 'حدائق ومتنزهات',
    'C17': 'ساحات مفتوحة', 'C18': 'مستشفيات / مرافق طبية', 'C19': 'عيادات طبية', 'C20': 'جامعات / معاهد عليا',
    'C21': 'صناعات خفيفة', 'C22': 'ورش عمل', 'C23': 'مخازن تبريد', 'C24': 'مستودعات',
    'C25': 'قاعات مناسبات', 'C26': 'منشآت ترفيهية', 'C27': 'مزارع / منشآت زراعية', 'C28': 'محطات وقود',
    'C29': 'مصانع كبرى'
};

export const DEMAND_FACTORS: { [key: string]: number } = {
    'C1': 0.5, 'C2': 0.6, 'C3': 0.6, 'C4': 0.65, 'C5': 0.6, 'C6': 0.6, 'C7': 0.6, 'C8': 0.7,
    'C9': 0.8, 'C10': 0.65, 'C11': 0.7, 'C12': 0.65, 'C13': 0.7, 'C14': 0.8, 'C15': 0.8,
    'C16': 0.7, 'C17': 0.8, 'C18': 0.7, 'C19': 0.6, 'C20': 0.7, 'C21': 0.8, 'C22': 0.8,
    'C23': 0.8, 'C24': 0.6, 'C25': 0.7, 'C26': 0.7, 'C27': 0.8, 'C28': 0.6, 'C29': 0.8
};

export const LOAD_CATEGORIES: { [key: string]: string[] } = {
    'سكني': ['C1', 'C3'],
    'تجاري': ['C2', 'C4', 'C5', 'C6', 'C7'],
    'عام': ['C8', 'C9', 'C18', 'C19', 'C20', 'C25', 'C26'],
    'بنية تحتية': ['C11', 'C12', 'C13', 'C14', 'C15', 'C16', 'C17'],
    'صناعي': ['C21', 'C22', 'C23', 'C24', 'C27', 'C28', 'C29']
};

export const TIME_PATTERNS: { [key: string]: string[] } = {
    'نهاري': ['C2', 'C7', 'C8', 'C19', 'C20', 'C22'],
    'ليلي': ['C1', 'C3', 'C4', 'C6', 'C25', 'C26'],
    'مختلط': ['C5', 'C9', 'C11', 'C18', 'C21', 'C23', 'C24', 'C27', 'C28', 'C29'],
    'مستمر': ['C12', 'C13', 'C14', 'C15', 'C16', 'C17']
};

export const METER_CAPACITIES = [20, 30, 40, 50, 70, 100, 125, 150, 200, 250, 300, 400, 500, 600, 800, 1600, 2500];

export const SAMPLE_DATA = [
    { type: 'C1', count: 35, capacity: 30 },
    { type: 'C2', count: 25, capacity: 70 },
    { type: 'C1', count: 30, capacity: 50 },
    { type: 'C6', count: 15, capacity: 100 },
    { type: 'C3', count: 20, capacity: 40 },
    { type: 'C7', count: 18, capacity: 50 }
];
