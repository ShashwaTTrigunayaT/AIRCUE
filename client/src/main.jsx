import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './styles/index.css';
import App from './App.jsx';
import { LocationProvider } from './context/LocationContext.jsx';
import { AlertsProvider } from './context/AlertsContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocationProvider>
        <AlertsProvider>
          <App />
        </AlertsProvider>
      </LocationProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
