import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Preload critical resources
const preloadResources = () => {
  // Preload logo
  const logoLink = document.createElement('link');
  logoLink.rel = 'preload';
  logoLink.href = 'https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMvbG9nby5wbmciLCJpYXQiOjE3NDg4MDA2NDEsImV4cCI6MjA2NDE2MDY0MX0.wNFNgarx6vPYOYs4sZiOAORnHU3qJCxZTRwEGIoA3MY';
  logoLink.as = 'image';
  document.head.appendChild(logoLink);
  
  // Preload verified badge
  const badgeLink = document.createElement('link');
  badgeLink.rel = 'preload';
  badgeLink.href = 'https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Vector%20(4).svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvVmVjdG9yICg0KS5zdmciLCJpYXQiOjE3NDg5MzUxMzksImV4cCI6MjA2NDI5NTEzOX0.IWBy-InoQwnwl5Q77PFrw2zWNw3UxlJGLWa778U4a8c';
  badgeLink.as = 'image';
  document.head.appendChild(badgeLink);
};

// Add event listener for page visibility changes to improve performance
document.addEventListener('visibilitychange', () => {
  // Reduce animations and updates when page is not visible
  if (document.hidden) {
    document.body.classList.add('reduced-motion');
  } else {
    document.body.classList.remove('reduced-motion');
  }
});

// Optimize initial load
if ('requestIdleCallback' in window) {
  // Use requestIdleCallback for non-critical initialization
  window.requestIdleCallback(preloadResources);
} else {
  // Fallback for browsers that don't support requestIdleCallback
  setTimeout(preloadResources, 1);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);