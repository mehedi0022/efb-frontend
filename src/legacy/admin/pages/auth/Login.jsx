import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FiMail,
    FiUser,
    FiEye,
    FiEyeOff,
} from 'react-icons/fi';
import { useAdminFetchQuery, useAdminLoginMutation } from '../../../store/adminApi';
import { getDefaultAdminRoute } from '../../utils/rbac';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        remember: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [adminLogin] = useAdminLoginMutation();
    const { data: settingResponse } = useAdminFetchQuery({ url: '/v1/settings', tags: ['public-setting'] });

    const setting = settingResponse?.data || null;
    const appTitle = setting?.name || process.env.NEXT_PUBLIC_LOGIN_PAGE_TITLE || process.env.NEXT_PUBLIC_APP_NAME || 'Ecommerce';

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await adminLogin({
                email: formData.email,
                password: formData.password,
                remember: formData.remember,
            }).unwrap();

            localStorage.setItem('auth_token', response.token);
            if (response.refresh_token) {
                localStorage.setItem('admin_refresh_token', response.refresh_token);
            }
            localStorage.setItem('user', JSON.stringify(response.user));
            navigate(getDefaultAdminRoute(response.user));
        } catch (err) {
            setError(err?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getFormattedTitle = () => {
        const title = appTitle || process.env.NEXT_PUBLIC_LOGIN_PAGE_TITLE || process.env.NEXT_PUBLIC_APP_NAME || 'Ecommerce';
        const words = title.trim().split(/\s+/);
        if (words.length > 1) {
            return (
                <>
                    <span className="text-[#d7ecff]">{words[0]}</span>{' '}
                    <span className="text-white">{words.slice(1).join(' ')}</span>
                </>
            );
        } else {
            const word = words[0];
            const half = Math.ceil(word.length / 2);
            return (
                <>
                    <span className="text-[#d7ecff]">{word.slice(0, half)}</span>
                    <span className="text-white">{word.slice(half)}</span>
                </>
            );
        }
    };

    return (
        <div className="min-h-screen flex w-full">
            {/* Left Side - Branding (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 bg-[#2f80c0] items-center justify-center relative overflow-hidden">
                <div className="absolute left-1/2 top-10 -translate-x-1/2 text-center">
                    <h1 className="text-4xl font-bold tracking-wide">{getFormattedTitle()}</h1>
                </div>

                {/* Abstract Circles/Shapes typical of the design */}
                <div className="absolute top-20 left-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#1f5f94] opacity-35 rounded-full blur-3xl"></div>

                <div className="z-10 text-center px-10">

                    <div className="text-white space-y-2">
                        <h2 className="text-3xl font-bold">Your All-in-One Ecommerce & Dropshipping Solution</h2>
                        <p className="text-lg mt-3 text-white/80">Manage orders, track shipments, and scale your dropshipping business — all from one powerful dashboard.</p>
                        <div className="flex gap-4 justify-center mt-8">
                            <div className="bg-[#1f5f94]/55 p-4 rounded-lg backdrop-blur-sm">
                                <p className="text-2xl font-bold">5.5K+</p>
                                <p className="text-sm">Sellers</p>
                            </div>
                            <div className="bg-[#1f5f94]/55 p-4 rounded-lg backdrop-blur-sm">
                                <p className="text-2xl font-bold">50K+</p>
                                <p className="text-sm">Orders Processed</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 bg-[#f8f8f8] flex flex-col lg:items-center lg:justify-center">
                <div
                    className="h-[70px] w-full px-4 text-white lg:hidden"
                    style={{ backgroundColor: 'rgb(47 128 192 / var(--tw-bg-opacity, 1))' }}
                >
                    <div className="flex h-full items-center justify-center">
                        <h1 className="truncate text-center text-lg font-semibold">{appTitle}</h1>
                    </div>
                </div>

                <div className="w-full p-4 pt-6 sm:p-8">
                    <div className="mx-auto mb-5 hidden w-full max-w-md text-center lg:block">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Shop Name</p>
                        <h1 className="mt-1 truncate text-2xl font-bold text-gray-900">{appTitle}</h1>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-md bg-transparent mx-auto"
                    >

                        <div className="text-center mb-10">
                            <div className="w-16 h-16 bg-[#2f80c0] rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg text-white text-2xl">
                                <FiUser />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800">Login to C-Panel</h2>
                            <p className="text-gray-500 mt-2">Sign in to your Business dashboard</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded text-red-700">
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FiMail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-[#2f80c0] focus:border-[#2f80c0] sm:text-sm transition-colors"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Enter your password"
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2f80c0] focus:border-transparent transition-all outline-none"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center text-gray-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={formData.remember}
                                        onChange={handleChange}
                                        className="form-checkbox h-4 w-4 text-[#2f80c0] rounded focus:ring-[#2f80c0] border-gray-300"
                                    />
                                    <span className="ml-2 text-sm">Remember me</span>
                                </label>
                                <a href="#" className="text-sm text-[#2f80c0] font-semibold hover:underline">
                                    Forgot Password?
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 px-4 bg-[#232323] hover:bg-black text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing In...
                                    </span>
                                ) : (
                                    'Admin Sign In'
                                )}
                            </button>
                        </form>

                        <div className="mt-8 flex items-center justify-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> SSL Secured</span>
                            <span className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Support Time (10:00 AM – 8:00 PM)</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div >
    );
};

export default Login;
