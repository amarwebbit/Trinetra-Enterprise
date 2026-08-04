'use client';

import React, { useState } from 'react';
import { X, Delete, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GateCalculatorProps {
  onClose: () => void;
}

export default function GateCalculator({ onClose }: GateCalculatorProps) {
  const [display, setDisplay] = useState<string>('0');
  const [memory, setMemory] = useState<number>(0);
  const [isRad, setIsRad] = useState<boolean>(true); // true: Radian, false: Degree
  const [isShift, setIsShift] = useState<boolean>(false);
  const [history, setHistory] = useState<string>('');

  const appendToDisplay = (val: string) => {
    if (display === '0' || display === 'Error' || display === 'NaN') {
      setDisplay(val);
    } else {
      setDisplay((prev) => prev + val);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setHistory('');
  };

  const handleBackspace = () => {
    if (display.length <= 1 || display === 'Error' || display === 'NaN') {
      setDisplay('0');
    } else {
      setDisplay((prev) => prev.slice(0, -1));
    }
  };

  const handleEval = () => {
    try {
      let expr = display
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/mod/g, '%');

      // Safe evaluation
      // eslint-disable-next-line no-eval
      const res = eval(expr);
      setHistory(display + ' =');
      setDisplay(String(Number(res.toFixed(8))));
    } catch (err) {
      setDisplay('Error');
    }
  };

  const handleScientificFunc = (func: string) => {
    try {
      const num = parseFloat(display);
      if (isNaN(num)) return;

      let res = 0;
      let angle = isRad ? num : (num * Math.PI) / 180;

      switch (func) {
        case 'sin': res = Math.sin(angle); break;
        case 'cos': res = Math.cos(angle); break;
        case 'tan': res = Math.tan(angle); break;
        case 'asin': res = isRad ? Math.asin(num) : (Math.asin(num) * 180) / Math.PI; break;
        case 'acos': res = isRad ? Math.acos(num) : (Math.acos(num) * 180) / Math.PI; break;
        case 'atan': res = isRad ? Math.atan(num) : (Math.atan(num) * 180) / Math.PI; break;
        case 'sinh': res = Math.sinh(num); break;
        case 'cosh': res = Math.cosh(num); break;
        case 'tanh': res = Math.tanh(num); break;
        case 'asinh': res = Math.asinh(num); break;
        case 'acosh': res = Math.acosh(num); break;
        case 'atanh': res = Math.atanh(num); break;
        case 'ln': res = Math.log(num); break;
        case 'log': res = Math.log10(num); break;
        case 'sqrt': res = Math.sqrt(num); break;
        case 'cbrt': res = Math.cbrt(num); break;
        case 'square': res = num * num; break;
        case 'cube': res = num * num * num; break;
        case 'inv': res = 1 / num; break;
        case 'exp': res = Math.exp(num); break;
        case 'tenPower': res = Math.pow(10, num); break;
        case 'fact':
          if (num < 0 || num > 170) {
            setDisplay('Error');
            return;
          }
          let f = 1;
          for (let i = 1; i <= Math.floor(num); i++) f *= i;
          res = f;
          break;
        case 'abs': res = Math.abs(num); break;
        case 'neg': res = -num; break;
        default: break;
      }

      setHistory(`${func}(${display}) =`);
      setDisplay(String(Number(res.toFixed(8))));
    } catch (e) {
      setDisplay('Error');
    }
  };

  // Memory Functions
  const handleMemory = (action: 'MC' | 'MR' | 'MS' | 'M+' | 'M-') => {
    const num = parseFloat(display) || 0;
    switch (action) {
      case 'MC':
        setMemory(0);
        toast.info('Calculator Memory Cleared (MC)');
        break;
      case 'MR':
        setDisplay(String(memory));
        toast.info(`Recalled Memory: ${memory}`);
        break;
      case 'MS':
        setMemory(num);
        toast.info(`Stored in Memory: ${num}`);
        break;
      case 'M+':
        setMemory((prev) => prev + num);
        toast.info(`Added ${num} to Memory`);
        break;
      case 'M-':
        setMemory((prev) => prev - num);
        toast.info(`Subtracted ${num} from Memory`);
        break;
    }
  };

  return (
    <div className="bg-card border-2 border-primary w-[460px] shadow-2xl rounded-none overflow-hidden text-xs select-none animate-in zoom-in-95 duration-150">
      {/* TCS iON Header */}
      <div className="bg-primary text-primary-foreground px-3 py-2 flex items-center justify-between font-bold text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          TCS iON Official GATE Scientific Calculator
        </span>
        <button onClick={onClose} className="hover:opacity-80">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Screen Display */}
      <div className="bg-background border-b border-border p-3 space-y-1">
        <div className="text-right text-[10px] text-muted-foreground font-mono h-4 overflow-hidden">
          {history}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[10px] font-bold">
            <span className={isRad ? 'text-primary font-black bg-primary/10 px-1' : 'text-muted-foreground'}>RAD</span>
            <span className={!isRad ? 'text-primary font-black bg-primary/10 px-1' : 'text-muted-foreground'}>DEG</span>
            {memory !== 0 && <span className="bg-amber-500 text-black px-1.5 font-bold uppercase text-[9px]">M={memory}</span>}
          </div>

          <div className="text-right text-xl font-black font-mono tracking-wider text-foreground truncate max-w-[280px]">
            {display}
          </div>
        </div>
      </div>

      {/* Calculator Buttons Grid */}
      <div className="p-2.5 bg-muted/20 grid grid-cols-6 gap-1 text-[11px] font-bold text-foreground">
        {/* Row 1: Mode & Memory */}
        <button onClick={() => setIsRad(!isRad)} className="col-span-1 p-2 bg-card border border-border hover:bg-muted text-[10px] font-bold">
          {isRad ? 'Deg Mode' : 'Rad Mode'}
        </button>
        <button onClick={() => handleMemory('MC')} className="p-2 bg-card border border-border hover:bg-rose-500/10 text-rose-600 font-extrabold">MC</button>
        <button onClick={() => handleMemory('MR')} className="p-2 bg-card border border-border hover:bg-rose-500/10 text-rose-600 font-extrabold">MR</button>
        <button onClick={() => handleMemory('MS')} className="p-2 bg-card border border-border hover:bg-rose-500/10 text-rose-600 font-extrabold">MS</button>
        <button onClick={() => handleMemory('M+')} className="p-2 bg-card border border-border hover:bg-rose-500/10 text-rose-600 font-extrabold">M+</button>
        <button onClick={() => handleMemory('M-')} className="p-2 bg-card border border-border hover:bg-rose-500/10 text-rose-600 font-extrabold">M-</button>

        {/* Row 2: Trigonometric Standard & Inverse */}
        <button onClick={() => handleScientificFunc(isShift ? 'asin' : 'sin')} className="p-2 bg-card border border-border hover:bg-muted">
          {isShift ? 'sin⁻¹' : 'sin'}
        </button>
        <button onClick={() => handleScientificFunc(isShift ? 'acos' : 'cos')} className="p-2 bg-card border border-border hover:bg-muted">
          {isShift ? 'cos⁻¹' : 'cos'}
        </button>
        <button onClick={() => handleScientificFunc(isShift ? 'atan' : 'tan')} className="p-2 bg-card border border-border hover:bg-muted">
          {isShift ? 'tan⁻¹' : 'tan'}
        </button>
        <button onClick={() => handleScientificFunc('sinh')} className="p-2 bg-card border border-border hover:bg-muted">sinh</button>
        <button onClick={() => handleScientificFunc('cosh')} className="p-2 bg-card border border-border hover:bg-muted">cosh</button>
        <button onClick={() => handleScientificFunc('tanh')} className="p-2 bg-card border border-border hover:bg-muted">tanh</button>

        {/* Row 3: Logarithms & Exponential */}
        <button onClick={() => handleScientificFunc('ln')} className="p-2 bg-card border border-border hover:bg-muted">ln</button>
        <button onClick={() => handleScientificFunc('log')} className="p-2 bg-card border border-border hover:bg-muted font-bold">log₁₀</button>
        <button onClick={() => handleScientificFunc('exp')} className="p-2 bg-card border border-border hover:bg-muted">eˣ</button>
        <button onClick={() => handleScientificFunc('tenPower')} className="p-2 bg-card border border-border hover:bg-muted">10ˣ</button>
        <button onClick={() => handleScientificFunc('inv')} className="p-2 bg-card border border-border hover:bg-muted">1/x</button>
        <button onClick={() => appendToDisplay('mod')} className="p-2 bg-card border border-border hover:bg-muted font-bold text-primary">mod</button>

        {/* Row 4: Powers & Roots */}
        <button onClick={() => handleScientificFunc('square')} className="p-2 bg-card border border-border hover:bg-muted">x²</button>
        <button onClick={() => handleScientificFunc('cube')} className="p-2 bg-card border border-border hover:bg-muted">x³</button>
        <button onClick={() => handleScientificFunc('sqrt')} className="p-2 bg-card border border-border hover:bg-muted">√x</button>
        <button onClick={() => handleScientificFunc('cbrt')} className="p-2 bg-card border border-border hover:bg-muted">∛x</button>
        <button onClick={() => appendToDisplay('(')} className="p-2 bg-card border border-border hover:bg-muted">(</button>
        <button onClick={() => appendToDisplay(')')} className="p-2 bg-card border border-border hover:bg-muted">)</button>

        {/* Keypad Digits & Arithmetic */}
        <button onClick={() => appendToDisplay('7')} className="p-2.5 bg-card border border-border hover:bg-muted text-sm font-bold">7</button>
        <button onClick={() => appendToDisplay('8')} className="p-2.5 bg-card border border-border hover:bg-muted text-sm font-bold">8</button>
        <button onClick={() => appendToDisplay('9')} className="p-2.5 bg-card border border-border hover:bg-muted text-sm font-bold">9</button>
        <button onClick={handleBackspace} className="p-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
          <Delete className="h-4 w-4" />
        </button>
        <button onClick={handleClear} className="p-2.5 bg-rose-500/20 text-rose-600 border border-rose-500/30 font-extrabold">C</button>
        <button onClick={() => appendToDisplay('÷')} className="p-2.5 bg-primary/10 text-primary border border-primary/20 font-bold text-sm">÷</button>

        <button onClick={() => appendToDisplay('4')} className="p-2.5 bg-card border border-border hover:bg-muted text-sm font-bold">4</button>
        <button onClick={() => appendToDisplay('5')} className="p-2.5 bg-card border border-border hover:bg-muted text-sm font-bold">5</button>
        <button onClick={() => appendToDisplay('6')} className="p-2.5 bg-card border border-border hover:bg-muted text-sm font-bold">6</button>
        <button onClick={() => appendToDisplay('×')} className="p-2.5 bg-primary/10 text-primary border border-primary/20 font-bold text-sm">×</button>
        <button onClick={() => appendToDisplay('-')} className="p-2.5 bg-primary/10 text-primary border border-primary/20 font-bold text-sm">-</button>
        <button onClick={() => appendToDisplay('+')} className="p-2.5 bg-primary/10 text-primary border border-primary/20 font-bold text-sm">+</button>

        <button onClick={() => appendToDisplay('1')} className="p-2.5 bg-card border border-border hover:bg-muted text-sm font-bold">1</button>
        <button onClick={() => appendToDisplay('2')} className="p-2.5 bg-card border border-border hover:bg-muted text-sm font-bold">2</button>
        <button onClick={() => appendToDisplay('3')} className="p-2.5 bg-card border border-border hover:bg-muted text-sm font-bold">3</button>
        <button onClick={() => handleScientificFunc('fact')} className="p-2.5 bg-card border border-border hover:bg-muted">n!</button>
        <button onClick={() => appendToDisplay('π')} className="p-2.5 bg-card border border-border hover:bg-muted font-bold">π</button>
        <button onClick={handleEval} className="row-span-2 p-2.5 bg-primary text-primary-foreground font-black text-xl flex items-center justify-center shadow-md">
          =
        </button>

        <button onClick={() => appendToDisplay('0')} className="col-span-2 p-2.5 bg-card border border-border hover:bg-muted text-sm font-bold">0</button>
        <button onClick={() => appendToDisplay('.')} className="p-2.5 bg-card border border-border hover:bg-muted text-sm font-bold">.</button>
        <button onClick={() => handleScientificFunc('abs')} className="p-2.5 bg-card border border-border hover:bg-muted font-bold">|x|</button>
        <button onClick={() => appendToDisplay('e')} className="p-2.5 bg-card border border-border hover:bg-muted font-bold">e</button>
      </div>
    </div>
  );
}
