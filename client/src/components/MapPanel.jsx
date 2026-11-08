import { useEffect } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { categoryColor, STANDARD_LABELS } from '../utils/aqi.js';
import { formatDateTime, formatNumber, shortCoords } from '../utils/format.js';
import { DataBadge, MapLegend } from './States.jsx';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

function cityAqi(city) {
  if (city.aqi?.US?.valid) return { standard: 'US', value: city.aqi.US.value, category: city.aqi.US.category };
  if (city.aqi?.CPCB?.valid) return { standard: 'CPCB', value: city.aqi.CPCB.value, category: city.aqi.CPCB.category };
  return null;
}

function cityIcon(city) {
  const reading = cityAqi(city);
  const color = reading ? categoryColor(reading.standard, reading.category?.key) : '#64748b';
  return L.divIcon({
    className: 'aqi-marker-wrapper',
    html: `<div class="aqi-marker" style="--marker-color:${color}"><strong>${reading ? reading.value : '–'}</strong><span>${city.name}</span></div>`,
    iconSize: [76, 46],
    iconAnchor: [38, 46],
    popupAnchor: [0, -42],
  });
}

function stationIcon() {
  return L.divIcon({
    className: 'station-marker-wrapper',
    html: '<div class="station-marker"><span>STN</span></div>',
    iconSize: [34, 24],
    iconAnchor: [17, 24],
    popupAnchor: [0, -20],
  });
}

function MapClickHandler({ onPickPoint }) {
  useMapEvents({
    click(event) {
      if (onPickPoint) onPickPoint({ latitude: Number(event.latlng.lat.toFixed(4)), longitude: Number(event.latlng.lng.toFixed(4)) });
    },
  });
  return null;
}

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.flyTo([center.latitude, center.longitude], map.getZoom() < 7 ? 9 : map.getZoom(), { duration: 0.8 });
  }, [center?.latitude, center?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function MapPanel({
  cities = [],
  stations,
  selectedLocation,
  onSelectCity,
  onPickPoint,
  samples = [],
  pickedPoint,
  showHeatmap = false,
}) {
  const center = selectedLocation
    ? { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }
    : { latitude: 21.5, longitude: 79 };

  return (
    <div className="map-shell">
      <MapContainer center={[center.latitude, center.longitude]} zoom={5} scrollWheelZoom className="map-canvas">
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <Recenter center={center} />

        {showHeatmap
          ? cities.flatMap((city) => {
              const block = city.aqi?.US;
              if (!block?.valid) return [];
              const color = categoryColor('US', block.category?.key);
              return [
                { radius: 70000, opacity: 0.08 },
                { radius: 45000, opacity: 0.12 },
                { radius: 22000, opacity: 0.16 },
              ].map((ring) => (
                <Circle
                  key={`heat-${city.id}-${ring.radius}`}
                  center={[city.latitude, city.longitude]}
                  radius={ring.radius}
                  pathOptions={{ stroke: false, fillColor: color, fillOpacity: ring.opacity }}
                  interactive={false}
                />
              ));
            })
          : null}

        {showHeatmap
          ? samples
              .filter((sample) => Number.isFinite(sample.usAqi) && Number.isFinite(sample.latitude))
              .flatMap((sample) => {
                const color = categoryColor('US', sample.usCategory?.key);
                return [
                  { radius: 9000, opacity: 0.14 },
                  { radius: 4500, opacity: 0.2 },
                ].map((ring) => (
                  <Circle
                    key={`heat-sample-${sample.latitude}-${sample.longitude}-${ring.radius}`}
                    center={[sample.latitude, sample.longitude]}
                    radius={ring.radius}
                    pathOptions={{ stroke: false, fillColor: color, fillOpacity: ring.opacity }}
                    interactive={false}
                  />
                ));
              })
          : null}
        <MapClickHandler onPickPoint={onPickPoint} />

        {cities.map((city) => {
          const reading = cityAqi(city);
          return (
            <Marker key={city.id} position={[city.latitude, city.longitude]} icon={cityIcon(city)} title={`${city.name} modelled AQI`}>
              <Popup>
                <div className="map-popup">
                  <h3>{city.name}</h3>
                  <p className="map-popup-sub">
                    {[city.admin1, city.country].filter(Boolean).join(', ')}
                  </p>
                  {reading ? (
                    <p className="map-popup-aqi" style={{ color: categoryColor(reading.standard, reading.category?.key) }}>
                      {reading.value}
                      <span>{STANDARD_LABELS[reading.standard]?.short} · {reading.category?.label}</span>
                    </p>
                  ) : (
                    <p className="map-popup-missing">No valid AQI for this hour.</p>
                  )}
                  <ul className="map-popup-list">
                    <li>PM2.5: {formatNumber(city.pollutants?.pm2_5, 1)} µg/m³</li>
                    <li>PM10: {formatNumber(city.pollutants?.pm10, 1)} µg/m³</li>
                    <li>Data hour: {formatDateTime(city.dataTimestamp)}</li>
                  </ul>
                  <p className="map-popup-provenance">
                    Modelled grid sample · Open-Meteo · not a station reading
                  </p>
                  <button type="button" className="btn btn-primary btn-small" onClick={() => onSelectCity(city)}>
                    Open dashboard
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {stations?.stations?.map((station) => (
          <Marker key={`station-${station.id}`} position={[station.latitude, station.longitude]} icon={stationIcon()} title={station.name}>
            <Popup>
              <div className="map-popup">
                <h3>{station.name}</h3>
                <p className="map-popup-sub">
                  {[station.locality, station.country].filter(Boolean).join(', ')}
                  {station.distanceMeters !== null ? ` · ${(station.distanceMeters / 1000).toFixed(1)} km away` : ''}
                </p>
                <p className="map-popup-provenance">
                  <DataBadge type="observed" /> Station observation · OpenAQ
                </p>
                {station.readings.length ? (
                  <ul className="map-popup-list">
                    {station.readings.map((reading) => (
                      <li key={`${reading.parameterName}-${reading.unit}`}>
                        {reading.label}: {formatNumber(reading.value, 1)} {reading.unit}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="map-popup-missing">No recent readings returned for this station.</p>
                )}
                <p className="map-popup-provenance">
                  AIR CUE does not assign an AQI category to a single station reading, so this marker is not AQI-coloured.
                </p>
                <p className="map-popup-provenance">Last updated: {formatDateTime(station.lastUpdated)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {selectedLocation ? (
          <CircleMarker
            center={[selectedLocation.latitude, selectedLocation.longitude]}
            radius={13}
            pathOptions={{ color: '#0b5f58', weight: 2, fillColor: '#0b5f58', fillOpacity: 0.12 }}
          >
            <Popup>
              <div className="map-popup">
                <h3>{selectedLocation.name}</h3>
                <p className="map-popup-sub">{shortCoords(selectedLocation.latitude, selectedLocation.longitude)}</p>
                <p className="map-popup-provenance">Currently selected location.</p>
              </div>
            </Popup>
          </CircleMarker>
        ) : null}

        {samples.map((sample) => (
          <CircleMarker
            key={`sample-${sample.latitude}-${sample.longitude}`}
            center={[sample.latitude, sample.longitude]}
            radius={7}
            pathOptions={{
              color: categoryColor('US', sample.usCategory?.key),
              weight: 2,
              fillColor: categoryColor('US', sample.usCategory?.key),
              fillOpacity: 0.55,
            }}
          >
            <Popup>
              <div className="map-popup">
                <h3>{sample.distanceKm} km {sample.bearingLabel}</h3>
                <p className="map-popup-sub">Clean Air Finder model sample</p>
                <p className="map-popup-aqi" style={{ color: categoryColor('US', sample.usCategory?.key) }}>
                  {sample.usAqi}
                  <span>US AQI · {sample.usCategory?.label}</span>
                </p>
                <p className="map-popup-list">PM2.5: {formatNumber(sample.pm25, 1)} µg/m³</p>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={() =>
                    onSelectCity({
                      name: `${sample.distanceKm} km ${sample.bearingLabel} of ${selectedLocation?.name || 'location'}`,
                      admin1: null,
                      country: null,
                      countryCode: selectedLocation?.countryCode || null,
                      latitude: sample.latitude,
                      longitude: sample.longitude,
                      timezone: selectedLocation?.timezone || null,
                    })
                  }
                >
                  Use this location
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {pickedPoint ? (
          <CircleMarker
            center={[pickedPoint.latitude, pickedPoint.longitude]}
            radius={9}
            pathOptions={{ color: '#475569', weight: 2, dashArray: '4 3', fillColor: '#475569', fillOpacity: 0.08 }}
          >
            <Popup>
              <div className="map-popup">
                <h3>Picked point</h3>
                <p className="map-popup-sub">{shortCoords(pickedPoint.latitude, pickedPoint.longitude)}</p>
                <p className="map-popup-provenance">Use the panel to load this point as the dashboard location.</p>
              </div>
            </Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>

      <div className="map-overlay">
        {showHeatmap ? (
          <p className="map-heat-note">
            Modelled US AQI heat field · interpolated circles · not a measured local value
          </p>
        ) : null}
        <MapLegend
          items={[
            { label: 'Good', color: categoryColor('US', 'good') },
            { label: 'Moderate', color: categoryColor('US', 'moderate') },
            { label: 'Sensitive groups', color: categoryColor('US', 'usg') },
            { label: 'Unhealthy', color: categoryColor('US', 'unhealthy') },
            { label: 'Station (no AQI)', color: '#64748b' },
          ]}
        />
        <p className="map-attribution-note">
          City circles: modelled AQI · squares with STN: OpenAQ observations (not AQI-coloured)
        </p>
      </div>
    </div>
  );
}
