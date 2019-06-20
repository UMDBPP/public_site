let map_title = '<strong>CUSF Balloon Predictions</strong>';

let global_run_id = 0;

let API_URLS = {
    'CUSF': 'http://predict.cusf.co.uk/api/v1/',
    'lukerenegar': 'https://predict.lukerenegar.com/api/v1.1/'
};

overlay_layers['reference']['McDonald\'s Locations'] = mcdonalds_locations;
overlay_layers['reference']['Launch Locations'] = launch_locations;
overlay_layers['predicts'] = {};

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

/* add date picker to input box */
let date_picker = $('#launch_date_textbox');
date_picker.datepicker({
    'beforeShow': function () {
        setTimeout(function () {
            $('.ui-datepicker').css('z-index', 99999999999999);
        }, 0);
    },
    'minDate': 0,
    'maxDate': +8,
    'showOtherMonths': true,
    'selectOtherMonths': true,
    'dateFormat': 'yy-mm-dd'
});

window.onload = function () {
    let today = new Date();
    let days_to_next_saturday = (1 + 5 - today.getDay()) % 7;
    if (days_to_next_saturday == 0) {
        days_to_next_saturday = 7;
    }
    date_picker.datepicker('setDate', 'today +' + days_to_next_saturday);

    updatePredictLayers();
};

/* retrieve a single predict from the given API and convert to a GeoJSON Feature (LineString) */
function getPredictLineString(api_url, name, longitude, latitude, datetime_utc, ascent_rate, burst_altitude, sea_level_descent_rate) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            'url': api_url,
            'data': {
                'launch_longitude': longitude,
                'launch_latitude': latitude,
                'launch_datetime': datetime_utc,
                'ascent_rate': ascent_rate,
                'burst_altitude': burst_altitude,
                'descent_rate': sea_level_descent_rate
            },
            'type': 'GET',
            'dataType': 'json',
            'error': function (response, status, error) {
                reject(response);
            },
            'success': function (response) {
                let output_feature = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'LineString',
                        'coordinates': []
                    },
                    'properties': {
                        'name': name,
                        'model_run': response['request']['dataset'] + ' UTC'
                    }
                };

                for (let stage of response['prediction']) {
                    for (let entry of stage['trajectory']) {
                        output_feature['geometry']['coordinates'].push([entry['longitude'] - 360, entry['latitude'], entry['altitude']]);
                    }
                }

                resolve(output_feature);
            }
        });
    });
}

/* retrieve predict for a single launch location as a GeoJSON FeatureCollection */
async function getPredictLayer(api_url, launch_location_name, launch_longitude, launch_latitude, launch_datetime, ascent_rate, burst_altitude, sea_level_descent_rate) {
    let predict_geojson = {'type': 'FeatureCollection', 'features': []};

    /* CUSF API requires longitude in 0-360 format */
    if (launch_longitude < 0) {
        launch_longitude = launch_longitude + 360;
    }

    await getPredictLineString(api_url, launch_location_name, launch_longitude, launch_latitude, launch_datetime, ascent_rate, burst_altitude, sea_level_descent_rate).then(function (feature) {
        predict_geojson['features'].push(feature);
    }).catch(function (response) {
            console.log('Prediction error: ' + response.status + ' ' + response.error);
        }
    );

    return L.geoJSON(predict_geojson, {
        'onEachFeature': highlightAndPopupOnClick,
        'style': function (feature) {
            return {'color': '#1B1464', 'weight': 5};
        },
        'attribution': 'Prediction - ' + api_url
    });
}


/* remove all predict layers from the map */
function removePredictLayers() {
    for (let layer_group in overlay_layers) {
        if (layer_group == 'predicts') {
            for (let layer_name in overlay_layers[layer_group]) {
                layer_control.removeLayer(overlay_layers[layer_group][layer_name]);
                map.removeLayer(overlay_layers[layer_group][layer_name]);
                delete overlay_layers[layer_group][layer_name];
            }
        }
    }
}

/* deselect all predict layers from the map, but keep them in the layer control */
function hidePredictLayers() {
    for (let layer_group in overlay_layers) {
        if (layer_group == 'predicts') {
            for (let layer_name in overlay_layers[layer_group]) {
                map.removeLayer(overlay_layers[layer_group][layer_name]);
            }
        }
    }
}

/* refresh map with new predicts using given parameters */
async function updatePredictLayers(resize = true) {
    let run_id = ++global_run_id;
    let utc_offset_minutes = (new Date()).getTimezoneOffset();

    let api_url = API_URLS['CUSF'];

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
    // let launch_datetime_local = document.getElementById('launch_date_textbox').value + 'T' +
    //     document.getElementById('launch_time_hour_box').value + ':' + document.getElementById('launch_time_minute_box').value + ':00Z';
    let ascent_rate = document.getElementById('ascent_rate_textbox').value;
    let burst_altitude = document.getElementById('burst_altitude_textbox').value;
    let sea_level_descent_rate = document.getElementById('sea_level_descent_rate_textbox').value;

    let active_predict_layers = layer_control.getActiveOverlayLayers()['predicts'];

    removePredictLayers();

    let predict_layers = {};

    for (let launch_location_feature of launch_locations_features) {
        let launch_location_name = launch_location_feature.feature.properties['name'];
        let launch_location = launch_location_feature.getLatLng();

        predict_layers[launch_location_name] = await getPredictLayer(api_url, launch_location_name, launch_location['lng'], launch_location['lat'], launch_datetime_utc, ascent_rate, burst_altitude, sea_level_descent_rate);
    }

    /* check if user has changed options in the meantime */
    if (run_id == global_run_id) {
        let layer_index = 1;

        for (let launch_location_name in predict_layers) {
            let predict_layer = predict_layers[launch_location_name];

            overlay_layers['predicts'][launch_location_name] = predict_layer;
            layer_control.addOverlay(predict_layer, launch_location_name, 'predicts');

            if (active_predict_layers != null) {
                /* add predict layers to map if they were already selected previously */
                if (active_predict_layers[launch_location_name] != null) {
                    map.addLayer(predict_layer);
                }
            } else {
                /* if no layers were selected previously, add the first few layers */
                if (layer_index <= 5) {
                    map.addLayer(predict_layer);
                }

                layer_index++;
            }

            if (selected_feature != null) {
                for (let feature of predict_layer._layers) {
                    if (JSON.stringify(feature.feature.properties) === JSON.stringify(selected_feature.feature.properties)) {
                        selected_feature = feature;
                        selected_feature_original_style = highlightFeature(selected_feature);
                    }
                }
            }
        }
    }

    if (resize) {
        resizeToOverlayLayers();
    }
}

function downloadPredictsKML() {
    if (Object.keys(overlay_layers['predicts']).length > 0) {
        for (let predict_layer_index in overlay_layers['predicts']) {
            let predict_geojson = overlay_layers['predicts'][predict_layer_index].toGeoJSON();

            if (predict_geojson['features'].length > 0) {
                let output_kml = tokml(predict_geojson);

                output_kml = output_kml.replace(/<LineString>/g, '<LineString><extrude>1</extrude><tesselate>1</tesselate><altitudeMode>absolute</altitudeMode>');

                let download_filename = 'predicts_' + predict_layer_index.replace(/-|_|:|Z|T/g, '') + '.kml';
                let download_link = document.createElement('a');
                let xml_blob = new Blob([output_kml], {'type': 'text/xml'});

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
    let download_link = document.createElement('a');
    download_link.download = name;
    download_link.href = uri;
    download_link.click();
}
