let MAP_TITLE = '<strong>UMDBPP Balloon Flights</strong>';

let FLIGHTS = L.geoJson.ajax(DATA_DIR + 'flights.geojson', {
    'onEachFeature': highlightAndPopupOnClick,
    'style': function (feature) {
        return {'color': '#1B1464', 'weight': 5};
    }
});

OVERLAY_LAYERS['reference']['McDonald\'s Locations'] = MCDONALDS_LOCATIONS_LAYER;
OVERLAY_LAYERS['reference']['Launch Locations'] = LAUNCH_LOCATIONS_LAYER;
OVERLAY_LAYERS['flights'] = {'flights': FLIGHTS};

let LAYER_CONTROL = L.control.groupedLayers(BASE_LAYERS, OVERLAY_LAYERS);

let TITLE_CONTROL = L.control({
    position: 'topleft'
});

TITLE_CONTROL.onAdd = function (map) {
    let div = document.createElement('div');
    div.setAttribute('style', 'background-color: white; padding: 2px;');
    div.innerHTML = MAP_TITLE;
    return div;
};

MAP.addControl(LAYER_CONTROL);
MAP.addControl(TITLE_CONTROL);

MAP.setView([39.7035, -77.3292], 9.5);

MAP.addLayer(LAUNCH_LOCATIONS_LAYER);
MAP.addLayer(FLIGHTS);
