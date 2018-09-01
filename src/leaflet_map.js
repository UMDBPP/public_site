import * as L from "leaflet";

var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

var base_layers = {'OSM Road': OpenStreetMap_Mapnik};
var overlay_layers = {};

var main_map = L.map('main_map').setView([39.656674, -77.934194], 5);

var layer_control = L.control.layers(base_layers, overlay_layers, {
    collapsed: false
});

base_layers[Object.keys(baseLayers)[0]].addTo(main_map);

layer_control.addTo(main_map);