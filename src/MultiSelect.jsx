import React, { useState } from 'react';

export default function MultiSelect({ options, selectedOptions, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option) => {
    if (selectedOptions.includes(option)) {
      onChange(selectedOptions.filter((o) => o !== option));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  return (
    <div className="relative">
      <div
        className="border p-2 rounded cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOptions.length > 0
          ? selectedOptions.join(', ')
          : 'اختر الأجهزة المتخصصة'}
      </div>
      {isOpen && (
        <div className="absolute z-10 bg-white border rounded mt-1 w-full max-h-48 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option}
              className={`p-2 cursor-pointer hover:bg-gray-100 ${
                selectedOptions.includes(option) ? 'bg-gray-200 font-semibold' : ''
              }`}
              onClick={() => toggleOption(option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
