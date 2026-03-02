import React, { useState } from 'react';

interface Video {
  id: number;
  title?: string;
  youtubeUrl: string;
}

interface VideosSectionProps {
  videos: Video[];
  isAdmin: boolean;
  onDeleteVideo?: (videoId: number) => void;
  onAddVideo?: () => void;
}

export const VideosSection: React.FC<VideosSectionProps> = ({
  videos,
  isAdmin,
  onDeleteVideo,
  onAddVideo
}) => {
  const [playingVideos, setPlayingVideos] = useState<{ [key: string]: boolean }>({});

  const getYoutubeId = (url: string) => {
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : "";
  };

  const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const getYoutubeThumbnail = (url: string) => {
    const videoId = getYoutubeId(url);
    if (!videoId) return "";

    const baseUrl = `https://img.youtube.com/vi/${videoId}`;

    return `${baseUrl}/maxresdefault.jpg`;
  };

  const handlePlayVideo = (id: string) => {
    setPlayingVideos({ ...playingVideos, [id]: true });
  };

  return (
    <section className="section videos" key="videos">
      <div className="section-header">
        <h2 className="section-title">Video Content</h2>
        {isAdmin && videos.length > 0 && (
          <button
            className="section-delete-btn"
            onClick={() => {/* Delete all videos */}}
            title="Delete all videos"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        )}
      </div>
      <div className="video-list">
        {videos.map((video) => {
          const videoId = `video-${video.id}`;
          const isPlaying = playingVideos[videoId];

          return (
            <div className="video-item-wrapper" key={video.id}>
              {isAdmin && (
                <button
                  className="video-delete-btn"
                  onClick={() => onDeleteVideo?.(video.id)}
                  title="Delete video"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
              <div className="video-card compact centered-content">
                <div className="video-wrapper small">
                  {isPlaying ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYoutubeId(video.youtubeUrl)}?autoplay=1&rel=0&modestbranding=1&showinfo=0&playsinline=1${isIOS() ? '&mute=1' : ''}`}
                      allow={isIOS() ? "autoplay; encrypted-media; fullscreen; picture-in-picture; muted" : "autoplay; encrypted-media; fullscreen; picture-in-picture"}
                      allowFullScreen
                    />
                  ) : (
                    <div
                      className="video-placeholder"
                      onClick={() => handlePlayVideo(videoId)}
                    >
                      <img
                        src={getYoutubeThumbnail(video.youtubeUrl)}
                        alt={video.title || "Video thumbnail"}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const currentSrc = img.src;
                          const videoId = getYoutubeId(video.youtubeUrl);

                          if (!videoId) {
                            img.style.display = 'none';
                            return;
                          }

                          const baseUrl = `https://img.youtube.com/vi/${videoId}`;

                          if (currentSrc.includes('maxresdefault')) {
                            img.src = `${baseUrl}/sddefault.jpg`;
                          } else {
                            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDAwIi8+PC9zdmc+';
                          }
                        }}
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          const videoId = getYoutubeId(video.youtubeUrl);

                          if (!videoId) return;

                          if (img.naturalWidth <= 130 && img.naturalHeight <= 100) {
                            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDAwIi8+PC9zdmc+';
                          }
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '8px'
                        }}
                      />
                      <div className="play-icon" aria-hidden="true">
                        <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="8,5 19,12 8,19" />
                        </svg>
                      </div>
                      {video.title && (
                        <div className="video-title-overlay">{video.title}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {isAdmin && (
        <div className="content-add-section">
          <button
            className="content-add-btn"
            onClick={onAddVideo}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            Add Video
          </button>
        </div>
      )}
    </section>
  );
};
