let data_dir = '/data/';

let base_layers = {
    'OSM Road': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        'maxZoom': 19,
        'attribution': '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }),
    'ESRI Imagery': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        'attribution': 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    })
};

// asynchronously load polygons of controlled airspace from GeoJSON file
let controlled_airspace = L.geoJson.ajax(data_dir + 'controlled_airspace.geojson', {
    'onEachFeature': popupProperties,
    'style': function (feature) {
        let local_type = feature.properties['LOCAL_TYPE'];

        switch (local_type) {
            case 'R':
                return {'color': '#EA2027'};
            case 'CLASS_B':
                return {'color': '#0652DD'};
            case 'CLASS_C':
                return {'color': '#6F1E51'};
            case 'CLASS_D':
                return {'color': '#0652DD', 'dashArray': '4'};
            default:
                return {'color': '#6F1E51', 'dashArray': '4'};
        }
    }
});

// asynchronously load polygons of uncontrolled airspace from GeoJSON file
let uncontrolled_airspace = L.geoJson.ajax(data_dir + 'uncontrolled_airspace.geojson', {
    'onEachFeature': popupProperties,
    'style': function (feature) {
        return {'color': '#6F1E51', 'dashArray': '4'};
    }
});

// asynchronously load launch locations from GeoJSON file
let launch_locations = L.geoJson.ajax(data_dir + 'launch_locations.geojson', {
    'onEachFeature': popupProperties
});

// asynchronously load McDonald's locations from GeoJSON file
let mcdonalds_locations = L.geoJson.ajax(data_dir + 'mcdonalds.geojson', {
    'onEachFeature': popupProperties,
    'pointToLayer': function (feature, latlng) {
        return L.circleMarker(latlng, {
            'radius': 4,
            'fillColor': '#EE5A24',
            'color': '#000000',
            'weight': 1,
            'opacity': 1,
            'fillOpacity': 0.8
        });
    }
});
