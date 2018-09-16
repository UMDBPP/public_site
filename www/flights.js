// dictionary to contain toggleable layers
let overlay_layers = {};

// add Leaflet map to "map" div with grouped layer control
let map = L.map('map', {layers: [base_layers['OSM Road']]}).setView([39.656674, -77.934194], 9);
let layer_control = L.control.layers(base_layers, overlay_layers);
layer_control.addTo(map);
