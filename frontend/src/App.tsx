import { useState, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import Login from "./pages/Auth/auth";
import ContentView from "./pages/ContentView/ContentView";
import CollegeDepartment from "./pages/CollegeDepartment/collegeDepartment";
import PWAInstallPrompt from "./components/PWAInstallPrompt/PWAInstallPrompt";
import { HierarchyProvider } from "./context/HeirarchyContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#0E0E10',
      color: '#c4c7cc',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
      <h1 style={{ color: '#ff6b6b', marginBottom: '16px' }}>Something went wrong</h1>
      <p style={{ marginBottom: '20px', maxWidth: '500px' }}>
        We're sorry, but something unexpected happened. Please try refreshing the page.
      </p>
      <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '20px' }}>
        Error: {error.message}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={resetErrorBoundary}
          style={{
            padding: '10px 20px',
            background: '#2563EB',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<"login" | "register" | "content" | "heirarchy" | "collegeDepartment">("login");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if running as PWA (already installed)
  const isPWA = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  };

  // Helper function to check hierarchy (called when auth state changes)
  const checkHasHierarchy = () => {
    return isAuthenticated && localStorage.getItem('hierarchy') !== null;
  };

  const navigateToLogin = () => setCurrentPage("login");
  const navigateToRegister = () => setCurrentPage("register");
  const navigateToContent = () => setCurrentPage("content");
  const navigateToHeirarchy = () => setCurrentPage("heirarchy");
  const navigateToCollegeDepartment = () => setCurrentPage("collegeDepartment");

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Determine initial page based on authentication and hierarchy status
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // User is authenticated
        if (checkHasHierarchy()) {
          // User has completed hierarchy setup, go to content
          setCurrentPage("content");
        } else {
          // User hasn't completed hierarchy setup, go to college department selection
          setCurrentPage("collegeDepartment");
        }
      } else {
        // User is not authenticated, show login
        setCurrentPage("login");
      }
    }
  }, [isAuthenticated, isLoading]);

  // Skip loading screen in PWA mode to avoid duplicate splash screen
  // The native PWA splash screen already handles the initial loading
  if (isLoading && !isPWA()) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0E0E10',
        color: '#c4c7cc',
        gap: '20px'
      }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(37, 99, 235, 0.1)',
          borderTopColor: '#2563EB',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            Loading SpoonFeeder
          </div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Setting up your learning environment...
          </div>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "login":
        return <Login onNavigateToRegister={navigateToRegister} onNavigateToContent={navigateToContent} onNavigateToHeirarchy={navigateToHeirarchy} onNavigateToCollegeDepartment={navigateToCollegeDepartment} />;
      case "register":
        return <Login onNavigateToRegister={navigateToRegister} onNavigateToContent={navigateToContent} onNavigateToHeirarchy={navigateToHeirarchy} onNavigateToCollegeDepartment={navigateToCollegeDepartment} initialMode="register" />;
      case "collegeDepartment":
        return <CollegeDepartment onNavigateToContent={navigateToContent} />;
      case "content":
        return <ContentView
          onNavigateToLogin={navigateToLogin}
          onNavigateToHeirarchy={navigateToHeirarchy}
          isFullscreen={isFullscreen}
          onFullscreenToggle={toggleFullscreen}
        />;
      case "heirarchy":
        // Heirarchy component is no longer used - users go directly to ContentView
        return <ContentView
          onNavigateToLogin={navigateToLogin}
          onNavigateToHeirarchy={navigateToHeirarchy}
          isFullscreen={isFullscreen}
          onFullscreenToggle={toggleFullscreen}
        />;
      default:
        return <Login onNavigateToRegister={navigateToRegister} onNavigateToContent={navigateToContent} onNavigateToHeirarchy={navigateToHeirarchy} onNavigateToCollegeDepartment={navigateToCollegeDepartment} />;
    }
  };

  return (
    <HierarchyProvider>
      {renderPage()}
      <PWAInstallPrompt />
    </HierarchyProvider>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

