import React from 'react';

const Progress = ({ value, className = '', ...props }) => {
  const percentage = Math.min(Math.max(value || 0, 0), 100);
  
  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}
      {...props}
    >
      <div
        className="h-full bg-slate-900 transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export { Progress };