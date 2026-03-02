// Format currency
export const formatCurrency = (amount) => {
    return `৳${parseFloat(amount).toLocaleString('en-BD', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

// Format date
export const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB');
};

// Format datetime
export const formatDateTime = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB')}`;
};

// Time ago helper
export const timeAgo = (date) => {
    if (!date) return '-';
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }

    return 'just now';
};

// Truncate text
export const truncate = (str, length = 50) => {
    if (!str) return '';
    return str.length > length ? `${str.substring(0, length)}...` : str;
};

// Get initials from name
export const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Debounce function
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Get status badge color
export const getStatusColor = (status) => {
    const colors = {
        'new order': 'bg-yellow-100 text-yellow-800',
        'new-order': 'bg-yellow-100 text-yellow-800',
        pending: 'bg-yellow-100 text-yellow-800',
        complete: 'bg-emerald-600 text-white',
        completed: 'bg-emerald-600 text-white',
        'no response': 'bg-slate-100 text-slate-800',
        'no-response': 'bg-slate-100 text-slate-800',
        hold: 'bg-orange-100 text-orange-800',
        cancel: 'bg-red-100 text-red-800',
        cancelled: 'bg-red-100 text-red-800',
        canceled: 'bg-red-100 text-red-800',
        'fb sent': 'bg-cyan-100 text-cyan-800',
        'fb-sent': 'bg-cyan-100 text-cyan-800',
        fb_sent: 'bg-cyan-100 text-cyan-800',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};
