// Ensure coordinates are defined from EJS before using this script
if (typeof coordinates === 'undefined') {
    console.error("Mapbox Error: coordinates is not defined.");
} else {
    mapboxgl.accessToken = 'pk.eyJ1IjoibWFoaXIyOCIsImEiOiJjbHo1dHl4YTkzdTJ4MmtxczNiMnh5ZmRwIn0.vw2lN4zHIjvMiUQuM5iOqA';
    const map = new mapboxgl.Map({
        container: 'map', // container ID
        center: coordinates, // starting position [lng, lat]
        zoom: 15.1, // starting zoom
        pitch: 62, // starting pitch
        bearing: -20, // starting bearing
        style: 'mapbox://styles/mapbox/standard' // style URL
    });

    map.on('style.load', () => {
        map.addSource('line', {
            type: 'geojson',
            lineMetrics: true,
            data: {
                type: 'LineString',
                coordinates: [
                    [2.293389857555951, 48.85896319631851],
                    [2.2890810326441624, 48.86174223718291]
                ]
            }
        });

        map.addLayer({
            id: 'line',
            source: 'line',
            type: 'line',
            paint: {
                'line-width': 12,
                // The `*-emissive-strength` properties control the intensity of light emitted on the source features.
                // To enhance the visibility of a line in darker light presets, increase the value of `line-emissive-strength`.
                'line-emissive-strength': 0.8,
                'line-gradient': [
                    'interpolate',
                    ['linear'],
                    ['line-progress'],
                    0,
                    'red',
                    1,
                    'blue'
                ]
            }
        });

        // Add 3D buildings from Mapbox's building layer
        const layers = map.getStyle().layers;
        const labelLayerId = layers.find(
          (layer) => layer.type === 'symbol' && layer.layout['text-field']
        )?.id;

        map.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.6
            }
          },
          labelLayerId
        );

        // --- User location & route planning using geolocation ---
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const userLocation = [position.coords.longitude, position.coords.latitude];

                // Add user location marker
                new mapboxgl.Marker({ color: 'blue' })
                    .setLngLat(userLocation)
                    .setPopup(new mapboxgl.Popup().setText("Your Location"))
                    .addTo(map);

                // Add route from user location to destination (listing)
                map.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: [userLocation, coordinates]
                        }
                    }
                });

                map.addLayer({
                    id: 'route-layer',
                    type: 'line',
                    source: 'route',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': '#3b82f6',
                        'line-width': 6
                    }
                });
            }, () => {
                console.warn("Geolocation permission denied or unavailable.");
            });
        }
    });

    document
        .getElementById('lightPreset')
        .addEventListener('change', function () {
            map.setConfigProperty('basemap', 'lightPreset', this.value);
        });

    document
        .querySelectorAll('.map-overlay-inner input[type="checkbox"]')
        .forEach((checkbox) => {
            checkbox.addEventListener('change', function () {
                map.setConfigProperty('basemap', this.id, this.checked);
            });
        });
}



// The rest of your code below remains the same

if (typeof reviewForm === 'undefined') {
    const reviewForm = document.querySelector('form[action$="/reviews"]');
    if (reviewForm) {
        reviewForm.addEventListener('submit', function (event) {
            const ratingChecked = document.querySelector('input[name="review[rating]"]:checked');
            if (!ratingChecked || ratingChecked.value === "") {
                alert("Please select a rating!");
                event.preventDefault();
            }
        });
    }
}


// Enhanced interactivity
document.addEventListener('DOMContentLoaded', function () {
    const lightPreset = document.getElementById('lightPreset');
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');

    // Add preset indicator to select options
    lightPreset.addEventListener('change', function () {
        const selectedValue = this.value;
        // console.log('Light preset changed to:', selectedValue);

        // Add visual feedback
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
    });

    // Enhanced checkbox interactions
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const label = this.closest('.checkbox-item');

            if (this.checked) {
                label.style.background = 'rgba(102, 126, 234, 0.2)';
                setTimeout(() => {
                    label.style.background = '';
                }, 300);
            }

            console.log(`${this.id} is now ${this.checked ? 'enabled' : 'disabled'}`);
        });
    });

    // Add ripple effect to checkbox items
    document.querySelectorAll('.checkbox-item').forEach(item => {
        item.addEventListener('click', function (e) {
            const ripple = document.createElement('div');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                            position: absolute;
                            width: ${size}px;
                            height: ${size}px;
                            left: ${x}px;
                            top: ${y}px;
                            background: rgba(255, 255, 255, 0.3);
                            border-radius: 50%;
                            transform: scale(0);
                            animation: ripple 0.6s linear;
                            pointer-events: none;
                        `;

            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Add CSS for ripple animation
    const style = document.createElement('style');
    style.textContent = `
                    @keyframes ripple {
                        to {
                            transform: scale(2);
                            opacity: 0;
                        }
                    }
                `;
    document.head.appendChild(style);
});

//fro comment  section in show page
