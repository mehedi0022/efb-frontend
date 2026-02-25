import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';

const schema = Yup.object({
    name: Yup.string().required('Name is required'),
    phone: Yup.string().required('Phone is required'),
    password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    password_confirmation: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords do not match')
        .required('Password confirmation is required'),
});

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md border">
                <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
                <Formik
                    initialValues={{
                        name: '',
                        phone: '',
                        password: '',
                        password_confirmation: '',
                    }}
                    validationSchema={schema}
                    onSubmit={async (values, { setSubmitting, setErrors, setStatus }) => {
                        setStatus(null);
                        const result = await register(values);

                        if (result.success) {
                            navigate('/');
                            return;
                        }

                        if (result.errors) {
                            setErrors({
                                name: result.errors.name,
                                phone: result.errors.phone,
                                password: result.errors.password,
                                password_confirmation: result.errors.password_confirmation,
                            });
                            if (result.errors.message) {
                                setStatus(result.errors.message);
                            }
                        }

                        setSubmitting(false);
                    }}
                >
                    {({ isSubmitting, status }) => (
                        <Form className="space-y-4">
                            <div>
                                <label className="block text-gray-700 mb-2">Name</label>
                                <Field name="name" type="text" className="w-full border rounded px-3 py-2" />
                                <ErrorMessage name="name" component="p" className="text-red-500 text-sm mt-1" />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-2">Phone</label>
                                <Field name="phone" type="text" className="w-full border rounded px-3 py-2" />
                                <ErrorMessage name="phone" component="p" className="text-red-500 text-sm mt-1" />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-2">Password</label>
                                <Field name="password" type="password" className="w-full border rounded px-3 py-2" />
                                <ErrorMessage name="password" component="p" className="text-red-500 text-sm mt-1" />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-2">Confirm Password</label>
                                <Field name="password_confirmation" type="password" className="w-full border rounded px-3 py-2" />
                                <ErrorMessage name="password_confirmation" component="p" className="text-red-500 text-sm mt-1" />
                                {status && <p className="text-red-500 text-sm mt-1">{status}</p>}
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-70"
                            >
                                {isSubmitting ? 'Creating account...' : 'Register'}
                            </button>
                            <div className="text-center mt-4">
                                <Link to="/login" className="text-blue-600 hover:underline">
                                    Already have an account? Login
                                </Link>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    );
};

export default Register;
