import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://4.186.25.99:3000/api';

const VideosModal = ({ touristId, touristName, onClose }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVideos();
  }, [touristId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all videos from the backend
      const response = await fetch(`${API_BASE_URL}/videos`);
      const data = await response.json();
      
      if (data.success) {
        // Filter videos uploaded by this tourist (if uploadedBy field matches)
        // For now, show all videos since the API doesn't filter by tourist
        setVideos(data.data || []);
      } else {
        setVideos([]);
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
      setError('Failed to load videos');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const getVideoExtension = (filename) => {
    if (!filename) return 'video';
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || 'VIDEO';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1100
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        zIndex: 1101,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #9c27b022, #9c27b044)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
              🎬 Videos
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
              {touristName || 'Tourist'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
              Loading videos...
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#f44336' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
              {error}
            </div>
          ) : videos.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎥</div>
              <p style={{ margin: 0, fontSize: '14px' }}>No videos found</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
                Videos uploaded by this tourist will appear here
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {videos.map((video, index) => (
                <VideoCard
                  key={video.id || index}
                  video={video}
                  formatFileSize={formatFileSize}
                  formatDate={formatDate}
                  getVideoExtension={getVideoExtension}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #eee',
          background: '#f9f9f9',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {videos.length} video{videos.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>
    </>
  );
};

// Video Card Component
const VideoCard = ({ video, formatFileSize, formatDate, getVideoExtension }) => {
  // Get base URL without /api since video paths already include /api/videos
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://4.186.25.99:3000/api').replace(/\/api$/, '');
  
  const handlePlay = () => {
    const streamUrl = `${baseUrl}${video.path}`;
    window.open(streamUrl, '_blank');
  };

  const handleDownload = () => {
    const downloadUrl = `${baseUrl}${video.downloadPath}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div style={{
      background: '#f8f9fa',
      borderRadius: '12px',
      padding: '14px',
      border: '1px solid #e0e0e0',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Thumbnail / Icon */}
        <div style={{
          width: '80px',
          height: '60px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '24px' }}>🎬</span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#1a1a1a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {video.filename || 'Untitled Video'}
            </span>
            <span style={{
              padding: '2px 6px',
              borderRadius: '4px',
              background: '#e3f2fd',
              color: '#1976d2',
              fontSize: '9px',
              fontWeight: '600'
            }}>
              {getVideoExtension(video.filename)}
            </span>
          </div>

          {/* Metadata Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            fontSize: '11px',
            color: '#666'
          }}>
            <div>📦 {video.sizeFormatted || formatFileSize(video.size)}</div>
            <div>📅 {formatDate(video.createdAt)}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button
          onClick={handlePlay}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '6px',
            border: 'none',
            background: '#9c27b0',
            color: 'white',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          ▶️ Play
        </button>
        <button
          onClick={handleDownload}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #9c27b0',
            background: 'white',
            color: '#9c27b0',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          ⬇️ Download
        </button>
      </div>
    </div>
  );
};

export default VideosModal;
