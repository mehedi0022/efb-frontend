import React, { useState } from 'react';
import clsx from 'clsx';
import Pagination from './Pagination';

const DataTable = ({
    columns = [],
    data = [],
    loading = false,
    selectable = false,
    onSelectionChange,
    selectedRowIds,
    selectionResetKey,
    pagination = {},
    onPageChange,
    striped = true,
    className = ''
}) => {
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const isSelectionControlled = Array.isArray(selectedRowIds);
    const activeSelection = isSelectionControlled ? selectedRowIds : selectedRows;

    React.useEffect(() => {
        if (!selectable) return;

        if (isSelectionControlled) {
            const checkedRows = Array.isArray(selectedRowIds) ? selectedRowIds : [];
            setSelectAll(data.length > 0 && checkedRows.length === data.length);
            return;
        }

        setSelectedRows((prev) => {
            const visibleIds = new Set(data.map((item) => item.id));
            const filtered = prev.filter((id) => visibleIds.has(id));
            setSelectAll(data.length > 0 && filtered.length === data.length);

            if (filtered.length !== prev.length) {
                onSelectionChange?.(filtered);
            }

            return filtered;
        });
    }, [data, selectable, isSelectionControlled, selectedRowIds, onSelectionChange]);

    React.useEffect(() => {
        if (!selectable) return;
        if (selectionResetKey === undefined || selectionResetKey === null) return;

        if (!isSelectionControlled) {
            setSelectedRows([]);
            setSelectAll(false);
        }
    }, [selectionResetKey, selectable, isSelectionControlled]);

    const applySelection = (nextSelection) => {
        if (!isSelectionControlled) {
            setSelectedRows(nextSelection);
        }
        setSelectAll(data.length > 0 && nextSelection.length === data.length);
        onSelectionChange?.(nextSelection);
    };

    const handleSelectAll = (e) => {
        const checked = e.target.checked;
        const newSelection = checked ? data.map(item => item.id) : [];
        applySelection(newSelection);
    };

    const handleSelectRow = (id) => {
        const newSelection = activeSelection.includes(id)
            ? activeSelection.filter(rowId => rowId !== id)
            : [...activeSelection, id];

        applySelection(newSelection);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-primary"></div>
            </div>
        );
    }

    return (
        <div className={clsx('overflow-x-auto', className)}>
            <table className="min-w-[840px] w-full divide-y divide-admin-gray-200">
                <thead className="bg-admin-dark text-white">
                    <tr>
                        {selectable && (
                            <th className="px-3 py-3 text-left sm:px-4">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                    className="rounded border-admin-gray-300 text-admin-primary focus:ring-admin-primary"
                                />
                            </th>
                        )}
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                className={clsx(
                                    'px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-admin-gray-100 sm:px-4',
                                    column.className
                                )}
                                style={{ width: column.width }}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className={clsx(
                    'bg-white divide-y divide-admin-gray-200',
                    striped && 'divide-y divide-admin-gray-200'
                )}>
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length + (selectable ? 1 : 0)}
                                className="px-3 py-8 text-center text-admin-gray-500 sm:px-4"
                            >
                                No data available
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIndex) => (
                            <tr
                                key={row.id || rowIndex}
                                className={clsx(
                                    'transition-colors hover:bg-admin-primary/5',
                                    striped && rowIndex % 2 === 0 && 'bg-admin-gray-50/70'
                                )}
                            >
                                {selectable && (
                                    <td className="px-3 py-3 sm:px-4">
                                        <input
                                            type="checkbox"
                                            checked={activeSelection.includes(row.id)}
                                            onChange={() => handleSelectRow(row.id)}
                                            className="rounded border-admin-gray-300 text-admin-primary focus:ring-admin-primary"
                                        />
                                    </td>
                                )}
                                {columns.map((column, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={clsx('px-3 py-3 text-sm sm:px-4', column.cellClassName)}
                                    >
                                        {column.render ? column.render(row, rowIndex) : row[column.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {pagination && pagination.total > 0 && (
                <div className="mt-4">
                    <Pagination
                        currentPage={pagination.current_page}
                        totalPages={pagination.last_page}
                        onPageChange={onPageChange}
                    />
                </div>
            )}
        </div>
    );
};

export default DataTable;
