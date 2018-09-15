var flights_overlay_layers = {};

var flights_map = L.map('flights_map', {layers: [base_layers['OSM Road']]}).setView([39.656674, -77.934194], 9);

L.control.layers(base_layers, flights_overlay_layers, {
    collapsed: false
}).addTo(flights_map);
