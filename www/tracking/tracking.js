let aprs_fi_api_key = '117248.ldu4GclLLEul1';

// retrieve a single predict from the given API and convert to a GeoJSON Feature (LineString)
function getAPRSPoint(station_callsign) {
    let api_url = 'https://api.aprs.fi/api/get';

    return new Promise(function (resolve, reject) {
        $.ajax({
            url: api_url,
            data: {
                name: station_callsign,
                what: 'loc',
                apikey: aprs_fi_api_key,
                format: 'json'
            },
            type: 'GET',
            dataType: 'json',
            complete: function () {
                console.log(this.url);
            },
            success: function (response) {
                let response_entries = response['entries'][0];

                let output_feature = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [response_entries['lng'], response_entries['lat']]
                    },
                    properties: response_entries
                };

                resolve(output_feature);
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
                console.log('APRS API error: ' + response.status + ' ' + response.error);
            }
        )
    }

    return features_geojson;
}

async function addAPRSLayers() {
    let flight_aprs_geojson = await getAPRSGeoJSON(callsigns['flight']);
    let ground_aprs_geojson = await getAPRSGeoJSON(callsigns['flight']);

    let flight_aprs_layer = L.geoJSON(flight_aprs_geojson, {
        onEachFeature: popupProperties
    });
    let ground_aprs_layer = L.geoJSON(ground_aprs_geojson, {
        onEachFeature: popupProperties
    });

    overlay_layers['flight'] = {};
    overlay_layers['ground'] = {};

    overlay_layers['flight']['balloon'] = flight_aprs_layer;
    overlay_layers['ground']['vans'] = ground_aprs_layer;

    layer_control.addOverlay(flight_aprs_layer, 'balloon', 'flight');
    layer_control.addOverlay(ground_aprs_layer, 'vans', 'ground');

    flight_aprs_layer.addTo(map);
    ground_aprs_layer.addTo(map);
}

// dictionary to contain toggleable layers
let overlay_layers = {};

// add Leaflet map to "map" div with grouped layer control
let map = L.map('map', {layers: [base_layers['OSM Road']]}).setView([39.656674, -77.934194], 9);
let layer_control = L.control.groupedLayers(base_layers, overlay_layers);
layer_control.addTo(map);

let callsigns = {
    flight: ['W3EAX-8', 'W3EAX-9'],
    ground: ['W3EAX-10', 'W3EAX-12', 'W3EAX-13', 'W3EAX-14']
};

addAPRSLayers();