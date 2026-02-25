const isBrowser = typeof window !== 'undefined';
let appMessageApi = null;
let appModalApi = null;

const resolveText = (value, fallback) => {
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }
    return fallback;
};

export const showSuccessMessage = (content = 'Action completed successfully.') => {
    const text = resolveText(content, 'Action completed successfully.');
    if (appMessageApi?.success) {
        appMessageApi.success(text);
        return;
    }
    if (!isBrowser) return;
    console.info(text);
};

export const showSmartSuccessToast = (content = 'Action completed successfully.') => {
    const text = resolveText(content, 'Action completed successfully.');
    if (appMessageApi?.open) {
        appMessageApi.open({
            type: 'success',
            content: text,
            className: 'smart-success-toast',
            duration: 2.4,
        });
        return;
    }

    if (!isBrowser) return;
    console.info(text);
};

export const showErrorMessage = (content = 'Something went wrong. Please try again.') => {
    const text = resolveText(content, 'Something went wrong. Please try again.');
    if (appMessageApi?.error) {
        appMessageApi.error(text);
        return;
    }
    if (!isBrowser) return;
    console.error(text);
};

export const showSuccessAlert = ({
    title = 'Success',
    content = 'Action completed successfully.',
} = {}) => {
    if (appModalApi?.success) {
        appModalApi.success({
            centered: true,
            title: resolveText(title, 'Success'),
            content: resolveText(content, 'Action completed successfully.'),
            okText: 'OK',
        });
        return;
    }
    if (!isBrowser) return;
    window.alert(resolveText(content, 'Action completed successfully.'));
};

export const showConfirmAlert = ({
    title = 'Are you sure?',
    content = 'Please confirm to continue.',
    okText = 'Yes, Continue',
    cancelText = 'Cancel',
    okType = 'primary',
} = {}) => {
    if (!isBrowser) return Promise.resolve(false);

    if (appModalApi?.confirm) {
        return new Promise((resolve) => {
            appModalApi.confirm({
                centered: true,
                title: resolveText(title, 'Are you sure?'),
                content: resolveText(content, 'Please confirm to continue.'),
                okText: resolveText(okText, 'Yes, Continue'),
                cancelText: resolveText(cancelText, 'Cancel'),
                okType,
                onOk: () => resolve(true),
                onCancel: () => resolve(false),
            });
        });
    }

    return Promise.resolve(window.confirm(resolveText(content, 'Please confirm to continue.')));
};

export const setAlertApis = ({ messageApi, modalApi } = {}) => {
    appMessageApi = messageApi || null;
    appModalApi = modalApi || null;
};
