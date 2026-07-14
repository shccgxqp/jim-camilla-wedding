import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import App from './App.jsx';
import WeddingSite from './wedding/WeddingSite.jsx';
import WeddingSiteV2 from './wedding-v2/WeddingSiteV2.jsx';
import RemoteCameraPage from './screens/RemoteCameraPage.jsx';
import PhotoGalleryPage from './screens/PhotoGalleryPage.jsx';
import SiteVersionSwitch from './components/SiteVersionSwitch.jsx';
import './version-switch.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
  <BrowserRouter>
    <SiteVersionSwitch />
    <Routes>
        <Route path="/photo-booth/camera" element={<RemoteCameraPage />} />
        <Route path="/photo-booth/gallery" element={<PhotoGalleryPage />} />
        <Route path="/photo-booth/*" element={<AppProvider><App /></AppProvider>} />
        <Route path="/v2" element={<WeddingSiteV2 />} />
        <Route path="/*" element={<WeddingSite />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
