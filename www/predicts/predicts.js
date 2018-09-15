var predicts_overlay_layers = {
    'Controlled Airspace': new L.GeoJSON.AJAX('../data/controlled_airspace.geojson', {
        onEachFeature: popupProperties,
        style: function (feature) {
            let local_type = feature.properties['LOCAL_TYPE'];

            if (local_type == 'R') {
                return {
                    color: "red"
                };
            } else if (local_type == 'CLASS_B') {
                return {
                    color: "orange"
                };
            } else if (local_type == 'CLASS_C') {
                return {
                    color: "yellow"
                };
            } else if (local_type == 'CLASS_D') {
                return {
                    color: "purple"
                };
            } else {
                return {
                    color: "green"
                }
            }
        }
    }),
    'Uncontrolled Airspace': new L.GeoJSON.AJAX('../data/uncontrolled_airspace.geojson', {
        onEachFeature: popupProperties
    }),
    'Launch Locations': new L.GeoJSON.AJAX('../data/launch_locations.geojson', {
        onEachFeature: popupProperties,
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 4,
                fillColor: "#00ff13",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        }
    }),
    'McDonald\'s Locations': new L.GeoJSON.AJAX('../data/mcdonalds.geojson', {
        onEachFeature: popupProperties,
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 4,
                fillColor: "#ff7800",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        }
    })
};

var predicts_map = L.map('predicts_map', {layers: [base_layers['OSM Road'], predicts_overlay_layers['Controlled Airspace']]}).setView([39.656674, -77.934194], 9);

L.control.layers(base_layers, predicts_overlay_layers, {
    collapsed: false
}).addTo(predicts_map);

