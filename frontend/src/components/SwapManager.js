import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const SwapManager = ({ token, user }) => {
  const [swaps, setSwaps] = useState({ sent: [], received: [] });
  const [activeTab, setActiveTab] = useState('received');
  const [loading, setLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState(null);
  const [rating, setRating] = useState({ rating: 5, feedback: '' });

  useEffect(() => {
    fetchSwaps();
  }, []);

  const fetchSwaps = async () => {
    try {
      const response = await fetch(`${API_BASE}/swaps`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSwaps(data);
      }
    } catch (error) {
      console.error('Failed to fetch swaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapAction = async (swapId, action) => {
    try {
      if (action === 'delete') {
        const response = await fetch(`${API_BASE}/swaps/${swapId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) fetchSwaps();
      } else {
        const response = await fetch(`${API_BASE}/swaps/${swapId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: action })
        });
        if (response.ok) fetchSwaps();
      }
    } catch (error) {
      console.error('Failed to update swap:', error);
    }
  };

  const handleRating = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          swap_request_id: ratingModal.id,
          rated_id: ratingModal.rated_id,
          rating: rating.rating,
          feedback: rating.feedback
        })
      });

      if (response.ok) {
        setRatingModal(null);
        setRating({ rating: 5, feedback: '' });
        fetchSwaps();
      }
    } catch (error) {
      console.error('Failed to submit rating:', error);
    }
  };

  const SwapCard = ({ swap, type }) => {
    const otherUser = type === 'sent' ? swap.provider_name : swap.requester_name;
    const otherUsername = type === 'sent' ? swap.provider_username : swap.requester_username;
    const canRate = swap.status === 'accepted' && type === 'sent';
    const canAcceptReject = swap.status === 'pending' && type === 'received';
    const canDelete = swap.status === 'pending' && type === 'sent';

    const getStatusColor = (status) => {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'accepted': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{otherUser}</h3>
            <p className="text-gray-600">@{otherUsername}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(swap.status)}`}>
            {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-800 mb-1">
              {/* {type === 'sent' ?  'They want': 'They offered'} */}
               {type === 'sent' ?  'You offered': 'They offered'}
            </h4>
            <p className="text-green-700">{swap.skill_offered}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-1">
              {/* {type === 'sent' ?  'They offered': 'You offered'} */}
              {type === 'sent' ?  'You want': 'They want'}
            </h4>
            <p className="text-blue-700">{swap.skill_wanted}</p>
          </div>
        </div>

        {swap.message && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-1">Message</h4>
            <p className="text-gray-700 text-sm">{swap.message}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>Created: {new Date(swap.created_at).toLocaleDateString()}</span>
          {swap.updated_at !== swap.created_at && (
            <span>Updated: {new Date(swap.updated_at).toLocaleDateString()}</span>
          )}
        </div>

        <div className="flex space-x-2">
          {canAcceptReject && (
            <>
              <button
                onClick={() => handleSwapAction(swap.id, 'accepted')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Accept
              </button>
              <button
                onClick={() => handleSwapAction(swap.id, 'rejected')}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Reject
              </button>
            </>
          )}

          {canDelete && (
            <button
              onClick={() => handleSwapAction(swap.id, 'delete')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Delete
            </button>
          )}

          {canRate && (
            <button
              onClick={() => setRatingModal({
                id: swap.id,
                rated_id: swap.provider_id,
                otherUser: swap.provider_name
              })}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Rate Experience
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Skill Swaps</h2>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'received'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Received ({swaps.received.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'sent'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sent ({swaps.sent.length})
          </button>
        </div>
      </div>

      {/* Swap Lists */}
      <div className="space-y-4">
        {activeTab === 'received' && (
          <>
            {swaps.received.length > 0 ? (
              swaps.received.map(swap => (
                <SwapCard key={swap.id} swap={swap} type="received" />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📥</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Requests Received</h3>
                <p className="text-gray-600">When others request skill swaps from you, they'll appear here.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'sent' && (
          <>
            {swaps.sent.length > 0 ? (
              swaps.sent.map(swap => (
                <SwapCard key={swap.id} swap={swap} type="sent" />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📤</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Requests Sent</h3>
                <p className="text-gray-600">Browse skills and send your first swap request!</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Rate Your Experience</h3>
              <button
                onClick={() => setRatingModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Rating experience with:</p>
              <p className="font-medium">{ratingModal.otherUser}</p>
            </div>

            <form onSubmit={handleRating} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating({ ...rating, rating: star })}
                      className={`text-2xl ${star <= rating.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback (Optional)
                </label>
                <textarea
                  value={rating.feedback}
                  onChange={(e) => setRating({ ...rating, feedback: e.target.value })}
                  placeholder="Share your experience..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setRatingModal(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Submit Rating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapManager;