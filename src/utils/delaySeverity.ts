import { DelayLog } from '../types/database.ts';

export const getDelaySeverityClasses = (severity: DelayLog['severity']) => {
  switch (severity) {
    case 'Medium':
      return 'border-orange-200 bg-orange-50 text-orange-800';
    case 'High':
    case 'Critical':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    case 'Low':
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};
