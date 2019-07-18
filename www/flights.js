let COLOR_RAMP = chroma.scale('Spectral').mode('lab');

let FLIGHT_NUMBER_RANGE = [45, 86];

function color(value, min, max) {
    return COLOR_RAMP((value - min) / (max - min));
}

let FLIGHTS = L.geoJson.ajax(DATA_DIRECTORY + 'flights.geojson', {
    'onEachFeature': highlightAndPopupOnClick,
    'style': function (feature) {
        if (feature.feature != null) {
            feature = feature.feature;
        }

        let flight_number = parseInt(feature.properties['Flight'].substring(2, 4));
        return {'color': color(flight_number, ...FLIGHT_NUMBER_RANGE), 'weight': 5};
    }
});
MAP.addLayer(FLIGHTS);

OVERLAY_LAYERS['reference']['McDonald\'s Locations'] = MCDONALDS_LOCATIONS_LAYER;
OVERLAY_LAYERS['reference']['Launch Locations'] = LAUNCH_LOCATIONS_LAYER;
OVERLAY_LAYERS['flights'] = {'flights': FLIGHTS};

let LAYER_CONTROL = L.control.groupedLayers(BASE_LAYERS, OVERLAY_LAYERS);
MAP.addControl(LAYER_CONTROL);

