import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-slate-50 ${className}`}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`divide-y divide-slate-200 ${className}`}>
      {children}
    </tbody>
  );
};

interface TableRowProps extends TableProps {
  onClick?: () => void;
}

export const TableRow: React.FC<TableRowProps> = ({ children, className = '', onClick }) => {
  return (
    <tr 
      className={`hover:bg-slate-50 transition-colors ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <th className={`px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
};

interface TableCellProps extends TableProps {
  onClick?: (e: React.MouseEvent) => void;
}

export const TableCell: React.FC<TableCellProps> = ({ children, className = '', onClick }) => {
  return (
    <td 
      className={`px-6 py-4 text-sm text-slate-900 ${className}`}
      onClick={onClick}
    >
      {children}
    </td>
  );
};
