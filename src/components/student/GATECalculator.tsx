'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface GATECalculatorProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  onClose?: () => void;
}

export function GATECalculator({ value = '', onChange, className = '', onClose }: GATECalculatorProps) {
  const [display, setDisplay] = useState(value || '0');
  const [expression, setExpression] = useState('');
  const [memory, setMemory] = useState<number | null>(null);
  const [isRadian, setIsRadian] = useState(false);
  const [isNewEntry, setIsNewEntry] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleNumber = (num: string) => {
    let newDisplay = display;
    if (isNewEntry) {
      newDisplay = num;
      setIsNewEntry(false);
    } else {
      newDisplay = display === '0' && num !== '.' ? num : display + num;
    }
    setDisplay(newDisplay);
    if (onChange) onChange(newDisplay);
  };

  const handleOperator = (op: string) => {
    let operator = op;
    if (op === 'mod') operator = '%';
    if (op === 'xⁿ') operator = '**';
    
    setExpression(expression + display + ' ' + operator + ' ');
    setIsNewEntry(true);
  };

  const handleParenthesis = (p: string) => {
    setExpression(expression + (isNewEntry && p === '(' ? ' ( ' : display + ' ' + p + ' '));
    setIsNewEntry(true);
  };
  
  const handleBackspace = () => {
    if (isNewEntry) return;
    const newDisplay = display.length > 1 ? display.slice(0, -1) : '0';
    setDisplay(newDisplay);
    if (newDisplay === '0') setIsNewEntry(true);
    if (onChange) onChange(newDisplay);
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setIsNewEntry(true);
    if (onChange) onChange('0');
  };

  const evaluate = (expr: string): number => {
    try {
      const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
      const fn = new Function(`return (${sanitized})`);
      return fn();
    } catch {
      return NaN;
    }
  };

  const handleCalculate = () => {
    try {
      const result = evaluate(expression + display);
      if (isNaN(result) || !isFinite(result)) {
        setDisplay('Error');
        setExpression('');
        setIsNewEntry(true);
        return;
      }
      
      const resStr = String(result);
      setDisplay(resStr);
      setExpression('');
      setIsNewEntry(true);
      if (onChange) onChange(resStr);
    } catch {
      setDisplay('Error');
    }
  };

  const factorial = (n: number): number => {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  };

  const handleFunction = (func: string) => {
    const num = parseFloat(display);
    if (isNaN(num) && func !== 'π' && func !== 'e') return;
    
    let result = num;
    let newEntry = true;
    
    switch(func) {
      case 'sinh': result = Math.sinh(num); break;
      case 'cosh': result = Math.cosh(num); break;
      case 'tanh': result = Math.tanh(num); break;
      case 'sinh⁻¹': result = Math.asinh(num); break;
      case 'cosh⁻¹': result = Math.acosh(num); break;
      case 'tanh⁻¹': result = Math.atanh(num); break;
      case 'Exp': result = Math.exp(num); break;
      case 'sqrt': result = Math.sqrt(num); break;
      case 'log₂x': result = Math.log2(num); break;
      case 'π': result = Math.PI; break;
      case 'e': result = Math.E; break;
      case 'n!': result = factorial(num); break;
      case '10ˣ': result = Math.pow(10, num); break;
      case 'sin': result = isRadian ? Math.sin(num) : Math.sin(num * Math.PI / 180); break;
      case 'cos': result = isRadian ? Math.cos(num) : Math.cos(num * Math.PI / 180); break;
      case 'tan': result = isRadian ? Math.tan(num) : Math.tan(num * Math.PI / 180); break;
      case 'x³': result = num * num * num; break;
      case 'x²': result = num * num; break;
      case 'sin⁻¹': result = isRadian ? Math.asin(num) : Math.asin(num) * 180 / Math.PI; break;
      case 'cos⁻¹': result = isRadian ? Math.acos(num) : Math.acos(num) * 180 / Math.PI; break;
      case 'tan⁻¹': result = isRadian ? Math.atan(num) : Math.atan(num) * 180 / Math.PI; break;
      case '³√x': result = Math.cbrt(num); break;
      case '|x|': result = Math.abs(num); break;
      case '1/x': result = 1 / num; break;
      case '+/-': result = num * -1; newEntry = false; break;
    }
    
    const resStr = String(result);
    setDisplay(resStr);
    setIsNewEntry(newEntry);
    if (onChange) onChange(resStr);
  };

  const handleMemory = (action: string) => {
    const num = parseFloat(display);
    switch(action) {
      case 'MC': setMemory(null); break;
      case 'MR': 
        if (memory !== null) {
          setDisplay(String(memory));
          setIsNewEntry(true);
          if (onChange) onChange(String(memory));
        }
        break;
      case 'MS': setMemory(num); break;
      case 'M+': setMemory((memory || 0) + (isNaN(num) ? 0 : num)); break;
      case 'M-': setMemory((memory || 0) - (isNaN(num) ? 0 : num)); break;
    }
  };

  return (
    <>
      <style>{`
        .gate-calc-container {
          background: #e8ecf2;
          border: 1px solid #a6b5c9;
          border-radius: 4px;
          padding: 8px;
          width: 550px;
          font-family: Arial, sans-serif;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .gate-title-bar {
          background: linear-gradient(to bottom, #eff4fa, #dce6f2);
          border: 1px solid #a6b5c9;
          border-bottom: none;
          border-radius: 4px 4px 0 0;
          padding: 4px 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: grab;
          color: #333;
        }

        .gate-title-bar:active {
          cursor: grabbing;
        }

        .gate-display-area {
          background: white;
          border: 1px solid #a6b5c9;
          border-radius: 2px;
          padding: 4px 8px;
          margin-bottom: 8px;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
        }

        .gate-expression {
          font-size: 11px;
          color: #666;
          height: 14px;
          text-align: right;
        }

        .gate-main-display {
          font-size: 20px;
          font-weight: bold;
          text-align: right;
          color: black;
          overflow: hidden;
          white-space: nowrap;
        }

        .gate-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 2px;
        }

        .gate-btn {
          border: 1px solid #ccc;
          border-radius: 2px;
          padding: 6px 2px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
        }

        .gate-btn:active {
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
        }

        .gate-btn.scientific {
          background: #f5f5f5;
        }
        
        .gate-btn.scientific:hover {
          background: #e8e8e8;
        }

        .gate-btn.number {
          background: #ffffff;
          font-size: 13px;
          font-weight: bold;
        }

        .gate-btn.number:hover {
          background: #f0f0f0;
        }

        .gate-btn.operator {
          background: #fff3e0;
          color: #d35400;
        }

        .gate-btn.operator:hover {
          background: #ffe0b2;
        }

        .gate-btn.clear {
          background: #d9534f;
          color: white;
          border-color: #d43f3a;
        }

        .gate-btn.clear:hover {
          background: #c9302c;
        }

        .gate-btn.memory {
          background: #e0e0e0;
        }

        .gate-btn.memory:hover {
          background: #d5d5d5;
        }
          
        .gate-btn.equals {
          background: #fff3e0;
          color: #d35400;
        }
        
        .gate-btn.equals:hover {
          background: #ffe0b2;
        }

        .gate-radio-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .gate-radio-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          cursor: pointer;
        }
      `}</style>
      
      <div 
        ref={modalRef}
        className={`fixed z-50 ${className}`}
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <div className="gate-title-bar" onMouseDown={handleMouseDown}>
          <div className="font-semibold text-xs">Scientific Calculator</div>
          <div className="flex items-center gap-2">
            <button className="text-xs text-blue-600 hover:underline px-1" onClick={() => setShowHelp(!showHelp)}>
              {showHelp ? 'Calc' : 'Help'}
            </button>
            {onClose && (
              <button onClick={onClose} className="hover:bg-red-500 hover:text-white p-0.5 rounded transition-colors text-slate-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="gate-calc-container rounded-t-none">
          {showHelp ? (
            <div className="p-4 text-[11px] overflow-y-auto h-[320px] bg-slate-50 text-slate-800 space-y-3 font-sans" style={{ width: '532px' }}>
              <h3 className="font-bold text-xs text-blue-800 border-b pb-1 mb-2">GATE Scientific Calculator Guide</h3>
              <div>
                <h4 className="font-bold text-blue-700">Trigonometry & Hyperbolic</h4>
                <p>Use <strong>sin, cos, tan</strong> for standard trig, and <strong>sinh, cosh, tanh</strong> for hyperbolic functions. Toggle between degrees (Deg) and radians (Rad) at the top of the calculator.</p>
              </div>
              <div>
                <h4 className="font-bold text-blue-700">Memory Functions (MC, MR, MS, M+, M-)</h4>
                <p><strong>MC:</strong> Clear memory. <strong>MR:</strong> Recall stored memory value. <strong>MS:</strong> Store current value in memory. <strong>M+:</strong> Add current display value to memory. <strong>M-:</strong> Subtract current display value from memory.</p>
              </div>
              <div>
                <h4 className="font-bold text-blue-700">Exponentiation & Remainder</h4>
                <p>Use <strong>xⁿ</strong> for power functions (e.g. 2 xⁿ 3 = 8). Use <strong>mod</strong> to calculate remainder/modulo.</p>
              </div>
              <div>
                <h4 className="font-bold text-blue-700">Logarithms & Roots</h4>
                <p>Use <strong>ln</strong> for natural log, <strong>log</strong> for base 10, and <strong>sqrt</strong> for square root.</p>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded transition-colors text-xs"
              >
                Return to Calculator
              </button>
            </div>
          ) : (
            <>
              <div className="gate-display-area">
                <div className="gate-expression">{expression}</div>
                <div className="gate-main-display">{display}</div>
                <div className="flex justify-between text-[10px] text-slate-500 h-[15px] font-bold">
                  <span>{memory !== null ? 'M' : ''}</span>
                </div>
              </div>

              <div className="flex items-center mb-2 gap-4">
                <button className="gate-btn scientific px-3" onClick={() => handleOperator('mod')}>mod</button>
                <div className="gate-radio-group ml-4">
                  <label className="gate-radio-label">
                    <input type="radio" checked={!isRadian} onChange={() => setIsRadian(false)} className="w-3 h-3" />
                    Deg
                  </label>
                  <label className="gate-radio-label">
                    <input type="radio" checked={isRadian} onChange={() => setIsRadian(true)} className="w-3 h-3" />
                    Rad
                  </label>
                </div>
              </div>

              <div className="gate-grid">
                {/* Row 3 (Memory) */}
                <button className="gate-btn memory" style={{ gridColumn: 'span 2' }} onClick={() => handleMemory('MC')}>MC</button>
                <button className="gate-btn memory" style={{ gridColumn: 'span 2' }} onClick={() => handleMemory('MR')}>MR</button>
                <button className="gate-btn memory" style={{ gridColumn: 'span 2' }} onClick={() => handleMemory('MS')}>MS</button>
                <button className="gate-btn memory" style={{ gridColumn: 'span 2' }} onClick={() => handleMemory('M+')}>M+</button>
                <button className="gate-btn memory" style={{ gridColumn: 'span 2' }} onClick={() => handleMemory('M-')}>M-</button>

                {/* Row 4 */}
                <button className="gate-btn scientific" onClick={() => handleFunction('sinh')}>sinh</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('cosh')}>cosh</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('tanh')}>tanh</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('Exp')}>Exp</button>
                <button className="gate-btn scientific" onClick={() => handleParenthesis('(')}>(</button>
                <button className="gate-btn clear" style={{ gridColumn: 'span 2' }} onClick={handleBackspace}>←</button>
                <button className="gate-btn clear" onClick={handleClear}>C</button>
                <button className="gate-btn operator" onClick={() => handleFunction('+/-')}>+/-</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('sqrt')}>sqrt</button>

                {/* Row 5 */}
                <button className="gate-btn scientific" onClick={() => handleFunction('sinh⁻¹')}>sinh⁻¹</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('cosh⁻¹')}>cosh⁻¹</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('tanh⁻¹')}>tanh⁻¹</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('log₂x')}>log₂x</button>
                <button className="gate-btn scientific" onClick={() => handleParenthesis(')')}>)</button>
                <button className="gate-btn number" onClick={() => handleNumber('7')}>7</button>
                <button className="gate-btn number" onClick={() => handleNumber('8')}>8</button>
                <button className="gate-btn number" onClick={() => handleNumber('9')}>9</button>
                <button className="gate-btn operator" onClick={() => handleOperator('/')}>/</button>
                <button className="gate-btn operator" onClick={() => handleOperator('%')}>%</button>

                {/* Row 6 */}
                <button className="gate-btn scientific" onClick={() => handleFunction('π')}>π</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('e')}>e</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('n!')}>n!</button>
                <button className="gate-btn scientific" onClick={() => handleOperator('xⁿ')}>xⁿ</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('10ˣ')}>10ˣ</button>
                <button className="gate-btn number" onClick={() => handleNumber('4')}>4</button>
                <button className="gate-btn number" onClick={() => handleNumber('5')}>5</button>
                <button className="gate-btn number" onClick={() => handleNumber('6')}>6</button>
                <button className="gate-btn operator" onClick={() => handleOperator('*')}>*</button>
                <button className="gate-btn operator" onClick={() => handleFunction('1/x')}>1/x</button>

                {/* Row 7 */}
                <button className="gate-btn scientific" onClick={() => handleFunction('sin')}>sin</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('cos')}>cos</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('tan')}>tan</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('x³')}>x³</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('x²')}>x²</button>
                <button className="gate-btn number" onClick={() => handleNumber('1')}>1</button>
                <button className="gate-btn number" onClick={() => handleNumber('2')}>2</button>
                <button className="gate-btn number" onClick={() => handleNumber('3')}>3</button>
                <button className="gate-btn operator" onClick={() => handleOperator('-')}>-</button>
                <button className="gate-btn equals" style={{ gridRow: 'span 2' }} onClick={handleCalculate}>=</button>

                {/* Row 8 */}
                <button className="gate-btn scientific" onClick={() => handleFunction('sin⁻¹')}>sin⁻¹</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('cos⁻¹')}>cos⁻¹</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('tan⁻¹')}>tan⁻¹</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('³√x')}>³√x</button>
                <button className="gate-btn scientific" onClick={() => handleFunction('|x|')}>|x|</button>
                <button className="gate-btn number" style={{ gridColumn: 'span 2' }} onClick={() => handleNumber('0')}>0</button>
                <button className="gate-btn number" onClick={() => handleNumber('.')}>.</button>
                <button className="gate-btn operator" onClick={() => handleOperator('+')}>+</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
