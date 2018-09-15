var tracking_overlay_layers = {};

var tracking_map = L.map('tracking_map', {layers: [base_layers['OSM Road']]}).setView([39.656674, -77.934194], 9);

L.control.layers(base_layers, tracking_overlay_layers, {
    collapsed: false
}).addTo(tracking_map);
