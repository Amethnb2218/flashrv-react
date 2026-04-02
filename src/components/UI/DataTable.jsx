import React from "react";
import { FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight, FiUsers } from "react-icons/fi";

export default function DataTable({
  columns,
  data,
  loading = false,
  toolbar,
  rowActions,
  emptyLabel = "Aucun résultat",
  onRefresh,
  pagination,
  className = "",
}) {
  // Pagination: {page, pageCount, onPrev, onNext}
  return (
    <div className={`overflow-x-auto scrollbar-hide app-panel ${className}`}>
      {toolbar && (
        <div className="app-panel-header flex flex-col gap-2 border-b p-4 md:flex-row md:items-center md:justify-between">
          {toolbar}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn-secondary ml-auto flex items-center gap-2 px-4 py-2"
            >
              <FiRefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          )}
        </div>
      )}
      <table className="w-full text-base text-[#4f3821] font-inter">
        <thead className="sticky top-0 z-10 bg-[#fff2df] text-xs font-bold uppercase text-[#7a6148]">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={`py-3 px-4 whitespace-nowrap align-middle ${col.key === 'email' ? 'text-center' : col.key === 'status' ? 'text-center' : 'text-left'}`}
                style={col.key === 'email' ? {textAlign: 'center'} : col.key === 'status' ? {textAlign: 'center'} : {}}
              >
                {col.label}
              </th>
            ))}
            {rowActions && <th className="py-3 px-4 text-right align-middle whitespace-nowrap">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map(col => (
                    <td key={col.key} className="py-4 px-4 align-middle">
                      <div className="mx-auto h-4 w-3/4 rounded bg-[#f2e2cc]" />
                    </td>
                  ))}
                  {rowActions && <td className="py-4 px-4 align-middle"><div className="ml-auto h-4 w-20 rounded bg-[#f2e2cc]" /></td>}
                </tr>
              ))
            : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (rowActions ? 1 : 0)} className="py-12 text-center font-medium text-[#8f7761]">
                    <div className="flex flex-col items-center gap-2">
                      <FiUsers className="mb-2 h-10 w-10 text-[#d6b081]" />
                      <div>{emptyLabel}</div>
                      {onRefresh && (
                        <button
                          onClick={onRefresh}
                          className="btn-secondary mt-2 flex items-center gap-2 px-4 py-2"
                        >
                          <FiRefreshCw className="w-4 h-4" />
                          Actualiser
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={row.id || i} className="border-b border-[var(--line)] hover:bg-[#fff6ea]">
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={`py-4 px-4 align-middle ${col.key === 'status' ? 'text-center' : ''}`}
                        style={col.key === 'status' ? {textAlign: 'center'} : {}}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="py-4 px-4 align-middle text-right">
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                ))
              )}
        </tbody>
      </table>
      {pagination && (
        <div className="app-panel-header flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-[#7a6148]">
            Page {pagination.page} / {pagination.pageCount}
          </span>
          <div className="flex gap-2">
            <button
              onClick={pagination.onPrev}
              disabled={pagination.page <= 1}
              className="rounded-none border border-[var(--line)] bg-[#fff8ee] px-3 py-1 text-[#7a6148] hover:bg-[#fff2df] disabled:opacity-50"
            >
              <FiChevronLeft />
            </button>
            <button
              onClick={pagination.onNext}
              disabled={pagination.page >= pagination.pageCount}
              className="rounded-none border border-[var(--line)] bg-[#fff8ee] px-3 py-1 text-[#7a6148] hover:bg-[#fff2df] disabled:opacity-50"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
