import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL 
});

// Request interceptor for attaching the access token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        console.log('Access Token:', token); // Debugging line
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Check if the error response status is 401 and the error has not been retried yet
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                
                // If no refresh token is available, log out or handle appropriately
                if (!refreshToken) {
                    // Redirect to login or display a message
                    window.location.href = '/login';
                    return Promise.reject(error);
                }

                // Attempt to get a new access token using the refresh token
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/token/refresh/`, {
                    refresh: refreshToken,
                });

                // Update the access token in localStorage and in the request headers
                localStorage.setItem('access_token', response.data.access);
                originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;

                // Retry the original request with the new access token
                return api(originalRequest);
            } catch (refreshError) {
                console.error('Refresh token is invalid or expired', refreshError);
                // Handle logout or redirection to login here
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
