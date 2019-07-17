let FLIGHTS = L.geoJson.ajax(DATA_DIRECTORY + 'flights.geojson', {
    'onEachFeature': highlightAndPopupOnClick,
    'style': function (feature) {
        return {'color': '#1B1464', 'weight': 5};
    }
});

OVERLAY_LAYERS['reference']['McDonald\'s Locations'] = MCDONALDS_LOCATIONS_LAYER;
OVERLAY_LAYERS['reference']['Launch Locations'] = LAUNCH_LOCATIONS_LAYER;
OVERLAY_LAYERS['flights'] = {'flights': FLIGHTS};

let LAYER_CONTROL = L.control.groupedLayers(BASE_LAYERS, OVERLAY_LAYERS);

MAP.addControl(LAYER_CONTROL);

MAP.setView([39.7035, -77.3292], 9.5);

MAP.addLayer(LAUNCH_LOCATIONS_LAYER);
MAP.addLayer(FLIGHTS);
