import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/button';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
}

export const DataTable = <T,>({
  columns,
  rows,
  keyField,
  onRowClick,
}: {
  columns: ColumnDef<T>[];
  rows: T[];
  keyField: (row: T) => string;
  onRowClick?: (row: T) => void;
}) => (
  <div className="table-wrapper">
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={keyField(row)}
            onClick={() => onRowClick?.(row)}
            className={onRowClick ? 'clickable-row' : ''}
          >
            {columns.map((column) => (
              <td key={column.key}>{column.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const PaginationControls = ({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>
        Page {page} of {totalPages}
      </span>
      <div>
        <Button variant="secondary" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
          Previous
        </Button>
        <Button
          variant="secondary"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
