let selected_feature;
let selected_feature_original_style;


function featurePropertiesHTML(feature) {
    return JSON.stringify(feature.properties, null, ' ').replace(/[\{\}"]/g, '')
}

function popupFeaturePropertiesOnClick(feature, layer) {
    layer.bindPopup('<pre>' + featurePropertiesHTML(feature) + '</pre>');
}

function highlightFeature(feature) {
    let original_style = feature.options.style;
    feature.setStyle({'color': '#12CBC4', 'weight': feature.options.weight + 3});
    feature.bringToFront();
    return original_style;
}

function highlightFeatureOnClick(feature, layer) {
    layer.on('click', function (click_event) {
        if (selected_feature != null) {
            selected_feature.setStyle(selected_feature_original_style(selected_feature));
        }

        selected_feature = click_event.target;

        if (selected_feature.setStyle != null) {
            selected_feature_original_style = highlightFeature(selected_feature);
        } else {
            selected_feature = null;
            selected_feature_original_style = null;
        }
    });
}

function highlightAndPopupOnClick(feature, layer) {
    highlightFeatureOnClick(feature, layer);
    popupFeaturePropertiesOnClick(feature, layer);
}

/* return the overall bounds of multiple layers */
function bounds(layers) {
    let northeast = layers[0].getBounds()._northEast;
    let southwest = layers[0].getBounds()._southWest;

    for (let layer of layers) {
        let bounds = layer.getBounds();
        if (bounds._northEast.lat > northeast.lat) {
            northeast.lat = bounds._northEast.lat;
        }
        if (bounds._northEast.lng > northeast.lng) {
            northeast.lng = bounds._northEast.lng;
        }
        if (bounds._southWest.lat < southwest.lat) {
            southwest.lat = bounds._southWest.lat;
        }
        if (bounds._southWest.lng < southwest.lng) {
            southwest.lng = bounds._southWest.lng;
        }
    }

    return L.latLngBounds([northeast.lat, northeast.lng], [southwest.lat, southwest.lng]);
}

L.Control.GroupedLayers.include({
    'getActiveOverlayLayers': function () {
        let active_layers = {};
        let layers = this._layers;
        let map = this._map;
        let layer_groups = this._groupList;

        for (let layer_group of layer_groups) {
            if (active_layers[layer_group] == null) {
                active_layers[layer_group] = {}
            }
        }

        for (let layer of layers) {
            if (layer.overlay && map.hasLayer(layer.layer)) {
                let layer_group = layer.group.name;

                if (active_layers[layer_group] == null) {
                    active_layers[layer_group] = {}
                }

                active_layers[layer_group][layer.name] = layer.layer;
            }
        }

        return active_layers;
    },
    'getOverlayLayers': function () {
        let overlay_layer_names = {};
        let layers = this._layers;

        layers.forEach(function (layer) {
            if (layer.overlay) {
                let layer_group = layer.group.name;

                if (!overlay_layer_names[layer_group]) {
                    overlay_layer_names[layer_group] = {}
                }

                overlay_layer_names[layer_group][layer.name] = layer.layer;
            }
        });

        return overlay_layer_names;
    }
});

async function resizeToOverlayLayers() {
    let active_overlay_layers = layer_control.getActiveOverlayLayers();

    let layers = [];

    for (let layer_group_name in active_overlay_layers) {
        if (layer_group_name != 'reference' && layer_group_name != '') {
            let layer_group = active_overlay_layers[layer_group_name];

            if (layer_group != null) {
                if (Object.keys(layer_group).length > 0) {
                    layers.push(...Object.values(layer_group));
                }
            }
        }
    }

    if (layers.length > 0) {
        map.fitBounds(bounds(layers), {'padding': [50, 50]});
    }
}

/* send reference layers to the back, to be overlapped by all other layers */
function sinkReferenceLayers(add_event) {
    if (add_event.overlay) {
        if (add_event.group.name == 'reference') {
            let added_layer = add_event.layer;
            added_layer.bringToBack();
        }
    }
}

let CLICK_LOCATION = {
    lng: null,
    lat: null
};

function mapClick(click_event) {
    CLICK_LOCATION['lng'] = click_event.latlng.lng;
    CLICK_LOCATION['lat'] = click_event.latlng.lat;
}