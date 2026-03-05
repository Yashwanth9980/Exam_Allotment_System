import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUserData();
      fetchNotifications();
    }
  }, [token]);

  const fetchUserData = async () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setCurrentView(JSON.parse(storedUser).role === 'admin' ? 'adminDashboard' : 'studentDashboard');
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {user && (
        <Header 
          user={user} 
          logout={logout} 
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          fetchNotifications={fetchNotifications}
          token={token}
        />
      )}
      
      <div className="container mx-auto px-4 py-8">
        {currentView === 'login' && (
          <AuthForm 
            setToken={setToken} 
            setUser={setUser} 
            setCurrentView={setCurrentView}
          />
        )}
        
        {currentView === 'adminDashboard' && (
          <AdminDashboard 
            token={token} 
            user={user}
            setCurrentView={setCurrentView}
          />
        )}
        
        {currentView === 'studentDashboard' && (
          <StudentDashboard 
            token={token} 
            user={user}
          />
        )}
      </div>
    </div>
  );
}

// Header Component
function Header({ user, logout, notifications, showNotifications, setShowNotifications, fetchNotifications, token }) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <header className="bg-white shadow-md" data-testid="app-header">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-blue-600" data-testid="app-title">📚 Exam Allotment System</h1>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-blue-600 transition"
              data-testid="notifications-button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto" data-testid="notifications-panel">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No notifications</div>
                ) : (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                      data-testid={`notification-${notification.id}`}
                    >
                      <p className="text-sm text-gray-800">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800" data-testid="user-name">{user.name}</p>
              <p className="text-xs text-gray-600 capitalize" data-testid="user-role">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
              data-testid="logout-button"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// Auth Form Component
function AuthForm({ setToken, setUser, setCurrentView }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await axios.post(`${API_URL}${endpoint}`, formData);

      if (isLogin) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setToken(response.data.access_token);
        setUser(response.data.user);
        setCurrentView(response.data.user.role === 'admin' ? 'adminDashboard' : 'studentDashboard');
      } else {
        setIsLogin(true);
        alert('Registration successful! Please login.');
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white rounded-2xl shadow-2xl p-8" data-testid="auth-form">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6" data-testid="auth-title">
          {isLogin ? '🔐 Login' : '📝 Register'}
        </h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" data-testid="auth-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              data-testid="auth-name-input"
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            data-testid="auth-email-input"
          />
          
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            data-testid="auth-password-input"
          />
          
          {!isLogin && (
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="auth-role-select"
            >
              <option value="student">Student</option>
              <option value="admin">Admin/Teacher</option>
            </select>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:bg-gray-400"
            data-testid="auth-submit-button"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        
        <p className="text-center mt-6 text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-700 font-semibold"
            data-testid="auth-toggle-button"
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

// Admin Dashboard Component
function AdminDashboard({ token, user, setCurrentView }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchStudents();
    fetchAnalytics();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/exams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(response.data.exams);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchAssignments = async (examId) => {
    try {
      const response = await axios.get(`${API_URL}/api/assignments/exam/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(response.data.assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchExams();
      fetchAnalytics();
    } catch (error) {
      console.error('Error deleting exam:', error);
    }
  };

  const openAssignModal = (exam) => {
    setSelectedExam(exam);
    setShowAssignModal(true);
  };

  const openResultsModal = (exam) => {
    setSelectedExam(exam);
    fetchAssignments(exam.id);
    setShowResultsModal(true);
  };

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Dashboard</h2>
        
        <div className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            data-testid="tab-overview"
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-6 py-3 font-semibold ${activeTab === 'exams' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            data-testid="tab-exams"
          >
            Exams
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-semibold ${activeTab === 'analytics' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            data-testid="tab-analytics"
          >
            Analytics
          </button>
        </div>
      </div>

      {activeTab === 'overview' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="overview-section">
          <StatCard title="Total Exams" value={analytics.total_exams} icon="📝" color="blue" />
          <StatCard title="Total Students" value={analytics.total_students} icon="👨‍🎓" color="green" />
          <StatCard title="Total Assignments" value={analytics.total_assignments} icon="📋" color="purple" />
          <StatCard title="Completed" value={analytics.completed_assignments} icon="✅" color="green" />
          <StatCard title="Pending" value={analytics.pending_assignments} icon="⏳" color="yellow" />
          <StatCard title="Average Marks" value={analytics.average_marks} icon="📊" color="indigo" />
        </div>
      )}

      {activeTab === 'exams' && (
        <div data-testid="exams-section">
          <button
            onClick={() => setShowCreateExam(true)}
            className="mb-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            data-testid="create-exam-button"
          >
            + Create New Exam
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onDelete={handleDeleteExam}
                onAssign={openAssignModal}
                onResults={openResultsModal}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <AnalyticsSection analytics={analytics} exams={exams} token={token} />
      )}

      {showCreateExam && (
        <CreateExamModal
          token={token}
          onClose={() => setShowCreateExam(false)}
          onSuccess={() => {
            fetchExams();
            fetchAnalytics();
            setShowCreateExam(false);
          }}
        />
      )}

      {showAssignModal && selectedExam && (
        <AssignExamModal
          token={token}
          exam={selectedExam}
          students={students}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            fetchAnalytics();
          }}
        />
      )}

      {showResultsModal && selectedExam && (
        <ResultsModal
          token={token}
          exam={selectedExam}
          assignments={assignments}
          onClose={() => setShowResultsModal(false)}
          onSuccess={() => {
            fetchAssignments(selectedExam.id);
            fetchAnalytics();
          }}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6" data-testid={`stat-card-${title.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
        <div className={`text-4xl ${colorClasses[color]} p-4 rounded-full`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Exam Card Component
function ExamCard({ exam, onDelete, onAssign, onResults }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition" data-testid={`exam-card-${exam.id}`}>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{exam.title}</h3>
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <p><strong>Subject:</strong> {exam.subject}</p>
        <p><strong>Date:</strong> {new Date(exam.date).toLocaleDateString()}</p>
        <p><strong>Duration:</strong> {exam.duration} minutes</p>
        <p><strong>Total Marks:</strong> {exam.total_marks}</p>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => onAssign(exam)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
          data-testid={`assign-exam-${exam.id}`}
        >
          Assign
        </button>
        <button
          onClick={() => onResults(exam)}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition"
          data-testid={`view-results-${exam.id}`}
        >
          Results
        </button>
        <button
          onClick={() => onDelete(exam.id)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition"
          data-testid={`delete-exam-${exam.id}`}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// Create Exam Modal
function CreateExamModal({ token, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    date: '',
    duration: '',
    total_marks: '',
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/exams`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating exam:', error);
      alert('Error creating exam');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="create-exam-modal">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Exam</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Exam Title"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
            data-testid="exam-title-input"
          />
          
          <input
            type="text"
            placeholder="Subject"
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
            data-testid="exam-subject-input"
          />
          
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
            data-testid="exam-date-input"
          />
          
          <input
            type="number"
            placeholder="Duration (minutes)"
            value={formData.duration}
            onChange={(e) => setFormData({...formData, duration: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
            data-testid="exam-duration-input"
          />
          
          <input
            type="number"
            placeholder="Total Marks"
            value={formData.total_marks}
            onChange={(e) => setFormData({...formData, total_marks: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
            data-testid="exam-marks-input"
          />
          
          <textarea
            placeholder="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows="3"
            data-testid="exam-description-input"
          />
          
          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              data-testid="submit-create-exam"
            >
              Create Exam
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg transition"
              data-testid="cancel-create-exam"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Assign Exam Modal
function AssignExamModal({ token, exam, students, onClose, onSuccess }) {
  const [selectedStudents, setSelectedStudents] = useState([]);

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      alert('Please select at least one student');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/assignments`,
        { exam_id: exam.id, student_ids: selectedStudents },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Exam assigned successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error assigning exam:', error);
      alert('Error assigning exam');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="assign-exam-modal">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Assign Exam: {exam.title}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
            {students.map(student => (
              <label
                key={student.id}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                data-testid={`student-checkbox-${student.id}`}
              >
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={() => toggleStudent(student.id)}
                  className="w-5 h-5 text-blue-600"
                />
                <div>
                  <p className="font-semibold text-gray-800">{student.name}</p>
                  <p className="text-sm text-gray-600">{student.email}</p>
                </div>
              </label>
            ))}
          </div>
          
          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              data-testid="submit-assign-exam"
            >
              Assign to {selectedStudents.length} Student(s)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg transition"
              data-testid="cancel-assign-exam"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Results Modal
function ResultsModal({ token, exam, assignments, onClose, onSuccess }) {
  const [editingId, setEditingId] = useState(null);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleUpdateResult = async (assignmentId) => {
    try {
      await axios.post(
        `${API_URL}/api/results`,
        { assignment_id: assignmentId, marks: parseInt(marks), feedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Result updated successfully!');
      setEditingId(null);
      onSuccess();
    } catch (error) {
      console.error('Error updating result:', error);
      alert('Error updating result');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="results-modal">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Results: {exam.title}</h2>
        
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <p className="text-center text-gray-600">No students assigned yet</p>
          ) : (
            assignments.map(assignment => (
              <div key={assignment.id} className="border rounded-lg p-4" data-testid={`result-${assignment.id}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{assignment.student?.name}</p>
                    <p className="text-sm text-gray-600">{assignment.student?.email}</p>
                    <p className="text-sm mt-2">
                      <span className={`px-2 py-1 rounded ${assignment.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {assignment.status}
                      </span>
                    </p>
                  </div>
                  
                  {editingId === assignment.id ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        placeholder="Marks"
                        value={marks}
                        onChange={(e) => setMarks(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        max={exam.total_marks}
                        data-testid={`marks-input-${assignment.id}`}
                      />
                      <input
                        type="text"
                        placeholder="Feedback (optional)"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        data-testid={`feedback-input-${assignment.id}`}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateResult(assignment.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                          data-testid={`save-result-${assignment.id}`}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm"
                          data-testid={`cancel-result-${assignment.id}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-right">
                      {assignment.marks !== null ? (
                        <div>
                          <p className="text-2xl font-bold text-gray-800">
                            {assignment.marks}/{exam.total_marks}
                          </p>
                          {assignment.feedback && (
                            <p className="text-sm text-gray-600 mt-1">{assignment.feedback}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500">Not graded</p>
                      )}
                      <button
                        onClick={() => {
                          setEditingId(assignment.id);
                          setMarks(assignment.marks || '');
                          setFeedback(assignment.feedback || '');
                        }}
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                        data-testid={`edit-result-${assignment.id}`}
                      >
                        {assignment.marks !== null ? 'Edit' : 'Add'} Marks
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg transition"
          data-testid="close-results-modal"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Analytics Section
function AnalyticsSection({ analytics, exams, token }) {
  const [selectedExamAnalytics, setSelectedExamAnalytics] = useState(null);

  const fetchExamAnalytics = async (examId) => {
    try {
      const response = await axios.get(`${API_URL}/api/analytics/exam/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedExamAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching exam analytics:', error);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  const pieData = [
    { name: 'Completed', value: analytics?.completed_assignments || 0 },
    { name: 'Pending', value: analytics?.pending_assignments || 0 },
  ];

  return (
    <div className="space-y-6" data-testid="analytics-section">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Assignment Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({name, value}) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Exam-wise Analytics</h3>
        <select
          onChange={(e) => fetchExamAnalytics(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4"
          data-testid="exam-analytics-select"
        >
          <option value="">Select an exam</option>
          {exams.map(exam => (
            <option key={exam.id} value={exam.id}>{exam.title}</option>
          ))}
        </select>

        {selectedExamAnalytics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Assigned</p>
                <p className="text-2xl font-bold text-blue-600">{selectedExamAnalytics.total_assigned}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{selectedExamAnalytics.completed}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Average Marks</p>
                <p className="text-2xl font-bold text-yellow-600">{selectedExamAnalytics.average_marks}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold text-purple-600">{selectedExamAnalytics.pass_rate}%</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Student Dashboard Component
function StudentDashboard({ token, user }) {
  const [activeTab, setActiveTab] = useState('exams');
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetchExams();
    fetchResults();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/students/exams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(response.data.exams);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const fetchResults = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/students/results`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(response.data.results);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const pendingExams = exams.filter(e => e.status === 'pending');
  const completedExams = exams.filter(e => e.status === 'completed');

  return (
    <div className="space-y-6" data-testid="student-dashboard">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Student Dashboard</h2>
        
        <div className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-6 py-3 font-semibold ${activeTab === 'exams' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            data-testid="student-tab-exams"
          >
            My Exams ({pendingExams.length})
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-3 font-semibold ${activeTab === 'results' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            data-testid="student-tab-results"
          >
            Results ({results.length})
          </button>
        </div>
      </div>

      {activeTab === 'exams' && (
        <div className="space-y-4" data-testid="student-exams-section">
          {pendingExams.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <p className="text-gray-600">No pending exams assigned yet</p>
            </div>
          ) : (
            pendingExams.map(assignment => (
              <StudentExamCard key={assignment.id} assignment={assignment} />
            ))
          )}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="space-y-4" data-testid="student-results-section">
          {results.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <p className="text-gray-600">No results available yet</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <StatCard
                  title="Total Exams"
                  value={results.length}
                  icon="📝"
                  color="blue"
                />
                <StatCard
                  title="Average Score"
                  value={`${(results.reduce((acc, r) => acc + (r.marks / r.exam.total_marks * 100), 0) / results.length).toFixed(1)}%`}
                  icon="📊"
                  color="green"
                />
                <StatCard
                  title="Highest Score"
                  value={`${Math.max(...results.map(r => (r.marks / r.exam.total_marks * 100))).toFixed(1)}%`}
                  icon="🏆"
                  color="yellow"
                />
              </div>
              
              {results.map(result => (
                <StudentResultCard key={result.id} result={result} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Student Exam Card
function StudentExamCard({ assignment }) {
  const exam = assignment.exam;
  const examDate = new Date(exam.date);
  const isUpcoming = examDate > new Date();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6" data-testid={`student-exam-${assignment.id}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-gray-800">{exam.title}</h3>
          <p className="text-gray-600 mt-2">
            <strong>Subject:</strong> {exam.subject}
          </p>
          <p className="text-gray-600">
            <strong>Date:</strong> {examDate.toLocaleDateString()} at {examDate.toLocaleTimeString()}
          </p>
          <p className="text-gray-600">
            <strong>Duration:</strong> {exam.duration} minutes
          </p>
          <p className="text-gray-600">
            <strong>Total Marks:</strong> {exam.total_marks}
          </p>
          {exam.description && (
            <p className="text-gray-600 mt-2">
              <strong>Description:</strong> {exam.description}
            </p>
          )}
        </div>
        
        <div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${isUpcoming ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
            {isUpcoming ? '📅 Upcoming' : '⏰ Overdue'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Student Result Card
function StudentResultCard({ result }) {
  const exam = result.exam;
  const percentage = (result.marks / exam.total_marks * 100).toFixed(1);
  const passed = percentage >= 40;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6" data-testid={`student-result-${result.id}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-gray-800">{exam.title}</h3>
          <p className="text-gray-600 mt-2">
            <strong>Subject:</strong> {exam.subject}
          </p>
          <p className="text-gray-600">
            <strong>Date:</strong> {new Date(exam.date).toLocaleDateString()}
          </p>
          {result.feedback && (
            <p className="text-gray-600 mt-2">
              <strong>Feedback:</strong> {result.feedback}
            </p>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-4xl font-bold text-gray-800">
            {result.marks}/{exam.total_marks}
          </div>
          <div className="text-2xl font-semibold text-gray-600 mt-2">
            {percentage}%
          </div>
          <span className={`inline-block mt-2 px-4 py-2 rounded-full text-sm font-semibold ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {passed ? '✅ Passed' : '❌ Failed'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
