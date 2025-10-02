
import React, { useState, useMemo } from 'react';
import { MeterGroup } from '../types';
import { METER_TYPE_NAMES, METER_CAPACITIES, DEMAND_FACTORS, LOAD_CATEGORIES, TIME_PATTERNS, SAMPLE_DATA } from '../constants';

interface InputSectionProps {
    onAddMeter: (meterGroup: Omit<MeterGroup, 'id'>) => void;
    onCalculate: () => void;
    onAddSampleData: (sampleMeters: MeterGroup[]) => void;
    meters: MeterGroup[];
    onRemoveMeter: (id: number) => void;
    isLoading: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ onAddMeter, onCalculate, onAddSampleData, meters, onRemoveMeter, isLoading }) => {
    const [meterType, setMeterType] = useState('C1');
    const [meterCount, setMeterCount] = useState('');
    const [meterCapacity, setMeterCapacity] = useState('70');

    const meterOptions = useMemo(() => Object.entries(METER_TYPE_NAMES).map(([key, name]) => (
        <option key={key} value={key}>{`${key} - ${name}`}</option>
    )), []);

    const capacityOptions = useMemo(() => METER_CAPACITIES.map(cap => (
        <option key={cap} value={cap}>{`${cap}A`}</option>
    )), []);
    
    const calculateCoincidenceFactor = (N: number, type: string) => {
        if (type === 'C2' || N === 1) return 1;
        return (0.67 + (0.33 / Math.sqrt(N))) / 1.25;
    };

    const getCategoryForType = (type: string) => {
        for (const category in LOAD_CATEGORIES) {
            if (LOAD_CATEGORIES[category].includes(type)) return category;
        }
        return 'مختلط';
    };

    const getTimePatternForType = (type: string) => {
        for (const pattern in TIME_PATTERNS) {
            if (TIME_PATTERNS[pattern].includes(type)) return pattern;
        }
        return 'مختلط';
    };

    const handleAdd = () => {
        const count = parseInt(meterCount);
        const capacity = parseInt(meterCapacity);
        if (!count || count <= 0) {
            alert('يرجى إدخال عدد صحيح للعدادات');
            return;
        }

        const demandFactor = DEMAND_FACTORS[meterType];
        const coincidenceFactor = calculateCoincidenceFactor(count, meterType);
        const cdlPerMeter = capacity * demandFactor;
        const totalCDL = count * cdlPerMeter * coincidenceFactor;

        onAddMeter({
            type: meterType,
            typeName: METER_TYPE_NAMES[meterType],
            count,
            capacity,
            demandFactor,
            coincidenceFactor,
            cdlPerMeter: totalCDL / count,
            totalCDL,
            category: getCategoryForType(meterType),
            timePattern: getTimePatternForType(meterType)
        });
        setMeterCount('');
    };
    
    const handleAddSampleData = () => {
        const sampleMeters = SAMPLE_DATA.map(data => {
            const demandFactor = DEMAND_FACTORS[data.type];
            const coincidenceFactor = calculateCoincidenceFactor(data.count, data.type);
            const cdlPerMeter = data.capacity * demandFactor;
            const totalCDL = data.count * cdlPerMeter * coincidenceFactor;
            return {
                id: Date.now() + Math.random(),
                type: data.type,
                typeName: METER_TYPE_NAMES[data.type],
                count: data.count,
                capacity: data.capacity,
                demandFactor,
                coincidenceFactor,
                cdlPerMeter: totalCDL / data.count,
                totalCDL,
                category: getCategoryForType(data.type),
                timePattern: getTimePatternForType(data.type),
            };
        });
        onAddSampleData(sampleMeters);
    }

    return (
        <section className="mb-8 p-4 sm:p-6 bg-slate-100 border-2 border-slate-200 rounded-xl shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 pb-2 border-b-2 border-sky-500">
                📊 إدخال بيانات العدادات
            </h2>
            <div className="p-4 bg-white rounded-lg border border-slate-200">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-4">
                    <div>
                        <label htmlFor="meterType" className="block text-sm font-medium text-slate-700 mb-1">نوع العداد:</label>
                        <select id="meterType" value={meterType} onChange={e => setMeterType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
                           {meterOptions}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="meterCount" className="block text-sm font-medium text-slate-700 mb-1">عدد العدادات:</label>
                        <input type="number" id="meterCount" value={meterCount} onChange={e => setMeterCount(e.target.value)} min="1" placeholder="مثال: 10" className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <div>
                        <label htmlFor="meterCapacity" className="block text-sm font-medium text-slate-700 mb-1">سعة العداد (A):</label>
                        <select id="meterCapacity" value={meterCapacity} onChange={e => setMeterCapacity(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
                           {capacityOptions}
                        </select>
                    </div>
                    <button onClick={handleAdd} className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                        <PlusIcon />
                        إضافة
                    </button>
                </div>
            </div>

            <div className="mt-6 bg-white p-4 rounded-lg border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">📋 قائمة العدادات المضافة:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {meters.length > 0 ? meters.map(meter => (
                        <div key={meter.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border-r-4 border-sky-500">
                            <div className="text-sm">
                                <p className="font-bold text-slate-700">{`${meter.count} × ${meter.typeName} (${meter.capacity}A)`}</p>
                                <p className="text-slate-500 text-xs">
                                    {`معامل الطلب: ${meter.demandFactor.toFixed(2)} | معامل التزامن: ${meter.coincidenceFactor.toFixed(2)} | الحمل الإجمالي: ${meter.totalCDL.toFixed(1)}A`}
                                </p>
                            </div>
                            <button onClick={() => onRemoveMeter(meter.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full transition-colors">
                                <TrashIcon />
                            </button>
                        </div>
                    )) : (
                        <p className="text-slate-500 text-center py-4">لم يتم إضافة أي عدادات بعد</p>
                    )}
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                <button onClick={onCalculate} disabled={isLoading} className="w-full sm:w-auto bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                    {isLoading ? <Spinner /> : <CalculatorIcon />}
                    {isLoading ? 'جاري الحساب...' : 'حساب التوزيع المتوازن'}
                </button>
                <button onClick={handleAddSampleData} className="w-full sm:w-auto bg-amber-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-amber-600 transition-colors shadow-lg flex items-center justify-center gap-2">
                     <BeakerIcon />
                    بيانات تجريبية
                </button>
            </div>
        </section>
    );
};

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const CalculatorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const BeakerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 00.517 3.86l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86l.477-2.387a2 2 0 00.547-1.806z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v2m0 4h.01" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>;

export default InputSection;
