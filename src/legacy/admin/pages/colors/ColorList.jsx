import React from 'react';
import GenericList from '../../components/GenericList';

const ColorList = () => {
    const columns = [
        {
            header: 'ID',
            accessor: 'id',
            width: '10%',
        },
        {
            header: 'Name',
            accessor: 'name',
            width: '50%',
        },
        {
            header: 'Status',
            accessor: 'status',
            width: '30%',
            render: (row) => (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${row.status === 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                    {row.status_text}
                </span>
            ),
        },
    ];

    const formFields = [
        {
            name: 'name',
            label: 'Color Name',
            type: 'text',
            required: true,
            placeholder: 'Enter color name',
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
        <GenericList
            title="Colors"
            endpoint="/admin/colors"
            columns={columns}
            formFields={formFields}
            idField="id"
            nameField="name"
        />
    );
};

export default ColorList;
