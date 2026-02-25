import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';

const schema = Yup.object({
    phone: Yup.string().required('Phone is required'),
    password: Yup.string().required('Password is required'),
});

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md border">
                <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
                <Formik
                    initialValues={{ phone: '', password: '' }}
                    validationSchema={schema}
                    onSubmit={async (values, { setSubmitting, setErrors, setStatus }) => {
                        setStatus(null);
                        const result = await login(values.phone, values.password);

                        if (result.success) {
                            navigate('/');
                            return;
                        }

                        if (result.errors?.phone || result.errors?.password) {
                            setErrors({
                                phone: result.errors.phone,
                                password: result.errors.password,
                            });
                        }

                        if (result.errors?.message) {
                            setStatus(result.errors.message);
                        }

                        setSubmitting(false);
                    }}
                >
                    {({ isSubmitting, status }) => (
                        <Form className="space-y-4">
                            <div>
                                <label className="block text-gray-700 mb-2">Phone</label>
                                <Field name="phone" type="text" className="w-full border rounded px-3 py-2" />
                                <ErrorMessage name="phone" component="p" className="text-red-500 text-sm mt-1" />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-2">Password</label>
                                <Field name="password" type="password" className="w-full border rounded px-3 py-2" />
                                <ErrorMessage name="password" component="p" className="text-red-500 text-sm mt-1" />
                                {status && <p className="text-red-500 text-sm mt-1">{status}</p>}
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-70"
                            >
                                {isSubmitting ? 'Signing in...' : 'Login'}
                            </button>
                            <div className="text-center mt-4">
                                <Link to="/register" className="text-blue-600 hover:underline">
                                    Don&apos;t have an account? Register
                                </Link>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    );
};

export default Login;
