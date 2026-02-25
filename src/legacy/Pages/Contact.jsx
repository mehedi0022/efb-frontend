import React, { useState } from 'react';
import { useSiteData } from '../context/SiteDataContext';

const Contact = () => {
    const { contact } = useSiteData();
    const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' });

    const handleSubmit = (event) => {
        event.preventDefault();
        alert('Thanks! We received your message.');
        setForm({ name: '', phone: '', email: '', subject: '', message: '' });
    };

    return (
        <div className="container mx-auto px-4 py-10">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-sm text-gray-500">Hotline</p>
                        <a href={`tel:${contact?.hotline || ''}`} className="text-lg font-semibold text-gray-900">
                            {contact?.hotline || 'Not available'}
                        </a>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-sm text-gray-500">Email</p>
                        <a href={`mailto:${contact?.email || ''}`} className="text-lg font-semibold text-gray-900">
                            {contact?.email || 'Not available'}
                        </a>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="text-base text-gray-800">{contact?.address || 'Not available'}</p>
                    </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Send a message</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full rounded border border-gray-300 px-3 py-2"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Mobile Number"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="w-full rounded border border-gray-300 px-3 py-2"
                                required
                            />
                        </div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full rounded border border-gray-300 px-3 py-2"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Subject"
                            value={form.subject}
                            onChange={(e) => setForm({ ...form, subject: e.target.value })}
                            className="w-full rounded border border-gray-300 px-3 py-2"
                            required
                        />
                        <textarea
                            placeholder="Write your message"
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                            className="w-full rounded border border-gray-300 px-3 py-2"
                            rows="4"
                            required
                        />
                        <button type="submit" className="w-full rounded bg-black px-4 py-2 text-white">
                            Send Message
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;
