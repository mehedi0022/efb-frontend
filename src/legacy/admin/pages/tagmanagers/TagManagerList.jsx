import React from 'react';
import GenericList from '../../components/GenericList';
import ErrorBoundary from '../../components/ErrorBoundary';

const TagManagerList = () => {
    const columns = [
        { header: 'ID', accessor: 'id', width: '10%' },
        { header: 'Code', accessor: 'code', width: '60%' },
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
            label: 'GTM Code',
            type: 'text',
            required: true,
            placeholder: 'Enter GTM code',
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
                title="Google Tag Manager"
                endpoint="/admin/tag-managers"
                columns={columns}
                formFields={formFields}
                idField="id"
                nameField="code"
            />
        </ErrorBoundary>
    );
};

export default TagManagerList;
