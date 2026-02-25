import React from 'react';
import GenericList from '../../components/GenericList';
import { useAdminFetchQuery } from '../../../store/adminApi';

const SubcategoryList = () => {
    const { data: response } = useAdminFetchQuery({
        url: '/admin/categories',
        params: { per_page: 1000, status: 1 },
        tags: ['categories'],
    });
    const categories = response?.data || [];

    const columns = [
        {
            header: 'ID',
            accessor: 'id',
            width: '10%',
        },
        {
            header: 'Name',
            accessor: 'name',
            width: '30%',
        },
        {
            header: 'Category',
            accessor: 'category',
            width: '30%',
            render: (row) => row.category?.name || '-',
        },
        {
            header: 'Status',
            accessor: 'status',
            width: '20%',
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
            name: 'category_id',
            label: 'Category',
            type: 'select',
            required: true,
            options: categories.map(cat => ({
                value: cat.id,
                label: cat.name,
            })),
        },
        {
            name: 'name',
            label: 'Subcategory Name',
            type: 'text',
            required: true,
            placeholder: 'Enter subcategory name',
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
            title="Sub Categories"
            endpoint="/admin/subcategories"
            columns={columns}
            formFields={formFields}
            idField="id"
            nameField="name"
        />
    );
};

export default SubcategoryList;
