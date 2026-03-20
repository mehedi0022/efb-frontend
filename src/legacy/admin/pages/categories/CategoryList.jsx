import React from 'react';
import GenericList from '../../components/GenericList';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useAdminActionMutation } from '../../../store/adminApi';

const CATEGORY_DELETE_BLOCKED_MESSAGE = 'This category cannot be deleted because it contains subcategories or products. Please remove those items first before deleting the category.';

const toSafeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const hasCategoryDependencies = (row) => (
    toSafeNumber(row?.subcategories_count) > 0 || toSafeNumber(row?.products_count) > 0
);

const ShowHomeToggle = ({ row }) => {
    const [adminAction, { isLoading }] = useAdminActionMutation();

    const handleToggle = async () => {
        try {
            await adminAction({
                url: '/admin/categories/toggle-show-home',
                method: 'POST',
                body: {
                    category_id: row.id,
                    show_home: row.show_home ? 0 : 1,
                },
                invalidates: ['list:/admin/categories'],
            }).unwrap();
        } catch (error) {
            alert(error?.data?.message || 'Error toggling show home');
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${row.show_home
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                } ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
        >
            {isLoading ? '...' : (row.show_home ? '✅ On Home' : '➕ Add Home')}
        </button>
    );
};

const CategoryList = () => {
    const columns = [
        {
            header: 'ID',
            accessor: 'id',
            width: '8%',
        },
        {
            header: 'Name',
            accessor: 'name',
            width: '30%',
        },
        {
            header: 'Slug',
            accessor: 'slug',
            width: '25%',
        },
        {
            header: 'Status',
            accessor: 'status',
            width: '10%',
            render: (row) => (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${row.status === 1
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {row.status_text}
                </span>
            ),
        },
        {
            header: 'Show Home',
            accessor: 'show_home',
            width: '12%',
            render: (row) => <ShowHomeToggle row={row} />,
        },
        {
            header: 'Subcategories',
            accessor: 'subcategories_count',
            width: '10%',
            render: (row) => toSafeNumber(row.subcategories_count),
        },
        {
            header: 'Products',
            accessor: 'products_count',
            width: '8%',
            render: (row) => toSafeNumber(row.products_count),
        },
    ];

    const formFields = [
        {
            name: 'name',
            label: 'Category Name',
            type: 'text',
            required: true,
            placeholder: 'Enter category name',
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
                title="Categories"
                endpoint="/admin/categories"
                columns={columns}
                formFields={formFields}
                idField="id"
                nameField="name"
                getDeleteBlockReason={(rows = []) => (
                    rows.some((row) => hasCategoryDependencies(row))
                        ? CATEGORY_DELETE_BLOCKED_MESSAGE
                        : ''
                )}
            />
        </ErrorBoundary>
    );
};

export default CategoryList;
