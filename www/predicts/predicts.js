var predicts_overlay_layers = {
    'reference': {
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
            onEachFeature: popupProperties
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
    },
    'predict': {}
};

function getPredictLineString(api_url, launch_location_name, query_parameters) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            data: query_parameters,
            url: api_url,
            type: 'GET',
            dataType: 'json',
            aync: false,
            error: function (response, status, error) {
                reject(response, status, error);
            },
            success: function (response) {
                let linestring = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    },
                    properties: {
                        name: launch_location_name,
                        launch_datetime: query_parameters['launch_datetime'],
                        launch_longitude: query_parameters['launch_longitude'] - 360,
                        launch_latitude: query_parameters['launch_latitude'],
                        launch_altitude: query_parameters['launch_altitude']
                    }
                };

                for (stage_index in response['prediction']) {
                    let stage = response['prediction'][stage_index];

                    for (trajectory_index in stage['trajectory']) {
                        let entry = stage['trajectory'][trajectory_index];
                        linestring['geometry']['coordinates'].push([entry['longitude'] - 360, entry['latitude']]);
                    }
                }

                resolve(linestring);
            }
        });
    })
}

async function getPredictGeoJSON(api_url, launch_locations_layer, launch_datetime, ascent_rate, burst_altitude, sea_level_descent_rate) {
    let predicts_geojson = {type: 'FeatureCollection', features: []};

    for (launch_location_index in launch_locations_layer) {
        let launch_location_name = launch_locations_layer[launch_location_index].feature.properties['name'];
        let launch_location = launch_locations_layer[launch_location_index].getLatLng();
        let launch_longitude = launch_location['lng'];
        let launch_latitude = launch_location['lat'];
        let launch_altitude = launch_location['alt'];

        if (launch_longitude < 0) {
            launch_longitude = launch_longitude + 360;
        }

        let query_parameters = {
            launch_latitude: launch_latitude,
            launch_longitude: launch_longitude,
            launch_altitude: launch_altitude,
            launch_datetime: launch_datetime,
            ascent_rate: ascent_rate,
            burst_altitude: burst_altitude,
            descent_rate: sea_level_descent_rate
        };

        await getPredictLineString(api_url, launch_location_name, query_parameters).then(function (linestring) {
            predicts_geojson['features'].push(linestring);
        }).catch(function (response, status, error) {
                console.log('Prediction error: ' + status + ' ' + error);
            }
        )
    }

    return predicts_geojson;
}

function removePredictLayers() {
    for (layer_name in predicts_overlay_layers['predict']) {
        let layer = predicts_overlay_layers['predict'][layer_name];
        predicts_map.removeLayer(layer);
        predicts_map_layer_control.removeLayer(layer);
    }
}

async function changePredictLayers() {
    // let api_url = 'https://predict.lukerenegar.com/api/v1.1/';
    let api_url = 'http://predict.cusf.co.uk/api/v1/';

    let launch_locations_layer = predicts_overlay_layers['reference']['Launch Locations'].getLayers();
    let launch_datetime = document.getElementById('launch_date_textbox').value + 'T' +
        document.getElementById('launch_time_textbox').value + ':00Z';
    let ascent_rate = document.getElementById('ascent_rate_textbox').value;
    let burst_altitude = document.getElementById('burst_altitude_textbox').value;
    let sea_level_descent_rate = document.getElementById('sea_level_descent_rate_textbox').value;

    removePredictLayers();

    let predicts_geojson = await getPredictGeoJSON(api_url, launch_locations_layer, launch_datetime, ascent_rate, burst_altitude, sea_level_descent_rate);
    let geojson_layer = L.geoJSON(predicts_geojson, {onEachFeature: popupProperties});
    predicts_overlay_layers['predict'][launch_datetime] = geojson_layer;
    geojson_layer.addTo(predicts_map);
    predicts_map_layer_control.addOverlay(geojson_layer, launch_datetime, 'predict');
}

let predicts_map_layer_control = L.control.groupedLayers(base_layers, predicts_overlay_layers);

var predicts_map = L.map('predicts_map', {layers: [base_layers['OSM Road'], predicts_overlay_layers['reference']['Controlled Airspace']]}).setView([39.656674, -77.934194], 9);
predicts_map_layer_control.addTo(predicts_map);
