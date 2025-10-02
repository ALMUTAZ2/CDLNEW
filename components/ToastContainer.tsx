
import React from 'react';

interface ToastContainerProps {
    notifications: {
        id: number;
        message: string;
        type: 'success' | 'error';
    }[];
}

const ToastContainer: React.FC<ToastContainerProps> = ({ notifications }) => {
    return (
        <div className="fixed top-5 right-5 z-50 space-y-3 w-80">
            {notifications.map(notification => (
                <Toast key={notification.id} message={notification.message} type={notification.type} />
            ))}
        </div>
    );
};

interface ToastProps {
    message: string;
    type: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ message, type }) => {
    const baseClasses = "flex items-center w-full p-4 text-white rounded-lg shadow-lg animate-toast-in";
    const typeClasses = {
        success: "bg-green-500",
        error: "bg-red-500"
    };

    const Icon = type === 'success' ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
    ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
    );

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-white bg-opacity-20">
                {Icon}
            </div>
            <div className="ms-3 text-sm font-medium">{message}</div>
        </div>
    );
};

export default ToastContainer;

