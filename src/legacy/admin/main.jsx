import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../../css/app.css';
import { Provider } from 'react-redux';
import { store } from '../store/store';

// Import toastr for notifications (optional)
// import toastr from 'toastr';
// import 'toastr/build/toastr.min.css';

const root = ReactDOM.createRoot(document.getElementById('admin-root'));
root.render(
    <React.StrictMode>
        <Provider store={store}>
            <App />
        </Provider>
    </React.StrictMode>
);
