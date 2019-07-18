let COLOR_RAMP = chroma.scale('Spectral').mode('lab');

let COLOR_VALUE_MIN = dateToTimestamp('2014-11-08');
let COLOR_VALUE_MAX = dateToTimestamp(new Date().toDateString());

function spectral_color_ramp(value, min, max) {
    return COLOR_RAMP((value - min) / (max - min));
}

function dateToTimestamp(date) {
    return parseInt((new Date(date).getTime() / 1000).toFixed(0));
}

let FLIGHTS = L.geoJson.ajax(DATA_DIRECTORY + 'flights.geojson', {
    'onEachFeature': highlightAndPopupOnClick,
    'style': function (feature) {
        if (feature.feature != null) {
            feature = feature.feature;
        }

        return {
            'color': spectral_color_ramp(dateToTimestamp(feature.properties['Date']), COLOR_VALUE_MIN, COLOR_VALUE_MAX),
            'weight': 5
        };
    }
});
MAP.addLayer(FLIGHTS);

OVERLAY_LAYERS['reference']['McDonald\'s Locations'] = MCDONALDS_LOCATIONS_LAYER;
OVERLAY_LAYERS['reference']['Launch Locations'] = LAUNCH_LOCATIONS_LAYER;
OVERLAY_LAYERS['flights'] = {'flights': FLIGHTS};

let LAYER_CONTROL = L.control.groupedLayers(BASE_LAYERS, OVERLAY_LAYERS);
MAP.addControl(LAYER_CONTROL);

