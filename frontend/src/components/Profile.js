import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const Profile = ({ token }) => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [newSkill, setNewSkill] = useState({ type: 'offered', name: '', description: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setProfile(prev => ({ ...prev, user: formData }));
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleSkillAdd = async (e) => {
    e.preventDefault();
    if (!newSkill.name.trim()) return;

    try {
      const endpoint = newSkill.type === 'offered' ? '/skills/offered' : '/skills/wanted';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          skill_name: newSkill.name,
          description: newSkill.description
        })
      });

      if (response.ok) {
        fetchProfile();
        setNewSkill({ type: 'offered', name: '', description: '' });
      }
    } catch (error) {
      console.error('Failed to add skill:', error);
    }
  };

  const handleSkillDelete = async (skillId, type) => {
    try {
      const endpoint = type === 'offered' ? `/skills/offered/${skillId}` : `/skills/wanted/${skillId}`;
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchProfile();
      }
    } catch (error) {
      console.error('Failed to delete skill:', error);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/upload-profile-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        fetchProfile();
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) return <div>Error loading profile</div>;

  const SkillCard = ({ skill, type, onDelete }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{skill.skill_name}</h4>
          {skill.description && (
            <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(skill.id, type)}
          className="ml-2 text-red-500 hover:text-red-700 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
              {profile.user.profile_photo ? (
                <img
                  src={`${API_BASE.replace('/api', '')}/uploads/${profile.user.profile_photo}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                  👤
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 cursor-pointer hover:bg-blue-600 transition-colors">
              📷
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{profile.user.name}</h2>
            <p className="text-gray-600">@{profile.user.username}</p>
            {profile.user.location && (
              <p className="text-gray-500 mt-1">📍 {profile.user.location}</p>
            )}
            {profile.average_rating.count > 0 && (
              <div className="flex items-center mt-2">
                <span className="text-yellow-500">⭐</span>
                <span className="ml-1 text-sm text-gray-600">
                  {profile.average_rating.avg_rating.toFixed(1)} ({profile.average_rating.count} reviews)
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setEditing(!editing)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {profile.user.bio && !editing && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700">{profile.user.bio}</p>
          </div>
        )}
      </div>

      {/* Edit Profile Form */}
      {editing && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell others about yourself..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
              <input
                type="text"
                value={formData.availability || ''}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Weekends, Evenings"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public || false}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
                Make profile public (visible to other users)
              </label>
            </div>

            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* Skills Section */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Skills Offered */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-700">Skills I Offer</h3>
          <div className="space-y-3 mb-4">
            {profile.skills.offered.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                type="offered"
                onDelete={handleSkillDelete}
              />
            ))}
            {profile.skills.offered.length === 0 && (
              <p className="text-gray-500 text-center py-4">No skills added yet</p>
            )}
          </div>
        </div>

        {/* Skills Wanted */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-700">Skills I Want</h3>
          <div className="space-y-3 mb-4">
            {profile.skills.wanted.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                type="wanted"
                onDelete={handleSkillDelete}
              />
            ))}
            {profile.skills.wanted.length === 0 && (
              <p className="text-gray-500 text-center py-4">No skills added yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Add New Skill */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Add New Skill</h3>
        <form onSubmit={handleSkillAdd} className="space-y-4">
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="offered"
                checked={newSkill.type === 'offered'}
                onChange={(e) => setNewSkill({ ...newSkill, type: e.target.value })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">I can teach this</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="wanted"
                checked={newSkill.type === 'wanted'}
                onChange={(e) => setNewSkill({ ...newSkill, type: e.target.value })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">I want to learn this</span>
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name</label>
              <input
                type="text"
                value={newSkill.name}
                onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., React, Guitar, Photography"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={newSkill.description}
                onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description or level"
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add Skill
          </button>
        </form>
      </div>

      {/* Recent Ratings */}
      {profile.ratings.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Reviews</h3>
          <div className="space-y-4">
            {profile.ratings.slice(0, 5).map(rating => (
              <div key={rating.id} className="border-l-4 border-yellow-400 pl-4">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-gray-900">{rating.rater_name}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < rating.rating ? 'text-yellow-400' : 'text-gray-300'}>
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>
                {rating.feedback && (
                  <p className="text-gray-600 text-sm">{rating.feedback}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;