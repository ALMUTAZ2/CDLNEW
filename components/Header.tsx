
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white p-6 sm:p-8 text-center shadow-md">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-shadow">
                ⚖️ التوزيع المتوازن للعدادات
            </h1>
            <p className="text-sm sm:text-base md:text-lg opacity-90">
                خوارزمية التوازن الذكي - حد أقصى 80% لكل محول
            </p>
        </header>
    );
};

export default Header;
