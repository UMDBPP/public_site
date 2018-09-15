var overlay_layers = {};

var main_map = L.map('main_map', {layers: [base_layers['OSM Road']]}).setView([39.656674, -77.934194], 9);

var layer_control = L.control.layers(base_layers, overlay_layers, {
    collapsed: false
}).addTo(main_map);
