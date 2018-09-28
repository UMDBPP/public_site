let base_layers = {
    'OSM Road': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }),
    'ESRI Imagery': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    })
};

// asynchronously load polygons of controlled airspace from GeoJSON file
let controlled_airspace = L.geoJson.ajax('../data/controlled_airspace.geojson', {
    onEachFeature: popupProperties,
    style: function (feature) {
        let local_type = feature.properties['LOCAL_TYPE'];

        switch (local_type) {
            case 'R':
                return {color: "red"};
            case 'CLASS_B':
                return {color: "orange"};
            case 'CLASS_C':
                return {color: "yellow"};
            case 'CLASS_D':
                return {color: "purple"};
            default:
                return {color: "green"};
        }
    }
});

// asynchronously load polygons of uncontrolled airspace from GeoJSON file
let uncontrolled_airspace = L.geoJson.ajax('../data/uncontrolled_airspace.geojson', {
    onEachFeature: popupProperties
});

function popupProperties(feature, layer) {
    layer.bindPopup('<pre>' + JSON.stringify(feature.properties, null, ' ').replace(/[\{\}"]/g, '') + '</pre>');
}