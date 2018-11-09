let selected_feature;
let selected_feature_style;

var base_layers = {
    'OSM Road': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }),
    'ESRI Imagery': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    })
};

function popupProperties(feature, layer) {
    layer.bindPopup('<pre>' + JSON.stringify(feature.properties, null, ' ').replace(/[\{\}"]/g, '') + '</pre>');

    layer.on('click', function (click_event) {
        if (selected_feature != null) {
            selected_feature.setStyle(selected_feature_style);
        }

        selected_feature = click_event.target;

        if (selected_feature.setStyle != null) {
            selected_feature_style = {color: selected_feature.options.color, weight: selected_feature.options.weight};
            selected_feature.setStyle({color: '#ffff02', weight: selected_feature_style.weight + 2});
        } else {
            selected_feature = null;
            selected_feature_style = null;
        }
    });
}