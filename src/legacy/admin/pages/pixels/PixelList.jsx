import React from 'react';
import GenericList from '../../components/GenericList';
import ErrorBoundary from '../../components/ErrorBoundary';

const PixelList = () => {
    const columns = [
        { header: 'ID', accessor: 'id', width: '10%' },
        {
            header: 'Code',
            accessor: 'code',
            width: '60%',
            render: (row) => {
                const value = String(row.code || '').trim();
                const preview = value.length > 220 ? `${value.slice(0, 220)}...` : value;

                return (
                    <pre className="max-w-[560px] whitespace-pre-wrap break-all text-xs text-gray-700">
                        {preview || '-'}
                    </pre>
                );
            },
        },
        {
            header: 'Status',
            accessor: 'status',
            width: '20%',
            render: (row) => (
                <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${Number(row.status) === 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}
                >
                    {Number(row.status) === 1 ? 'Active' : 'Inactive'}
                </span>
            ),
        },
    ];

    const formFields = [
        {
            name: 'code',
            label: 'Pixel JavaScript / Script Code',
            type: 'textarea',
            required: true,
            rows: 10,
            placeholder: 'Paste full JavaScript snippet, script tag, or pixel ID',
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            required: true,
            options: [
                { value: 1, label: 'Active' },
                { value: 0, label: 'Inactive' },
            ],
        },
    ];

    return (
        <ErrorBoundary>
            <GenericList
                title="Facebook Pixels"
                endpoint="/admin/pixels"
                columns={columns}
                formFields={formFields}
                idField="id"
                nameField="code"
                singleRecordMode
            />
        </ErrorBoundary>
    );
};

export default PixelList;
