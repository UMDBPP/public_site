let map_title = '<strong>APRS Balloon Tracking</strong>';

overlay_layers['ground'] = {};
overlay_layers['flight'] = {};

let layer_control = L.control.groupedLayers(base_layers, overlay_layers);

let title_control = L.control({
    position: 'topleft'
});

title_control.onAdd = function (map) {
    let div = document.createElement('div');
    div.setAttribute('style', 'background-color: white; padding: 2px;');
    div.innerHTML = map_title;
    return div;
};

map.addControl(layer_control);
map.addControl(title_control);

map.setView([39.656674, -77.934194], 9);

map.addLayer(controlled_airspace);

window.onload = function () {
    updateAPRSLayers();
    window.setInterval(updateAPRSLayers(), 10000);
};

// let last_packets = {};

/* retrieve a single predict from the given API and convert to a GeoJSON Feature (LineString) */
async function getAPRSPoint(station_callsign) {
    let api_url = 'https://api.aprs.fi/api/get';

    let cors_query = encodeURIComponent('select * from json where url="' + api_url + '?name=' + station_callsign + '&what=loc&apikey=' + aprs_fi_api_key + '&format=json"');

    /* use Yahoo JSONP proxy to emulate CORS request, taken from https://gist.github.com/cmdcolin/1aefb766d224446341ab */
    /* TODO APRS.fi doesn't like this, figure out a way to do it server-side */
    return new Promise(function (resolve, reject) {
        $.ajax({
            'url': 'http://query.yahooapis.com/v1/public/yql?q=' + cors_query + '&format=json&callback=?',
            'type': 'GET',
            'dataType': 'jsonp',
            success: function (data) {
                if (data.query.results.json.found > 0) {
                    let response_entries = data.query.results.json['entries'];

                    let output_feature = {
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Point',
                            'coordinates': [response_entries['lng'], response_entries['lat']]
                        },
                        'properties': response_entries
                    };

                    resolve(output_feature);
                } else {
                    reject(data);
                }
            },
            'error': function (response, status, error) {
                reject(response);
            }
        });
    });
}

/* retrieve predicts for every launch location, and put them into a GeoJSON FeatureCollection */
async function getAPRSGeoJSON(station_names) {
    let features_geojson = {'type': 'FeatureCollection', 'features': []};

    for (let station_name of station_names) {
        await getAPRSPoint(station_name).then(function (feature) {
            features_geojson['features'].push(feature);
        }).catch(function (response) {
                console.log('APRS API error: ' + response.query.results.json.found + ' results found on ' + response.query.created);
            }
        )
    }

    return features_geojson;
}

/* remove all layers from the map */
function removeAPRSLayers() {
    for (let layer_group in overlay_layers) {
        if (layer_group != 'reference') {
            for (let layer_name in overlay_layers[layer_group]) {
                layer_control.removeLayer(overlay_layers[layer_group][layer_name]);
                map.removeLayer(overlay_layers[layer_group][layer_name]);
                delete overlay_layers[layer_group][layer_name];
            }
        }
    }
}

async function updateAPRSLayers(resize = true) {
    removeAPRSLayers();

    let flight_callsigns = document.getElementById('flight_callsigns_input').value;
    let ground_callsigns = document.getElementById('ground_callsigns_input').value;

    let layers_valid = true;

    if (flight_callsigns != null) {
        flight_callsigns = flight_callsigns.split(',');

        let flight_aprs_geojson = await getAPRSGeoJSON(flight_callsigns);

        if (flight_aprs_geojson.features.length > 0) {
            let flight_aprs_point_layer = L.geoJSON(flight_aprs_geojson, {
                'onEachFeature': popupFeaturePropertiesOnClick,
                'pointToLayer': function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: new L.Icon({
                            iconSize: [33, 42],
                            iconUrl: data_dir + 'icons/balloon.png'
                        })
                    });
                },
                'attribution': '&copy; https://aprs.fi'
            });

            if (flight_aprs_point_layer != null) {
                overlay_layers['flight']['balloon'] = flight_aprs_point_layer;
                layer_control.addOverlay(flight_aprs_point_layer, 'balloon', 'flight');
                map.addLayer(flight_aprs_point_layer);
            } else {
                layers_valid = false;
            }
        }
    }

    if (ground_callsigns != null) {
        ground_callsigns = ground_callsigns.split(',');

        let ground_aprs_geojson = await getAPRSGeoJSON(ground_callsigns);

        if (ground_aprs_geojson.features.length > 0) {
            let ground_aprs_point_layer = L.geoJSON(ground_aprs_geojson, {
                'onEachFeature': popupFeaturePropertiesOnClick,
                'pointToLayer': function (feature, latlng) {
                    return L.marker(latlng, {
                        'icon': new L.Icon({
                            'iconSize': [41, 20],
                            'iconUrl': data_dir + 'icons/van.png'
                        })
                    });
                },
                'attribution': '&copy; https://aprs.fi'
            });

            if (ground_aprs_point_layer != null) {
                overlay_layers['ground']['vans'] = ground_aprs_point_layer;
                layer_control.addOverlay(ground_aprs_point_layer, 'vans', 'ground');
                map.addLayer(ground_aprs_point_layer);
            } else {
                layers_valid = false;
            }
        }
    }

    // if (last_packets.length > 0) {
    //
    // } else {
    //     last_packets['ground'] = {};
    //     last_packets['flight'] = {};
    //
    //     // for (let packet in ) {
    //     //
    //     // }
    // }

    if (resize) {
        resizeToOverlayLayers();
    }
}
