import React from 'react';
import GenericList from '../../components/GenericList';
import ErrorBoundary from '../../components/ErrorBoundary';

const BannerCategoryList = () => {
    const columns = [
        { header: 'ID', accessor: 'id', width: '10%' },
        { header: 'Name', accessor: 'name', width: '60%' },
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
            name: 'name',
            label: 'Category Name',
            type: 'text',
            required: true,
            placeholder: 'Enter banner category name',
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
                title="Banner Categories"
                endpoint="/admin/banner-categories"
                columns={columns}
                formFields={formFields}
                idField="id"
                nameField="name"
            />
        </ErrorBoundary>
    );
};

export default BannerCategoryList;
