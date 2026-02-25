import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Account = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-10 text-center">
                <p className="text-gray-700">You are not logged in.</p>
                <Link to="/login" className="mt-4 inline-block rounded bg-black px-4 py-2 text-white">
                    Go to Login
                </Link>
            </div>
        );
    }

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="container mx-auto px-4 py-10">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h1 className="text-2xl font-semibold text-gray-900">Account</h1>
                <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <p><span className="font-semibold">Name:</span> {user.name || 'N/A'}</p>
                    <p><span className="font-semibold">Phone:</span> {user.phone || 'N/A'}</p>
                    <p><span className="font-semibold">Email:</span> {user.email || 'N/A'}</p>
                </div>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-6 rounded bg-black px-4 py-2 text-sm font-semibold text-white"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Account;
