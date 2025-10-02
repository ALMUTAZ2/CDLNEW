
import React, { useState, useCallback } from 'react';
import { MeterGroup, DistributionResults } from './types';
import { performBalancedDistributionMultiTransformer } from './services/balancingAlgorithm';

import Header from './components/Header';
import InputSection from './components/InputSection';
import ResultsSection from './components/ResultsSection';
import ToastContainer from './components/ToastContainer';

const App: React.FC = () => {
    const [meters, setMeters] = useState<MeterGroup[]>([]);
    const [results, setResults] = useState<DistributionResults | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

    const addNotification = useCallback((message: string, type: 'success' | 'error') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    }, []);

    const addMeter = useCallback((meterGroup: Omit<MeterGroup, 'id'>) => {
        setMeters(prev => [...prev, { ...meterGroup, id: Date.now() }]);
        addNotification('تم إضافة العداد بنجاح', 'success');
    }, [addNotification]);

    const removeMeter = useCallback((id: number) => {
        setMeters(prev => prev.filter(meter => meter.id !== id));
        addNotification('تم حذف العداد', 'success');
    }, [addNotification]);
    
    const setSampleData = useCallback((sampleMeters: MeterGroup[]) => {
        setMeters(sampleMeters);
        addNotification('تم إضافة البيانات التجريبية', 'success');
    }, [addNotification]);

    const calculateDistribution = useCallback(() => {
        if (meters.length === 0) {
            addNotification('يرجى إضافة العدادات أولاً', 'error');
            return;
        }

        setIsLoading(true);
        setResults(null);

        setTimeout(() => {
            try {
                const calculatedResults = performBalancedDistributionMultiTransformer(meters);
                setResults(calculatedResults);
                addNotification(`تم حساب التوزيع المتوازن! عدد المحولات: ${calculatedResults.transformers.length}`, 'success');
            } catch (error) {
                if (error instanceof Error) {
                    addNotification(`حدث خطأ في الحسابات: ${error.message}`, 'error');
                } else {
                    addNotification('حدث خطأ غير معروف في الحسابات', 'error');
                }
            } finally {
                setIsLoading(false);
            }
        }, 1500);
    }, [meters, addNotification]);

    return (
        <div className="bg-slate-50 font-sans">
            <ToastContainer notifications={notifications} />
            <div className="bg-gradient-to-br from-slate-900 to-slate-700 min-h-screen p-2 sm:p-4 md:p-6">
                <div className="max-w-screen-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden min-h-[calc(100vh-3rem)]">
                    <Header />
                    <main className="p-4 sm:p-6 md:p-8">
                        <InputSection
                            onAddMeter={addMeter}
                            onCalculate={calculateDistribution}
                            onAddSampleData={setSampleData}
                            meters={meters}
                            onRemoveMeter={removeMeter}
                            isLoading={isLoading}
                        />
                        {results && <ResultsSection results={results} />}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default App;
