import React, { useState } from 'react';

interface AdminSummaryDropdownProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

export const AdminSummaryDropdown: React.FC<AdminSummaryDropdownProps> = ({
  id,
  label,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-bold animate-pulse ${
          isOpen
            ? 'border-green-700 bg-green-700/80 text-white shadow-[0_0_14px_2px_rgba(21,128,61,0.8)]'
            : 'border-green-500 bg-green-500/40 text-green-950 shadow-[0_0_14px_2px_rgba(34,197,94,0.7)]'
        }`}
      >
        <span>{label}</span>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
          isOpen
            ? 'border-green-300/80 bg-green-800/60 text-white'
            : 'border-green-600/70 bg-green-100/70 text-green-900'
        }`}>
          {isOpen ? 'Hide' : 'Show'}
        </span>
      </button>
      <div
        id={id}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
};
