import React, { useState, useEffect } from 'react';
import Auth from './components/Auth.js';
import Profile from './components/Profile.js';
import SkillBrowser from './components/SkillBrowser.js';
import SwapManager from './components/SwapManager.js';
import AdminPanel from './components/AdminPanel.js';

const API_BASE = 'http://localhost:5000/api';

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    setActiveTab('profile');
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    setActiveTab('profile');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  const NavButton = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
        activeTab === id
          ? 'bg-blue-500 text-white shadow-lg'
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      <span>{icon}</span>
      <span className="hidden md:block">{label}</span>
    </button>
  );

const PlatformMessages = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages.slice(0, 3)); 
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  if (messages.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
      <button
        onClick={() => setShowMessages(!showMessages)}
        className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-between"
      >
        <span className="flex items-center">
          📢 Platform Messages ({messages.length})
        </span>
        <span>{showMessages ? '▼' : '▶'}</span>
      </button>
      
      {showMessages && (
        <div className="mt-2 space-y-2">
          {messages.map(msg => (
            <div key={msg.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-gray-900">{msg.title}</h4>
                <span className="text-sm text-gray-500">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700 text-sm">{msg.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">SkillSwap</h1>
              <span className="text-sm text-gray-500">Welcome, {user.name}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span>🚪</span>
              <span className="hidden md:block">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-4 overflow-x-auto">
            <NavButton id="profile" label="Profile" icon="👤" />
            <NavButton id="browse" label="Browse Skills" icon="🔍" />
            <NavButton id="swaps" label="My Swaps" icon="🔄" />
            {user.is_admin && <NavButton id="admin" label="Admin" icon="⚙️" />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {user && <PlatformMessages token={token} />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'profile' && <Profile token={token} />}
        {activeTab === 'browse' && <SkillBrowser token={token} user={user} />}
        {activeTab === 'swaps' && <SwapManager token={token} user={user} />}
        {activeTab === 'admin' && user.is_admin && <AdminPanel token={token} />}
      </main>
    </div>
  );
};

export default App;
