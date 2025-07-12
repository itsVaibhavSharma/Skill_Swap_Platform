import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const SkillBrowser = ({ token, user }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [swapRequest, setSwapRequest] = useState({
    skillOffered: '',
    skillWanted: '',
    message: ''
  });

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users.filter(u => u.id !== user.id));
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapRequest = async (e) => {
    e.preventDefault();
    if (!swapRequest.skillOffered || !swapRequest.skillWanted) return;

    try {
      const response = await fetch(`${API_BASE}/swaps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          provider_id: selectedUser.id,
          skill_offered: swapRequest.skillOffered,
          skill_wanted: swapRequest.skillWanted,
          message: swapRequest.message
        })
      });

      if (response.ok) {
        setSelectedUser(null);
        setSwapRequest({ skillOffered: '', skillWanted: '', message: '' });
        alert('Swap request sent successfully!');
      }
    } catch (error) {
      console.error('Failed to send swap request:', error);
    }
  };

  const UserCard = ({ userData }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {userData.profile_photo ? (
            <img
              src={`${API_BASE.replace('/api', '')}/uploads/${userData.profile_photo}`}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl text-gray-400">
              👤
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{userData.name}</h3>
            {userData.average_rating.count > 0 && (
              <div className="flex items-center ml-2">
                <span className="text-yellow-500">⭐</span>
                <span className="ml-1 text-sm text-gray-600">
                  {userData.average_rating.avg_rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
          
          <p className="text-gray-600">@{userData.username}</p>
          {userData.location && (
            <p className="text-gray-500 text-sm mt-1">📍 {userData.location}</p>
          )}
          
          {userData.bio && (
            <p className="text-gray-700 text-sm mt-2 line-clamp-2">{userData.bio}</p>
          )}

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-green-700 mb-2">Can Teach</h4>
              <div className="space-y-1">
                {userData.skills.offered.slice(0, 3).map(skill => (
                  <span key={skill.id} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-1">
                    {skill.skill_name}
                  </span>
                ))}
                {userData.skills.offered.length > 3 && (
                  <span className="text-gray-500 text-xs">+{userData.skills.offered.length - 3} more</span>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-blue-700 mb-2">Wants to Learn</h4>
              <div className="space-y-1">
                {userData.skills.wanted.slice(0, 3).map(skill => (
                  <span key={skill.id} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1">
                    {skill.skill_name}
                  </span>
                ))}
                {userData.skills.wanted.length > 3 && (
                  <span className="text-gray-500 text-xs">+{userData.skills.wanted.length - 3} more</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedUser(userData)}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Request Skill Swap
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Browse Skills</h2>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for skills, users, or locations..."
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {!loading && searchQuery && users.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No users found matching your search.</p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Found {users.length} user{users.length !== 1 ? 's' : ''}
          </h3>
          <div className="grid gap-4">
            {users.map(userData => (
              <UserCard key={userData.id} userData={userData} />
            ))}
          </div>
        </div>
      )}

      {!searchQuery && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Discover New Skills</h3>
          <p className="text-gray-600">Search for skills, users, or locations to find learning opportunities.</p>
        </div>
      )}

      {/* Swap Request Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Request Skill Swap</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Requesting swap with:</p>
              <p className="font-medium">{selectedUser.name}</p>
            </div>

            <form onSubmit={handleSwapRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skill you want to learn from them
                </label>
                <select
                  value={swapRequest.skillWanted}
                  onChange={(e) => setSwapRequest({ ...swapRequest, skillWanted: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a skill...</option>
                  {selectedUser.skills.offered.map(skill => (
                    <option key={skill.id} value={skill.skill_name}>
                      {skill.skill_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skill you can offer in return
                </label>
                <input
                  type="text"
                  value={swapRequest.skillOffered}
                  onChange={(e) => setSwapRequest({ ...swapRequest, skillOffered: e.target.value })}
                  placeholder="What skill can you teach them?"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  value={swapRequest.message}
                  onChange={(e) => setSwapRequest({ ...swapRequest, message: e.target.value })}
                  placeholder="Introduce yourself and explain what you'd like to learn..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillBrowser;