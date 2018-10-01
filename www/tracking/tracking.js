// let last_packets = {};

// asynchronously load polygons of controlled airspace from GeoJSON file
let controlled_airspace = L.geoJson.ajax('../data/controlled_airspace.geojson', {
    onEachFeature: popupProperties,
    style: function (feature) {
        let local_type = feature.properties['LOCAL_TYPE'];

        switch (local_type) {
            case 'R':
                return {color: "red"};
            case 'CLASS_B':
                return {color: "orange"};
            case 'CLASS_C':
                return {color: "yellow"};
            case 'CLASS_D':
                return {color: "purple"};
            default:
                return {color: "green"};
        }
    }
});

// asynchronously load polygons of uncontrolled airspace from GeoJSON file
let uncontrolled_airspace = L.geoJson.ajax('../data/uncontrolled_airspace.geojson', {
    onEachFeature: popupProperties
});

// retrieve a single predict from the given API and convert to a GeoJSON Feature (LineString)
function getAPRSPoint(station_callsign) {
    let api_url = 'https://api.aprs.fi/api/get';

    let cors_query = encodeURIComponent('select * from json where url="http://api.aprs.fi/api/get?name=' + station_callsign + '&what=loc&apikey=' + aprs_fi_api_key + '&format=json"');

    // use Yahoo JSONP proxy to emulate CORS request, taken from https://gist.github.com/cmdcolin/1aefb766d224446341ab
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: 'http://query.yahooapis.com/v1/public/yql?q=' + cors_query + '&format=json&callback=?',
            type: 'GET',
            dataType: 'jsonp',
            success: function (data) {
                if (data.query.results.json.found > 0) {
                    let response_entries = data.query.results.json['entries'];

                    let output_feature = {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [response_entries['lng'], response_entries['lat']]
                        },
                        properties: response_entries
                    };

                    resolve(output_feature);
                } else {
                    reject(data);
                }
            },
            error: function (response, status, error) {
                reject(response);
            }
        });
    });
}

// retrieve predicts for every launch location, and put them into a GeoJSON FeatureCollection
async function getAPRSGeoJSON(station_names) {
    let features_geojson = {type: 'FeatureCollection', features: []};

    for (station_index in station_names) {
        let station_name = station_names[station_index];

        await getAPRSPoint(station_name).then(function (feature) {
            features_geojson['features'].push(feature);
        }).catch(function (response) {
            console.log('APRS API error: ' + response.query.results.json.found + ' results found on ' + response.query.created);
            }
        )
    }

    return features_geojson;
}

// return the overall bounds of multiple layers
function getOverallBounds(layers) {
    let northeast = layers[0].getBounds()._northEast;
    northeast = [northeast.lat, northeast.lng];
    let southwest = layers[0].getBounds()._southWest;
    southwest = [southwest.lat, southwest.lng];

    for (layer_index in layers) {
        let bounds = layers[layer_index].getBounds();
        if (bounds._northEast.lat > northeast[0]) {
            northeast[0] = bounds._northEast.lat;
        }
        if (bounds._northEast.lng > northeast[1]) {
            northeast[1] = bounds._northEast.lng;
        }
        if (bounds._southWest.lat < northeast[0]) {
            northeast[0] = bounds._northEast.lat;
        }
        if (bounds._southWest.lng < northeast[1]) {
            northeast[1] = bounds._northEast.lng;
        }
    }

    return L.latLngBounds(northeast, southwest);
}

// remove all layers from the map
async function removeAPRSLayers() {
    for (layer_group in overlay_layers) {
        if (layer_group != 'reference') {
            for (layer_name in overlay_layers[layer_group]) {
                layer_control.removeLayer(overlay_layers[layer_group][layer_name]);
                map.removeLayer(overlay_layers[layer_group][layer_name]);
                delete overlay_layers[layer_group][layer_name];
            }
        }
    }
}

async function changeAPRSLayers() {
    removeAPRSLayers();

    let flight_callsigns = document.getElementById('flight_callsigns_input').value;
    let ground_callsigns = document.getElementById('ground_callsigns_input').value;

    flight_callsigns = document.getElementById('flight_callsigns_input').value;
    ground_callsigns = document.getElementById('ground_callsigns_input').value;

    if (flight_callsigns) {
        flight_callsigns = document.getElementById('flight_callsigns_input').value.split(',');

        var flight_aprs_geojson = await getAPRSGeoJSON(flight_callsigns);

        if (flight_aprs_geojson.features.length > 0) {
            var flight_aprs_layer = L.geoJSON(flight_aprs_geojson, {
                onEachFeature: popupProperties,
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: new L.Icon({
                            iconSize: [33, 42],
                            iconUrl: '../data/icons/balloon.png'
                        })
                    });
                },
                attribution: '&copy; https://aprs.fi'
            });

            overlay_layers['flight']['balloon'] = flight_aprs_layer;

            layer_control.addOverlay(flight_aprs_layer, 'balloon', 'flight');

            flight_aprs_layer.addTo(map);
        }
    }

    if (ground_callsigns) {
        ground_callsigns = document.getElementById('ground_callsigns_input').value.split(',');

        var ground_aprs_geojson = await getAPRSGeoJSON(ground_callsigns);

        if (ground_aprs_geojson.features.length > 0) {
            var ground_aprs_layer = L.geoJSON(ground_aprs_geojson, {
                onEachFeature: popupProperties,
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: new L.Icon({
                            iconSize: [41, 20],
                            iconUrl: '../data/icons/van.png'
                        })
                    });
                },
                attribution: '&copy; https://aprs.fi'
            });

            overlay_layers['ground']['vans'] = ground_aprs_layer;

            layer_control.addOverlay(ground_aprs_layer, 'vans', 'ground');

            ground_aprs_layer.addTo(map);
        }
    }

    // if (last_packets.length > 0) {
    //
    // } else {
    //     last_packets['ground'] = {};
    //     last_packets['flight'] = {};
    //
    //     // for (packet in ) {
    //     //
    //     // }
    // }

    if (flight_aprs_layer && ground_aprs_layer) {
        map.fitBounds(getOverallBounds([ground_aprs_layer, flight_aprs_layer]), {padding: [50, 50]});
    }
}

// dictionary to contain toggleable layers
let overlay_layers = {
    'reference': {
        'Controlled Airspace': controlled_airspace,
        'Uncontrolled Airspace': uncontrolled_airspace
    },
    'ground': {},
    'flight': {}
};

// add Leaflet map to "map" div with grouped layer control
let map = L.map('map', {layers: [base_layers['OSM Road'], controlled_airspace]}).setView([39.656674, -77.934194], 9);
let layer_control = L.control.groupedLayers(base_layers, overlay_layers);
layer_control.addTo(map);

window.onload = function () {
    changeAPRSLayers();

    window.setInterval(changeAPRSLayers(), 10000);
};
