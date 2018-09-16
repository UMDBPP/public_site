// asynchronously load polygons of controlled airspace from GeoJSON file
let controlled_airspace = L.geoJson.ajax('../data/controlled_airspace.geojson', {
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
});

// asynchronously load polygons of uncontrolled airspace from GeoJSON file
let uncontrolled_airspace = L.geoJson.ajax('../data/uncontrolled_airspace.geojson', {
    onEachFeature: popupProperties
});

// asynchronously load McDonald's locations from GeoJSON file
let mcdonalds_locations = L.geoJson.ajax('../data/mcdonalds.geojson', {
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
});

// asynchronously load launch locations from GeoJSON file
let launch_locations = L.geoJson.ajax('../data/launch_locations.geojson', {
    onEachFeature: popupProperties
});

// fit map to launch locations as soon as it loads
launch_locations.on('data:loaded', function () {
    map.fitBounds(launch_locations.getBounds());
}.bind(this));

// retrieve a single predict from the given API and convert to a GeoJSON Feature (LineString)
function getPredictLineString(api_url, launch_location_name, launch_latitude, launch_longitude, launch_altitude, launch_datetime, ascent_rate, burst_altitude, sea_level_descent_rate) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            data: {
                launch_latitude: launch_latitude,
                launch_longitude: launch_longitude,
                launch_altitude: launch_altitude,
                launch_datetime: launch_datetime,
                ascent_rate: ascent_rate,
                burst_altitude: burst_altitude,
                descent_rate: sea_level_descent_rate
            },
            url: api_url,
            type: 'GET',
            dataType: 'json',
            aync: false,
            error: function (response, status, error) {
                reject(response);
            },
            success: function (response) {
                let intersects_controlled_airspace = false;

                let output_feature = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    },
                    properties: {
                        name: launch_location_name,
                        launch_datetime: launch_datetime,
                        launch_longitude: launch_longitude - 360,
                        launch_latitude: launch_latitude,
                        launch_altitude: launch_altitude
                    }
                };

                for (stage_index in response['prediction']) {
                    let stage = response['prediction'][stage_index];

                    for (trajectory_index in stage['trajectory']) {
                        let entry = stage['trajectory'][trajectory_index];
                        output_feature['geometry']['coordinates'].push([entry['longitude'] - 360, entry['latitude'], entry['altitude']]);
                    }
                }

                output_feature['properties']['intersects_controlled_airspace'] = intersects_controlled_airspace;

                resolve(output_feature);
            }
        });
    });
}

// retrieve predicts for every launch location, and put them into a GeoJSON FeatureCollection
async function getPredictGeoJSON(api_url, launch_locations_layer, launch_datetime, ascent_rate, burst_altitude, sea_level_descent_rate) {
    let predicts_geojson = {type: 'FeatureCollection', features: []};

    for (launch_location_index in launch_locations_layer) {
        let launch_location_name = launch_locations_layer[launch_location_index].feature.properties['name'];
        let launch_location = launch_locations_layer[launch_location_index].getLatLng();
        let launch_longitude = launch_location['lng'];
        let launch_latitude = launch_location['lat'];
        let launch_altitude = launch_location['alt'];

        // CUSF API requires longitude in 0-360 format
        if (launch_longitude < 0) {
            launch_longitude = launch_longitude + 360;
        }

        await getPredictLineString(api_url, launch_location_name, launch_latitude, launch_longitude, launch_altitude, launch_datetime, ascent_rate, burst_altitude, sea_level_descent_rate).then(function (feature) {
            predicts_geojson['features'].push(feature);
        }).catch(function (response) {
            console.log('Prediction error: ' + response.status + ' ' + response.error);
            }
        )
    }

    return predicts_geojson;
}

// remove all predict layers from the map
function removePredictLayers() {
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

// refresh map with new predicts using given parameters
async function changePredictLayers() {
    let cusf_api_url = 'http://predict.cusf.co.uk/api/v1/';
    let lukerenegar_api_url = 'https://predict.lukerenegar.com/api/v1.1/';

    let launch_locations_features = launch_locations.getLayers();
    let launch_datetime = document.getElementById('launch_date_textbox').value + 'T' +
        document.getElementById('launch_time_textbox').value + ':00Z';
    let ascent_rate = document.getElementById('ascent_rate_textbox').value;
    let burst_altitude = document.getElementById('burst_altitude_textbox').value;
    let sea_level_descent_rate = document.getElementById('sea_level_descent_rate_textbox').value;

    removePredictLayers();

    let cusf_predicts_geojson = await getPredictGeoJSON(cusf_api_url, launch_locations_features, launch_datetime, ascent_rate, burst_altitude, sea_level_descent_rate);
    let cusf_predicts_layer = L.geoJSON(cusf_predicts_geojson, {
        onEachFeature: popupProperties
    });
    overlay_layers['CUSF'][launch_datetime] = cusf_predicts_layer;
    layer_control.addOverlay(cusf_predicts_layer, launch_datetime, 'CUSF');

    // if (!overlay_layers['Luke Renegar']) {
    //     overlay_layers['Luke Renegar'] = {};
    // }
    // let lukerenegar_predicts_geojson = await getPredictGeoJSON(lukerenegar_api_url, launch_locations_features, launch_datetime, ascent_rate, burst_altitude, sea_level_descent_rate);
    // let lukerenegar_predicts_layer = L.geoJSON(lukerenegar_predicts_geojson, {
    //     onEachFeature: popupProperties,
    //     style: {color: 'red'}
    // });
    // overlay_layers['Luke Renegar'][launch_datetime] = lukerenegar_predicts_layer;
    // layer_control.addOverlay(lukerenegar_predicts_layer, launch_datetime, 'Luke Renegar');

    cusf_predicts_layer.addTo(map);
    map.fitBounds(cusf_predicts_layer.getBounds());
}

// dictionary to contain toggleable layers
let overlay_layers = {
    'reference': {
        'Controlled Airspace': controlled_airspace,
        'Uncontrolled Airspace': uncontrolled_airspace,
        'McDonald\'s Locations': mcdonalds_locations,
        'Launch Locations': launch_locations
    },
    'CUSF': {}
};

// add Leaflet map to "map" div with grouped layer control
let map = L.map('map', {layers: [base_layers['OSM Road'], controlled_airspace]});
let layer_control = L.control.groupedLayers(base_layers, overlay_layers);
layer_control.addTo(map);
