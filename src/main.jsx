import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import App from './App.jsx';
import WeddingSite from './wedding/WeddingSite.jsx';
import RemoteCameraPage from './screens/RemoteCameraPage.jsx';
import PhotoGalleryPage from './screens/PhotoGalleryPage.jsx';
import PhotoLibraryPage from './screens/PhotoLibraryPage.jsx';
import LiveWallPage from './screens/LiveWallPage.jsx';
import LiveWallControlPage from './screens/LiveWallControlPage.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
  <BrowserRouter>
    <Routes>
        <Route path="/photo-booth/camera" element={<RemoteCameraPage />} />
        <Route path="/photo-booth/gallery" element={<PhotoGalleryPage />} />
        <Route path="/photo-library" element={<PhotoLibraryPage />} />
        <Route path="/live-wall" element={<LiveWallPage />} />
        <Route path="/live-wall-control" element={<LiveWallControlPage />} />
        <Route path="/photo-booth/*" element={<AppProvider><App /></AppProvider>} />
        <Route path="/*" element={<WeddingSite />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
