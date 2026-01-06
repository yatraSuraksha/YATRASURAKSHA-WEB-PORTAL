import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://yatra-suraksha.n5n.live/api';

const VideosModal = ({ touristId, touristName, onClose }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);

  useEffect(() => {
    if (touristId) {
      loadVideos();
    } else {
      // If no touristId, load all videos
      loadAllVideos();
    }
  }, [touristId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch videos for this specific tourist/user
      const response = await fetch(`${API_BASE_URL}/videos/user/${touristId}`);
      const data = await response.json();
      
      if (data.success) {
        setVideos(data.data || []);
      } else {
        setVideos([]);
        if (data.message) {
          console.warn('Video fetch warning:', data.message);
        }
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
      setError('Failed to load videos');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/videos?page=1&limit=50`);
      const data = await response.json();
      
      if (data.success) {
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

  const handlePlayVideo = (video) => {
    setPlayingVideo(video);
  };

  const handleClosePlayer = () => {
    setPlayingVideo(null);
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
        width: '600px',
        maxWidth: '95vw',
        maxHeight: '90vh',
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
              {touristName || 'All Videos'}
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
                  onPlay={() => handlePlayVideo(video)}
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

      {/* Video Player Modal */}
      {playingVideo && (
        <VideoPlayer 
          video={playingVideo} 
          onClose={handleClosePlayer}
          formatFileSize={formatFileSize}
          formatDate={formatDate}
        />
      )}
    </>
  );
};

// Video Player Component
const VideoPlayer = ({ video, onClose, formatFileSize, formatDate }) => {
  const videoRef = useRef(null);
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://yatra-suraksha.n5n.live/api').replace(/\/api$/, '');
  const streamPath = video.streamPath || video.path || `/api/videos/stream/${video.filename}`;
  const videoUrl = `${baseUrl}${streamPath}`;

  useEffect(() => {
    // Auto-play when opened
    if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }

    // Handle ESC key to close
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = () => {
    const downloadPath = video.downloadPath || `/api/videos/download/${video.filename}`;
    const downloadUrl = `${baseUrl}${downloadPath}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <>
      {/* Player Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          zIndex: 1200
        }}
      />

      {/* Player Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90vw',
        maxWidth: '900px',
        background: '#1a1a1a',
        borderRadius: '16px',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
        zIndex: 1201,
        overflow: 'hidden'
      }}>
        {/* Player Header */}
        <div style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>🎬</span>
            <div>
              <h4 style={{ 
                margin: 0, 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'white',
                maxWidth: '400px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {video.title || video.filename || 'Video'}
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                {video.sizeFormatted || formatFileSize(video.size)} • {formatDate(video.createdAt || video.uploadedAt)}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDownload}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            >
              ⬇️ Download
            </button>
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255,0,0,0.3)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video Element */}
        <div style={{
          width: '100%',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            style={{
              width: '100%',
              maxHeight: '70vh',
              outline: 'none'
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Player Footer */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.5)'
        }}>
          <span>
            {video.uploaderName ? `Uploaded by: ${video.uploaderName}` : 'Video Player'}
          </span>
          <span>
            Press ESC or click outside to close
          </span>
        </div>
      </div>
    </>
  );
};

// Video Card Component
const VideoCard = ({ video, formatFileSize, formatDate, getVideoExtension, onPlay }) => {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://yatra-suraksha.n5n.live/api').replace(/\/api$/, '');
  
  const handleDownload = () => {
    const downloadPath = video.downloadPath || `/api/videos/download/${video.filename}`;
    const downloadUrl = `${baseUrl}${downloadPath}`;
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
        {/* Thumbnail / Play Button */}
        <div 
          onClick={onPlay}
          style={{
            width: '100px',
            height: '70px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              <span style={{ fontSize: '16px', marginLeft: '2px' }}>▶</span>
            </div>
          </div>
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
              {video.title || video.filename || 'Untitled Video'}
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
            <div>📅 {formatDate(video.createdAt || video.uploadedAt)}</div>
          </div>

          {/* Uploader info if available */}
          {video.uploaderName && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
              👤 {video.uploaderName}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button
          onClick={onPlay}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #9c27b0, #7b1fa2)',
            color: 'white',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(156, 39, 176, 0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 8px rgba(156, 39, 176, 0.3)';
          }}
        >
          ▶️ Play Video
        </button>
        <button
          onClick={handleDownload}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '2px solid #9c27b0',
            background: 'white',
            color: '#9c27b0',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#f3e5f5'}
          onMouseOut={(e) => e.target.style.background = 'white'}
        >
          ⬇️
        </button>
      </div>
    </div>
  );
};

export default VideosModal;
