let flights = L.geoJson.ajax(data_dir + 'flights.geojson', {
    'onEachFeature': popupProperties,
    'style': function (feature) {
        return {'color': '#1B1464', 'weight': 5};
    }
});

// dictionary to contain toggleable layers
let overlay_layers = {
    'reference': {
        'Controlled Airspace': controlled_airspace,
        'Uncontrolled Airspace': uncontrolled_airspace,
        'McDonald\'s Locations': mcdonalds_locations,
        'Launch Locations': launch_locations
    },
    'flights': {
        'flights': flights
    }
};

// add Leaflet map to "map" div with grouped layer control
let map = L.map('map', {
    'layers': [base_layers['OSM Road'], launch_locations],
    'zoomSnap': 0
}).setView([39.7035, -77.3292], 9.5);

let layer_control = L.control.groupedLayers(base_layers, overlay_layers);
map.addControl(layer_control);

map.addLayer(flights);

// fit map to flights layer as soon as it loads
// flights.on('data:loaded', function () {
//     map.fitBounds(flights.getBounds());
// }.bind(this));