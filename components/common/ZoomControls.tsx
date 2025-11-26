import React, { useState, useEffect } from 'react';

export const ZoomControls: React.FC = () => {
    // State to track the current zoom scale factor
    const [scale, setScale] = useState(1);

    // Effect to set the initial scale based on the CSS variable when the component mounts
    useEffect(() => {
        const rootStyle = getComputedStyle(document.documentElement);
        const currentFontSize = rootStyle.getPropertyValue('--root-font-size').replace('px', '');
        if (currentFontSize && !isNaN(parseFloat(currentFontSize))) {
            setScale(parseFloat(currentFontSize) / 16); // Assuming 16px is the base
        }
    }, []);

    // Function to change the scale, clamped between 75% and 150%
    const changeScale = (delta: number) => {
        const nextScale = Math.min(1.5, Math.max(0.75, +(scale + delta).toFixed(2)));
        setScale(nextScale);
        document.documentElement.style.setProperty('--root-font-size', `${16 * nextScale}px`);
    };

    // Function to reset the scale to 100%
    const resetScale = () => {
        setScale(1);
        document.documentElement.style.setProperty('--root-font-size', '16px');
    };

    return (
        <div 
            className="flex items-center space-x-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg p-1" 
            role="group" 
            aria-label="Controles de zoom"
        >
            <button 
                onClick={() => changeScale(-0.1)} 
                disabled={scale <= 0.75}
                className="px-3 py-1.5 rounded text-lg font-bold disabled:opacity-50 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Diminuir zoom"
            >
                -
            </button>
            <span 
                className="w-12 text-center text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums flex items-center justify-center"
                aria-live="polite"
            >
                {Math.round(scale * 100)}%
            </span>
            <button 
                onClick={() => changeScale(0.1)} 
                disabled={scale >= 1.5}
                className="px-3 py-1.5 rounded text-lg font-bold disabled:opacity-50 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Aumentar zoom"
            >
                +
            </button>
            <button 
                onClick={resetScale} 
                className="px-3 py-1.5 rounded text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Resetar zoom"
            >
                Resetar
            </button>
        </div>
    );
};
