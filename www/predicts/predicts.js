var geojsonMarkerOptions = {
    radius: 8,
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};

var class_airspace = new L.GeoJSON.AJAX('../data/class_airspace.geojson', {
    onEachFeature: function (f, l) {
        l.bindPopup('<pre>' + JSON.stringify(f.properties, null, ' ').replace(/[\{\}"]/g, '') + '</pre>');
    },
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, geojsonMarkerOptions);
    }
});

var mcdonalds = new L.GeoJSON.AJAX('../data/mcdonalds.geojson', {
    onEachFeature: function (f, l) {
        l.bindPopup('<pre>' + JSON.stringify(f.properties, null, ' ').replace(/[\{\}"]/g, '') + '</pre>');
    }
});

var overlay_layers = {'Airspace': class_airspace, 'McDonald\'s Locations': mcdonalds};

var main_map = L.map('main_map', {layers: [base_layers['OSM Road'], overlay_layers['Airspace']]}).setView([39.656674, -77.934194], 9);
var layer_control = L.control.layers(base_layers, overlay_layers, {
    collapsed: false
}).addTo(main_map);

