import type { ReactNode } from "react";
import DataTable from "./DataTable";

type Column<T> = {
  key: keyof T;
  header: string;
  render?: (item: T) => ReactNode;
};

type TableProps<T> = {
  title: string;
  data: T[];
  columns: Column<T>[];
};

export const Table = <T extends Record<string, unknown>>({
  title,
  data,
  columns,
}: TableProps<T>) => (
  <DataTable
    title={title}
    data={data}
    getRowId={(item) =>
      String(
        (item as { id?: string }).id ??
          columns
            .map((column) => String(item[column.key] ?? ""))
            .join("-"),
      )
    }
    columns={columns.map((column) => ({
      key: String(column.key),
      label: column.header,
      render: (item: T) => (column.render ? column.render(item) : String(item[column.key] ?? "-")),
    }))}
  />
);

export default Table;
