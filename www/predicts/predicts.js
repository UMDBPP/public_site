let global_run_id = 0;

// asynchronously load polygons of controlled airspace from GeoJSON file
let controlled_airspace = L.geoJson.ajax('../data/controlled_airspace.geojson', {
    onEachFeature: popupProperties,
    style: function (feature) {
        let local_type = feature.properties['LOCAL_TYPE'];

        switch (local_type) {
            case 'R':
                return {color: '#EA2027'};
            case 'CLASS_B':
                return {color: '#0652DD'};
            case 'CLASS_C':
                return {color: '#6F1E51'};
            case 'CLASS_D':
                return {color: '#0652DD', dashArray: '4'};
            default:
                return {color: '#6F1E51', dashArray: '4'};
        }
    }
});

// asynchronously load polygons of uncontrolled airspace from GeoJSON file
let uncontrolled_airspace = L.geoJson.ajax('../data/uncontrolled_airspace.geojson', {
    onEachFeature: popupProperties,
    style: function (feature) {
        return {color: '#6F1E51', dashArray: '4'};
    }
});

// asynchronously load McDonald's locations from GeoJSON file
let mcdonalds_locations = L.geoJson.ajax('../data/mcdonalds.geojson', {
    onEachFeature: popupProperties,
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
            radius: 4,
            fillColor: '#EE5A24',
            color: '#000000',
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
function getPredictLineString(api_url, launch_location_name, launch_latitude, launch_longitude, launch_altitude, launch_datetime_utc, ascent_rate, burst_altitude, sea_level_descent_rate) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: api_url,
            data: {
                launch_latitude: launch_latitude,
                launch_longitude: launch_longitude,
                launch_altitude: launch_altitude,
                launch_datetime: launch_datetime_utc,
                ascent_rate: ascent_rate,
                burst_altitude: burst_altitude,
                descent_rate: sea_level_descent_rate
            },
            type: 'GET',
            dataType: 'json',
            error: function (response, status, error) {
                reject(response);
            },
            success: function (response) {
                let output_feature = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    },
                    properties: {
                        name: launch_location_name,
                        launch_datetime: launch_datetime_utc + ' UTC',
                        launch_longitude: launch_longitude - 360,
                        launch_latitude: launch_latitude,
                        launch_altitude: launch_altitude,
                        dataset: response['request']['dataset'] + ' UTC'
                    }
                };

                for (stage_index in response['prediction']) {
                    let stage = response['prediction'][stage_index];

                    for (trajectory_index in stage['trajectory']) {
                        let entry = stage['trajectory'][trajectory_index];
                        output_feature['geometry']['coordinates'].push([entry['longitude'] - 360, entry['latitude'], entry['altitude']]);
                    }
                }

                resolve(output_feature);
            }
        });
    });
}

// retrieve predicts for every launch location, and put them into a GeoJSON FeatureCollection
async function getPredictGeoJSON(api_url, launch_locations_layer, launch_datetime, ascent_rate, burst_altitude, sea_level_descent_rate) {
    let features_geojson = {type: 'FeatureCollection', features: []};

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
            features_geojson['features'].push(feature);
        }).catch(function (response) {
                console.log('Prediction error: ' + response.status + ' ' + response.error);
            }
        )
    }

    return features_geojson;
}

// remove all predict layers from the map
function removePredictLayers() {
    for (layer_group in overlay_layers) {
        if (layer_group == 'predicts') {
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
    let run_id = ++global_run_id;
    let utc_offset_minutes = (new Date()).getTimezoneOffset();

    let cusf_api_url = 'http://predict.cusf.co.uk/api/v1/';
    let lukerenegar_api_url = 'https://predict.lukerenegar.com/api/v1.1/';

    let launch_locations_features = launch_locations.getLayers();

    let hour = (parseInt(document.getElementById('launch_time_hour_box').value) + (utc_offset_minutes / 60));
    if (hour < 10) {
        hour = '0' + hour
    }

    let minute = (parseInt(document.getElementById('launch_time_minute_box').value) + (utc_offset_minutes % 60));
    if (minute < 10) {
        minute = '0' + minute
    }

    let launch_datetime_utc = document.getElementById('launch_date_textbox').value + 'T' + hour + ':' + minute + ':00Z';
    let launch_datetime_local = document.getElementById('launch_date_textbox').value + 'T' +
        document.getElementById('launch_time_hour_box').value + ':' + document.getElementById('launch_time_minute_box').value + ':00Z';
    let ascent_rate = document.getElementById('ascent_rate_textbox').value;
    let burst_altitude = document.getElementById('burst_altitude_textbox').value;
    let sea_level_descent_rate = document.getElementById('sea_level_descent_rate_textbox').value;

    removePredictLayers();

    let cusf_predicts_geojson = await getPredictGeoJSON(cusf_api_url, launch_locations_features, launch_datetime_utc, ascent_rate, burst_altitude, sea_level_descent_rate);
    let cusf_predicts_layer = L.geoJSON(cusf_predicts_geojson, {
        onEachFeature: popupProperties,
        style: function (feature) {
            return {color: '#1B1464', weight: 5};
        }
    });

    // let lukerenegar_predicts_geojson = await getPredictGeoJSON(lukerenegar_api_url, launch_locations_features, launch_datetime_utc, ascent_rate, burst_altitude, sea_level_descent_rate);
    // let lukerenegar_predicts_layer = L.geoJSON(lukerenegar_predicts_geojson, {
    //     onEachFeature: popupProperties,
    //     style: {color: 'red'}
    // });

    // check if user has changed options since
    if (run_id == global_run_id) {
        overlay_layers['predicts'][launch_datetime_local] = cusf_predicts_layer;
        layer_control.addOverlay(cusf_predicts_layer, launch_datetime_local, 'predicts');

        // overlay_layers['predicts'][launch_datetime_local + '_lukerenegar'] = lukerenegar_predicts_layer;
        // layer_control.addOverlay(lukerenegar_predicts_layer, launch_datetime_local + '_lukerenegar', 'predicts');

        cusf_predicts_layer.addTo(map);
        map.fitBounds(cusf_predicts_layer.getBounds());
    }
}

function downloadPredictsKML() {
    if (Object.keys(overlay_layers['predicts']).length > 0) {
        for (predict_layer_index in overlay_layers['predicts']) {
            let predict_geojson = overlay_layers['predicts'][predict_layer_index].toGeoJSON();

            if (predict_geojson['features'].length > 0) {
                let output_kml = tokml(predict_geojson);

                output_kml = output_kml.replace(/<LineString>/g, '<LineString><extrude>1</extrude><tesselate>1</tesselate><altitudeMode>absolute</altitudeMode>');

                let download_filename = 'predicts_' + predict_layer_index.replace(/-|_|:|Z|T/g, '') + '.kml';
                let download_link = document.createElement('a');
                let xml_blob = new Blob([output_kml], {type: 'text/xml'});

                download_link.setAttribute('href', window.URL.createObjectURL(xml_blob));
                download_link.setAttribute('download', download_filename);

                download_link.click();
            } else {
                alert('Predicts have not loaded yet.');
            }
        }
    } else {
        alert('No predicts.');
    }
}

function downloadURI(uri, name) {
    var download_link = document.createElement('a');
    download_link.download = name;
    download_link.href = uri;
    download_link.click();
}

// dictionary to contain toggleable layers
let overlay_layers = {
    'reference': {
        'Controlled Airspace': controlled_airspace,
        'Uncontrolled Airspace': uncontrolled_airspace,
        'McDonald\'s Locations': mcdonalds_locations,
        'Launch Locations': launch_locations
    },
    'predicts': {}
};

// add Leaflet map to 'map' div with grouped layer control
let map = L.map('map', {layers: [base_layers['OSM Road'], controlled_airspace]});
let layer_control = L.control.groupedLayers(base_layers, overlay_layers);
layer_control.addTo(map);

/* add date picker to input box */
$(function () {
    $('#launch_date_textbox').datepicker({
        beforeShow: function () {
            setTimeout(function () {
                $('.ui-datepicker').css('z-index', 99999999999999);
            }, 0);
        },
        minDate: +1,
        maxDate: +8,
        showOtherMonths: true,
        selectOtherMonths: true,
        dateFormat: 'yy-mm-dd'
    });
});

let today = new Date();
let days_to_next_saturday = (1 + 5 - today.getDay()) % 7;
if (days_to_next_saturday == 0) {
    days_to_next_saturday = 7;
}

window.onload = function () {
    $('#launch_date_textbox').datepicker('setDate', 'today +' + days_to_next_saturday);
    changePredictLayers();
};