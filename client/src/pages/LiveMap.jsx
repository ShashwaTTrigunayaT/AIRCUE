import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Crosshair, Database, MapPin } from 'lucide-react';
import { api } from '../services/api.js';
import { useLocationContext } from '../context/LocationContext.jsx';
import { useNearby } from '../hooks/useNearby.js';
import MapPanel from '../components/MapPanel.jsx';
import CleanAirFinder from '../components/CleanAirFinder.jsx';
import { Badge, DataBadge, ErrorState, InlineNotice, LoadingState, SectionHeading } from '../components/States.jsx';
import { formatDateTime, formatNumber, shortCoords } from '../utils/format.js';

export default function LiveMap() {
  const { location, setLocation } = useLocationContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mapData, setMapData] = useState({ status: 'loading', data: null, error: null });
  const [pickedPoint, setPickedPoint] = useState(null);
  const [radius, setRadius] = useState(25000);
  const nearby = useNearby(location, radius);

  useEffect(() => {
    const lat = Number(searchParams.get('lat'));
    const lon = Number(searchParams.get('lon'));
    const name = searchParams.get('name');
    if (Number.isFinite(lat) && Number.isFinite(lon) && lat !== location.latitude && lon !== location.longitude) {
      setLocation({
        name: name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        admin1: null,
        country: null,
        countryCode: null,
        latitude: lat,
        longitude: lon,
        timezone: location.timezone,
        source: 'map',
      });
    }
    // Only react to the incoming query parameters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setMapData((previous) => ({ ...previous, status: previous.data ? previous.status : 'loading', error: null }));
    api
      .map(location)
      .then((data) => {
        if (active) setMapData({ status: 'ready', data, error: null });
      })
      .catch((error) => {
        if (active) setMapData({ status: 'error', data: null, error: error?.message || 'The map layer could not be loaded.' });
      });
    return () => {
      active = false;
    };
  }, [location]);

  function openDashboard(next) {
    setLocation({ ...next, source: 'map' });
    navigate('/');
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Live map</p>
          <h1>Where is the air cleaner?</h1>
          <p className="page-lead">
            Explore modelled city-level AQI, OpenAQ station observations where available, and Clean Air Finder samples
            around the selected location. Marker colour is only used when a valid AQI and standard exist.
          </p>
        </div>
        <div className="map-status-card">
          <MapPin size={16} aria-hidden="true" />
          <div>
            <strong>{location.name}</strong>
            <small>{shortCoords(location.latitude, location.longitude)}</small>
          </div>
          {nearby.data?.origin?.usCategory ? (
            <Badge tone="modelled">US AQI {nearby.data.origin.usAqi}</Badge>
          ) : null}
        </div>
      </div>

      {mapData.status === 'loading' ? <LoadingState label="Loading the pollution map…" rows={2} /> : null}
      {mapData.status === 'error' ? (
        <ErrorState
          title="The map layer is unavailable"
          message={mapData.error}
          hint="City markers need the modelled air-quality feed. Station observations are independent of this layer."
        />
      ) : null}

      {mapData.data ? (
        <>
          <section className="panel map-panel">
            <div className="map-panel-head">
              <div>
                <h2>Air quality across cities</h2>
                <p className="section-description">
                  {mapData.data.cities.length} modelled city samples · {mapData.data.provider} ·{' '}
                  <DataBadge type="modelled" />
                </p>
              </div>
              <div className="map-panel-actions">
                {pickedPoint ? (
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => openDashboard({ ...pickedPoint, name: 'Picked point' })}>
                    <Crosshair size={14} aria-hidden="true" /> Open picked point
                  </button>
                ) : (
                  <span className="map-hint">Click anywhere on the map to pick a point.</span>
                )}
              </div>
            </div>

            <MapPanel
              cities={mapData.data.cities}
              stations={mapData.data.stations}
              selectedLocation={location}
              onSelectCity={openDashboard}
              onPickPoint={setPickedPoint}
              pickedPoint={pickedPoint}
              samples={nearby.data?.samples || []}
            />

            <p className="panel-note">
              {mapData.data.notes.join(' ')} Tiles © OpenStreetMap contributors; follow the OpenStreetMap tile usage
              policy for production traffic.
            </p>
          </section>

          <section className="panel" aria-labelledby="stations-title">
            <SectionHeading
              id="stations-title"
              eyebrow="Ground observations"
              title="Nearby monitoring stations"
              description="OpenAQ observations are shown separately from the modelled city layer, with their own timestamps and units."
              action={<DataBadge type="observed" />}
            />

            {mapData.data.stations?.available ? (
              mapData.data.stations.stations.length ? (
                <>
                  {mapData.data.stations.stations.every((station) => !station.readings.length) ? (
                    <InlineNotice tone="info" title="Stations found, but no recent readings">
                      OpenAQ returned {mapData.data.stations.stations.length} monitoring stations within{' '}
                      {mapData.data.stations.searchedRadiusMeters / 1000} km, but none published recent measurements.
                      Missing readings are not zero pollution, and the modelled city layer remains available.
                    </InlineNotice>
                  ) : null}
                <div className="station-list">
                  {mapData.data.stations.stations.map((station) => (
                    <article key={station.id} className="station-card">
                      <header>
                        <div>
                          <h3>{station.name}</h3>
                          <p>
                            {[station.locality, station.country].filter(Boolean).join(', ')} ·{' '}
                            {station.distanceMeters !== null ? `${(station.distanceMeters / 1000).toFixed(1)} km` : 'distance unknown'}
                          </p>
                        </div>
                        <Badge tone="observed">Observed</Badge>
                      </header>
                      {station.readings.length ? (
                        <ul className="station-readings">
                          {station.readings.map((reading) => (
                            <li key={`${reading.pollutant}-${reading.at}`}>
                              <span>{reading.label}</span>
                              <strong>{formatNumber(reading.value, 1)}</strong>
                              <small>{reading.unit}</small>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="panel-note">No recent readings returned for this station.</p>
                      )}
                      <footer>
                        <span>Last updated {formatDateTime(station.lastUpdated)}</span>
                        <span>{station.isMonitor ? 'Regulatory monitor' : 'Non-regulatory sensor'}</span>
                        <span>OpenAQ station #{station.id}</span>
                      </footer>
                      <p className="station-note">{station.note}</p>
                    </article>
                  ))}
                </div>
                </>
              ) : (
                <InlineNotice tone="info" title="No stations found in the search radius">
                  {mapData.data.stations.reason} Modelled city data remains available.
                </InlineNotice>
              )
            ) : (
              <InlineNotice tone="info" title="Station observations are optional">
                {mapData.data.stations?.reason}
                {mapData.data.stations?.howToEnable ? (
                  <span>
                    <br />
                    {mapData.data.stations.howToEnable}
                  </span>
                ) : null}
              </InlineNotice>
            )}
          </section>
        </>
      ) : null}

      <CleanAirFinder location={location} radius={radius} onRadiusChange={setRadius} />
    </div>
  );
}
