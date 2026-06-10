import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, X } from 'lucide-react';

const MultiSelect = ({ options, selected, onChange, placeholder = 'اختر الأجهزة...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const removeOption = (value) => {
    onChange(selected.filter((item) => item !== value));
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-[42px] items-center gap-2 rounded-md border border-input bg-background/70 px-3 py-2 text-sm cursor-pointer hover:border-primary/50 transition-colors"
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {selected.length === 0 && (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {selected.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {options.find((o) => o.value === val)?.label || val}
              <X
                size={14}
                className="cursor-pointer hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeOption(val);
                }}
              />
            </span>
          ))}
        </div>
        <ChevronDown
          size={18}
          className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto"
          >
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => toggleOption(option.value)}
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors ${
                  selected.includes(option.value) ? 'bg-primary/5' : ''
                }`}
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    selected.includes(option.value)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input'
                  }`}
                >
                  {selected.includes(option.value) && <Check size={12} />}
                </div>
                <span>{option.label}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MultiSelect;