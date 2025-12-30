import React, { useState, useRef, useEffect } from 'react';
import './Header.css';
import { useAuth } from '../../context/AuthContext';
import SettingsDropdown from '../SettingsDropdown/SettingsDropdown';

interface HeaderProps {
  onMenuToggle?: () => void;
  onLogout?: () => void;
  username?: string;
  email?: string;
  onNavigate?: (path: string) => void;
  currentMode?: "deep" | "normal" | "rush";
  onModeChange?: (mode: "deep" | "normal" | "rush") => void;
  onAdminToggle?: () => void;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
  hasContent?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onMenuToggle,
  onLogout,
  username: usernameProp,
  email: emailProp,
  currentMode = "normal",
  onModeChange,
  onAdminToggle,
  onFullscreenToggle,
  isFullscreen = false,
  hasContent = false
}) => {
  const { user, logout: authLogout, isAdmin } = useAuth();
  
  // Use actual user data from AuthContext, fallback to props if provided
  const email = user?.email || emailProp || "user@example.com";
  const username = usernameProp || (email ? email.split('@')[0] : "User");
  
  const handleLogout = () => {
    setShowProfileDropdown(false);
    authLogout();
    if (onLogout) onLogout();
  };
  // Profile dropdown
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Mode dropdown
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  // currentMode is now passed as a prop

  const modeLabel = {
    deep: "Deep mode",
    normal: "Normal mode",
    rush: "Rush mode"
  };

  const handleModeSelect = (mode: "deep" | "normal" | "rush") => {
    if (onModeChange) onModeChange(mode);
    setModeDropdownOpen(false);
  };







  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <div className="menu-toggle-container">
          <button
            className="menu-toggle-btn"
            onClick={onMenuToggle}
            title="Ctrl+Z"
            aria-label="Toggle sidebar (Ctrl+Z)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
        <div className="header-logo">
          <h1>SpoonFeeder</h1>
        </div>
      </div>

      <div className="header-right">
        {/* Mode Dropdown */}
        <div className="mode-dropdown">
          <button
            className="mode-btn"
            onClick={() => {
              setModeDropdownOpen(!modeDropdownOpen);
              if (!modeDropdownOpen) {
                setShowProfileDropdown(false);
              }
            }}
          >
            {modeLabel[currentMode]}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mode-arrow"
              style={{
                transform: modeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {modeDropdownOpen && (
            <div className="mode-dropdown-menu">
              <div onClick={() => handleModeSelect("deep")}>
                Deep mode
              </div>
              <div onClick={() => handleModeSelect("normal")}>
                Normal mode
              </div>
              <div onClick={() => handleModeSelect("rush")}>
                Rush mode
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Button - Only show when content is loaded */}
        {hasContent && (
          <div className="fullscreen-btn-container">
            <button
              className="fullscreen-btn"
              onClick={onFullscreenToggle}
              title="Shift+F"
            >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isFullscreen ? (
                <>
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3"/>
                </>
              ) : (
                <>
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </>
              )}
            </svg>
            </button>
          </div>
        )}

        {/* Admin Button - Only show for admin users */}
        {isAdmin && (
          <button
            className="admin-btn"
            onClick={onAdminToggle}
            title="Admin Panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 1z"/>
            </svg>
          </button>
        )}

        {/* User Profile Dropdown */}
        <div className="user-profile" ref={profileDropdownRef}>
          <button
            className="avatar"
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              if (!showProfileDropdown) {
                setModeDropdownOpen(false);
              }
            }}
            aria-label="User menu"
          >
            <span>{(username || email).charAt(0).toUpperCase()}</span>
          </button>

          {showProfileDropdown && (
            <div className="profile-dropdown">
              <div className="profile-info">
                <div className="profile-username">{username}</div>
                <div className="profile-email">{email}</div>
              </div>
              <div className="profile-divider"></div>
              {/* Settings Button + Dropdown */}
              <div className="settings-container">
                <button
                  className="settings-btn"
                  onClick={() => setSettingsOpen(prev => !prev)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Settings
                </button>

                {/* SettingsDropdown panel */}
                {settingsOpen && (
                  <SettingsDropdown onSave={() => setShowProfileDropdown(false)} />
                )}
              </div>
              <div className="profile-divider"></div>
              <button className="logout-btn" onClick={handleLogout}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
