'use client';

import React from 'react';

interface Column {
  key: string;
  header: string;
  render?: (item: any) => React.ReactNode;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  keyExtractor: (item: any) => string;
}

export function ResponsiveTable({ columns, data, keyExtractor }: ResponsiveTableProps) {
  return (
    <div className="overflow-x-auto -mx-3 md:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/40">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-3 md:px-4 py-2 md:py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider
                    ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                    ${column.hideOnTablet ? 'hidden md:table-cell' : ''}
                  `}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border/60">
            {data.map((item) => (
              <tr key={keyExtractor(item)} className="hover:bg-muted/20 transition-colors">
                {columns.map((column) => (
                  <td
                    key={`${keyExtractor(item)}-${column.key}`}
                    className={`
                      px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-foreground
                      ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                      ${column.hideOnTablet ? 'hidden md:table-cell' : ''}
                    `}
                  >
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
