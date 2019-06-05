let map_title = '<strong>UMDBPP Balloon Flights</strong>';

let flights = L.geoJson.ajax(data_dir + 'flights.geojson', {
    'onEachFeature': highlightAndPopupOnClick,
    'style': function (feature) {
        return {'color': '#1B1464', 'weight': 5};
    }
});

overlay_layers['reference']['McDonald\'s Locations'] = mcdonalds_locations;
overlay_layers['reference']['Launch Locations'] = launch_locations;
overlay_layers['flights'] = {'flights': flights};

// for (let flight in flights.getLayers()) {
//
// }

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

map.setView([39.7035, -77.3292], 9.5);

map.addLayer(launch_locations);
map.addLayer(flights);
