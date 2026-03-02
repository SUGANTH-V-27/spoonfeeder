import React, { useState } from 'react';

const getEmbeddedUrl = (url: string, isPdf: boolean) => {
  // Extract file ID from Google Drive sharing URL
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (!fileIdMatch) return url;

  const fileId = fileIdMatch[1];

  if (isPdf) {
    // 🎯 GITHUB PDF: Construct full GitHub raw URL from filename
    // Base URL: https://raw.githubusercontent.com/SUGANTH-V-27/pdf-storage/main/
    const githubBaseUrl = 'https://raw.githubusercontent.com/SUGANTH-V-27/pdf-storage/main/';
    const fullPdfUrl = githubBaseUrl + url; // url is just the filename
    return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fullPdfUrl)}`;
  } else {
    // For PPTs and other files: Use Google Docs viewer with preview URL.
    // Hint Google to use the first signed-in account (authuser=0).
    const drivePreviewUrl = `https://drive.google.com/uc?id=${fileId}`;
    return `https://docs.google.com/viewer?url=${encodeURIComponent(drivePreviewUrl)}&embedded=true&authuser=0`;
  }
};

interface Resource {
  id: number;
  title?: string;
  url: string;
  metadata?: { resourceType?: string };
}

interface ResourcesSectionProps {
  resources: Resource[];
  isAdmin: boolean;
  onDeleteResource?: (resourceId: number) => void;
  onAddResource?: () => void;
  onOpenResource?: (resourceId: number) => void;
  onFullscreenResource?: (resourceId: number) => void;
}

export const ResourcesSection: React.FC<ResourcesSectionProps> = ({
  resources,
  isAdmin,
  onDeleteResource,
  onAddResource,
  onOpenResource,
  onFullscreenResource
}) => {
  const [openResources, setOpenResources] = useState<Set<number>>(new Set());
  const [loadingResources, setLoadingResources] = useState<Set<number>>(new Set());

  const toggleResource = (resourceId: number) => {
    const newSet = new Set(openResources);
    if (newSet.has(resourceId)) {
      newSet.delete(resourceId);
    } else {
      newSet.add(resourceId);
      onOpenResource?.(resourceId);
    }
    setOpenResources(newSet);
  };

  const handleFullscreen = (resourceId: number) => {
    setLoadingResources(prev => new Set([...prev, resourceId]));
    onFullscreenResource?.(resourceId);
  };

  return (
    <section className="section resources" key="resources">
      <div className="section-header">
        <h2 className="section-title resources-section-title">Presentation & Resources</h2>
        {isAdmin && resources.length > 0 && (
          <button
            className="section-delete-btn"
            onClick={() => {/* Delete all resources */}}
            title="Delete all resources"
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

      <div className="drive-resources-container">
        {resources.map((res: any, index: number) => {
          const isOpen = openResources.has(res.id);
          const resourceType = res.metadata?.resourceType || 'ppt';
          const isPdf = resourceType === 'pdf';
          const isPpt = resourceType === 'ppt';

          return (
            <div className="resource-item" key={index}>
              {isAdmin && (
                <button
                  className="resource-delete-btn"
                  onClick={() => onDeleteResource?.(res.id)}
                  title="Delete resource"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}

              <div
                className="resource-preview"
                onClick={() => toggleResource(res.id)}
              >
                <div className="resource-preview-icon">
                  {isPdf ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  )}
                </div>
                <div className="resource-preview-content">
                  <h3 className="resource-preview-title">
                    {res.title || (isPdf ? 'PDF Document' : isPpt ? 'Presentation' : 'Resource')}
                  </h3>
                  <p className="resource-preview-desc">
                    Click to view {isPdf ? 'PDF document' : isPpt ? 'presentation slides' : 'external resource'}
                  </p>
                </div>
                <div className="resource-preview-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </div>

              {isOpen && (
                <>
                  <div className="resource-close-btn-container">
                    <button
                      className="resource-fullscreen-btn"
                      onClick={() => handleFullscreen(res.id)}
                      title="Fullscreen (Alt+S)"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                      </svg>
                    </button>
                    <button
                      className="resource-close-btn"
                      onClick={() => {
                        setOpenResources(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(res.id);
                          return newSet;
                        });
                      }}
                      title="Close"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div className="resource-frame-wrapper">
                    {loadingResources.has(res.id) && (
                      <div className="resource-loading">
                        <div className="resource-loading-spinner"></div>
                        <span className="resource-loading-text">Loading resource...</span>
                      </div>
                    )}
                    {isPdf ? (
                      // Use Google Docs PDF viewer for PDFs
                      <iframe
                        className="resource-frame"
                        src={getEmbeddedUrl(res.url, true)}
                        allow="autoplay"
                        title={res.title}
                        onLoad={() => setLoadingResources(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(res.id);
                          return newSet;
                        })}
                        style={{
                          opacity: loadingResources.has(res.id) ? 0 : 1,
                          transition: 'opacity 0.3s ease-in-out'
                        }}
                      />
                    ) : (
                      // Use direct iframe for PPTs (which work fine)
                      <iframe
                        className="resource-frame"
                        src={res.url}
                        allow="autoplay"
                        title={res.title}
                        onLoad={() => setLoadingResources(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(res.id);
                          return newSet;
                        })}
                        style={{
                          opacity: loadingResources.has(res.id) ? 0 : 1,
                          transition: 'opacity 0.3s ease-in-out'
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div className="content-add-section">
          <button
            className="content-add-btn"
            onClick={onAddResource}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add Resource
          </button>
        </div>
      )}
    </section>
  );
};
