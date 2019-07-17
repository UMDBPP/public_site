let map_title = '<strong>UMDBPP Balloon Flights</strong>';

let flights = L.geoJson.ajax(DATA_DIR + 'flights.geojson', {
    'onEachFeature': highlightAndPopupOnClick,
    'style': function (feature) {
        return {'color': '#1B1464', 'weight': 5};
    }
});

OVERLAY_LAYERS['reference']['McDonald\'s Locations'] = MCDONALDS_LOCATIONS_LAYER;
OVERLAY_LAYERS['reference']['Launch Locations'] = LAUNCH_LOCATIONS_LAYER;
OVERLAY_LAYERS['flights'] = {'flights': flights};

// for (let flight in flights.getLayers()) {
//
// }

let layer_control = L.control.groupedLayers(BASE_LAYERS, OVERLAY_LAYERS);

let title_control = L.control({
    position: 'topleft'
});

title_control.onAdd = function (map) {
    let div = document.createElement('div');
    div.setAttribute('style', 'background-color: white; padding: 2px;');
    div.innerHTML = map_title;
    return div;
};

MAP.addControl(layer_control);
MAP.addControl(title_control);

MAP.setView([39.7035, -77.3292], 9.5);

MAP.addLayer(LAUNCH_LOCATIONS_LAYER);
MAP.addLayer(flights);
