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
    <div className={`overflow-x-auto rounded-2xl border border-slate-200/70 shadow-sm bg-white ${className}`}>
      {toolbar && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-4 border-b border-slate-100 bg-slate-50">
          {toolbar}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="ml-auto flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 font-semibold shadow-sm hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition"
            >
              <FiRefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          )}
        </div>
      )}
      <table className="w-full text-slate-700 font-inter text-base">
        <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-600 sticky top-0 z-10">
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
            {rowActions && <th className="py-3 px-4 text-center align-middle w-44">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map(col => (
                    <td key={col.key} className="py-4 px-4 align-middle">
                      <div className="h-4 bg-slate-100 rounded w-3/4 mx-auto" />
                    </td>
                  ))}
                  {rowActions && <td className="py-4 px-4 align-middle w-44"><div className="h-4 bg-slate-100 rounded w-8 mx-auto" /></td>}
                </tr>
              ))
            : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (rowActions ? 1 : 0)} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <FiUsers className="w-10 h-10 mb-2 text-slate-200" />
                      <div>{emptyLabel}</div>
                      {onRefresh && (
                        <button
                          onClick={onRefresh}
                          className="mt-2 flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 font-semibold shadow-sm hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition"
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
                  <tr key={row.id || i} className="hover:bg-slate-50/70 border-b border-slate-100">
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
                      <td className="py-4 px-4 align-middle text-center w-44">
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                ))
              )}
        </tbody>
      </table>
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-500">
            Page {pagination.page} / {pagination.pageCount}
          </span>
          <div className="flex gap-2">
            <button
              onClick={pagination.onPrev}
              disabled={pagination.page <= 1}
              className="px-3 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
            >
              <FiChevronLeft />
            </button>
            <button
              onClick={pagination.onNext}
              disabled={pagination.page >= pagination.pageCount}
              className="px-3 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
