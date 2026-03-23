import { useState, useEffect } from 'react';
import { Smartphone, MousePointer2 } from 'lucide-react';

export interface PeckingStationState {
  displayValue: string;
  history: string[];
}

export default function PeckingStation({ 
  state, 
  setState 
}: { 
  state: PeckingStationState, 
  setState: React.Dispatch<React.SetStateAction<PeckingStationState>> 
}) {
  const handleButtonClick = (value: string) => {
    setState(prev => {
      let newDisplay = prev.displayValue;
      if (value === 'C') {
        newDisplay = '0';
      } else if (value === '=') {
        try {
          // Safe eval for simple calculator
          newDisplay = String(eval(prev.displayValue.replace(/x/g, '*')));
        } catch (e) {
          newDisplay = 'Error';
        }
      } else {
        if (newDisplay === '0' || newDisplay === 'Error') {
          newDisplay = value;
        } else {
          newDisplay += value;
        }
      }
      return {
        ...prev,
        displayValue: newDisplay,
        history: [...prev.history, `Clicked ${value}`]
      };
    });
  };

  // Expose the peck function globally so the tool can call it
  useEffect(() => {
    (window as any).__peckElement = (elementId: string) => {
      const el = document.getElementById(elementId);
      if (el) {
        el.click();
        return `Successfully pecked element: ${elementId}`;
      }
      return `Error: Element ${elementId} not found on screen.`;
    };

    (window as any).__readScreen = () => {
      const elements = document.querySelectorAll('[data-peckable]');
      const tree = Array.from(elements).map(el => ({
        id: el.id,
        type: el.tagName.toLowerCase(),
        text: el.textContent?.trim(),
        role: el.getAttribute('role') || 'button'
      }));
      return JSON.stringify({
        viewport: 'Calculator App',
        elements: tree,
        displayValue: state.displayValue
      }, null, 2);
    };

    return () => {
      delete (window as any).__peckElement;
      delete (window as any).__readScreen;
    };
  }, [state.displayValue]);

  const buttons = [
    ['C', '(', ')', '/'],
    ['7', '8', '9', 'x'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '=']
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-4">
      <div className="flex items-center space-x-2 text-zinc-400 mb-6">
        <Smartphone className="w-5 h-5" />
        <span className="text-sm uppercase tracking-wider font-semibold">Pecking Station</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-64 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-2xl relative overflow-hidden">
          {/* Mock Status Bar */}
          <div className="flex justify-between items-center text-[10px] text-zinc-500 mb-6 px-2">
            <span>12:00</span>
            <div className="flex space-x-1">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>

          {/* Calculator Display */}
          <div 
            id="calc-display" 
            data-peckable="true"
            role="display"
            className="bg-zinc-950 rounded-2xl p-4 mb-6 text-right text-3xl font-mono overflow-hidden whitespace-nowrap border border-zinc-800"
          >
            {state.displayValue}
          </div>

          {/* Calculator Keypad */}
          <div className="grid grid-cols-4 gap-2">
            {buttons.map((row, rowIndex) => 
              row.map((btn, colIndex) => (
                <button
                  key={btn}
                  id={`btn-${btn === '=' ? 'equals' : btn === '+' ? 'plus' : btn === '-' ? 'minus' : btn === 'x' ? 'multiply' : btn === '/' ? 'divide' : btn === '(' ? 'lparen' : btn === ')' ? 'rparen' : btn === '.' ? 'dot' : btn}`}
                  data-peckable="true"
                  onClick={() => handleButtonClick(btn)}
                  className={`
                    h-12 rounded-full flex items-center justify-center text-lg font-medium transition-colors active:scale-95
                    ${btn === 'C' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 col-span-1' : ''}
                    ${btn === '=' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 col-span-1' : ''}
                    ${['/', 'x', '-', '+'].includes(btn) ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : ''}
                    ${!['C', '=', '/', 'x', '-', '+'].includes(btn) ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : ''}
                    ${btn === '0' ? 'col-span-2' : ''}
                  `}
                >
                  {btn}
                </button>
              ))
            )}
          </div>

          {/* Overlay to show it's a simulated device */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none border-4 border-zinc-800/50 rounded-3xl"></div>
        </div>
      </div>

      <div className="mt-6 bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
        <div className="flex items-center space-x-2 text-zinc-500 mb-2">
          <MousePointer2 className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Action Log</span>
        </div>
        <div className="h-24 overflow-y-auto text-xs font-mono text-zinc-400 space-y-1">
          {state.history.length === 0 ? (
            <span className="italic opacity-50">No actions yet...</span>
          ) : (
            state.history.slice(-10).map((log, i) => (
              <div key={i}>{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
