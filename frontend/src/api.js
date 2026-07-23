import axios from 'axios';

const API_URL = 'http://localhost:8000';

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const loginUser = async (credentials) => {
    try {
        const params = new URLSearchParams();
        for (const key in credentials) {
            params.append(key, credentials[key]);
        }

        const response = await axios.post(
            `${API_URL}/auth/token`,
            params,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
};

const registerUser = async (userData) => {
    try {
        await axios.post(`${API_URL}/auth/register`, userData);
    } catch (error) {
        console.error("Registration error:", error);
        throw error;
    }
};

const fetchUserProfile = async (token) => {
    try {
        const response = await axios.get(`${API_URL}/users/me/`, {
            headers: authHeader(token),
        });
        return response.data;
    } catch (error) {
        console.error("Fetch user profile error:", error);
        throw error;
    }
};

// ── Job Tracker ───────────────────────────────────────────────────────────────

const fetchJobApplications = async (token) => {
    const response = await axios.get(`${API_URL}/jobs`, {
        headers: authHeader(token),
    });
    return response.data;
};

const createJobApplication = async (token, data) => {
    const response = await axios.post(`${API_URL}/jobs`, data, {
        headers: authHeader(token),
    });
    return response.data;
};

const updateJobApplication = async (token, jobId, data) => {
    const response = await axios.patch(`${API_URL}/jobs/${jobId}`, data, {
        headers: authHeader(token),
    });
    return response.data;
};

const deleteJobApplication = async (token, jobId) => {
    await axios.delete(`${API_URL}/jobs/${jobId}`, {
        headers: authHeader(token),
    });
};

// ── Interview ─────────────────────────────────────────────────────────────────

const startInterview = async (token, data) => {
    const response = await axios.post(`${API_URL}/api/interview/start`, data, {
        headers: authHeader(token),
    });
    return response.data;
};

const saveInterviewMessage = async (token, data) => {
    const response = await axios.post(`${API_URL}/api/interview/message`, data, {
        headers: authHeader(token),
    });
    return response.data;
};

const endInterview = async (token, interviewId) => {
    const response = await axios.post(
        `${API_URL}/api/interview/end`,
        { interview_id: interviewId },
        { headers: authHeader(token) },
    );
    return response.data;
};

const fetchInterviews = async (token) => {
    const response = await axios.get(`${API_URL}/api/interview/`, {
        headers: authHeader(token),
    });
    return response.data;
};

const fetchInterviewEvaluation = async (token, interviewId) => {
    const response = await axios.get(`${API_URL}/api/interview/${interviewId}/evaluation`, {
        headers: authHeader(token),
    });
    return response.data;
};

const fetchInterviewMessages = async (token, interviewId) => {
    const response = await axios.get(`${API_URL}/api/interview/${interviewId}/messages`, {
        headers: authHeader(token),
    });
    return response.data;
};

export {
    loginUser,
    registerUser,
    fetchUserProfile,
    fetchJobApplications,
    createJobApplication,
    updateJobApplication,
    deleteJobApplication,
    startInterview,
    saveInterviewMessage,
    endInterview,
    fetchInterviews,
    fetchInterviewEvaluation,
    fetchInterviewMessages,
};