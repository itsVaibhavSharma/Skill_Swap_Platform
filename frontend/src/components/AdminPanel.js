import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const AdminPanel = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [message, setMessage] = useState({ title: '', content: '' });
  const [activeTab, setActiveTab] = useState('users');
  const usersPerPage = 20;

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [currentPage, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/users?page=${currentPage}&per_page=${usersPerPage}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalUsers(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, shouldBan) => {
    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_banned: shouldBan })
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update user ban status:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.title.trim() || !message.content.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/admin/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: message.title,
          message: message.content
        })
      });

      if (response.ok) {
        setMessage({ title: '', content: '' });
        alert('Message sent successfully!');
        if (activeTab === 'messages') {
          fetchMessages();
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Panel</h2>
        <p className="text-gray-600">Manage users and platform settings</p>
        
        {/* Tab Navigation */}
        <div className="flex space-x-4 mt-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'messages'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Platform Messages
          </button>
        </div>
      </div>

      {/* Send Platform Message */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Platform Message</h3>
        <form onSubmit={sendMessage} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Title
            </label>
            <input
              type="text"
              value={message.title}
              onChange={(e) => setMessage({ ...message, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Maintenance Alert, New Features"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Content
            </label>
            <textarea
              value={message.content}
              onChange={(e) => setMessage({ ...message, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your message to all users..."
              required
            />
          </div>

          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Send Message to All Users
          </button>
        </form>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
            <div className="text-sm text-gray-600">
              Total Users: {totalUsers}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg font-medium text-gray-700 text-sm">
                <div>User</div>
                <div>Email</div>
                <div>Location</div>
                <div>Joined</div>
                <div>Actions</div>
              </div>

              {/* User Rows */}
              {users.map(user => (
                <div key={user.id} className="grid grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg items-center">
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-600">@{user.username}</div>
                  </div>
                  
                  <div className="text-sm text-gray-700 break-all">
                    {user.email}
                  </div>
                  
                  <div className="text-sm text-gray-700">
                    {user.location || 'Not specified'}
                  </div>
                  
                  <div className="text-sm text-gray-700">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex space-x-2">
                    {user.is_banned ? (
                      <button
                        onClick={() => handleBanUser(user.id, false)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBanUser(user.id, true)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Ban
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Messages History</h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.length > 0 ? (
                messages.map(msg => (
                  <div key={msg.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{msg.title}</h4>
                      <span className="text-sm text-gray-500">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📢</div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">No Messages Sent</h4>
                  <p className="text-gray-600">Platform messages you send will appear here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h4>
          <p className="text-3xl font-bold text-blue-600">{totalUsers}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Active Users</h4>
          <p className="text-3xl font-bold text-green-600">
            {users.filter(user => !user.is_banned).length}
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Platform Messages</h4>
          <p className="text-3xl font-bold text-purple-600">{messages.length}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;