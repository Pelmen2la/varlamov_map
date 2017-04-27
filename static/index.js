(App = new function() {
    var me = this,
        features = postsData.map(function(post) {
            var location = post.location,
                lon = location ? location.lng : 0,
                lat = location ? location.lat : 0,
                geometry = new ol.geom.Point(ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857')),
                feature = new ol.Feature({
                    geometry: geometry
                });
            feature.data = post;
            return feature;
        }),

        source = new ol.source.Vector({
            features: features
        }),

        clusterSource = new ol.source.Cluster({
            distance: 40,
            source: source
        }),

        imageHeight = 140,
        imageWidth = 159,

        getFeatureStyle = function(feature, isActive) {
            var features = feature.get('features'),
                fistFeatureData = features[0].data;
            return new ol.style.Style({
                image: new ol.style.Icon({
                    src: '/static/images/icons/logo.png',
                    scale: 0.5,
                    opacity: isActive ? 1 : 0.7
                }),
                text: new ol.style.Text({
                    text: features.length === 1 ? (fistFeatureData.cityName || fistFeatureData.countryName) : features.length.toString(),
                    offsetY: imageHeight / 4 + 20,
                    scale: 3,
                    fill: 'white'
                })
            })
        },

        clusters = new ol.layer.Vector({
            source: clusterSource,
            strategy: ol.loadingstrategy.bbox,
            style: function(feature) {
                return getFeatureStyle(feature, false);
            }
        }),

        raster = new ol.layer.Tile({
            source: new ol.source.OSM()
        });

    me.map = new ol.Map({
        layers: [raster, clusters],
        target: 'Map',
        view: new ol.View({
            center: [53, 60],
            zoom: 4
        })
    });

    var featuresToCleanStyle = [];
    me.map.on('pointermove', function(evt) {
        var hit = this.forEachFeatureAtPixel(evt.pixel, function(feature) {
            feature.setStyle(getFeatureStyle(feature, true));
            featuresToCleanStyle.push(feature);
            return true;
        });
        if(hit) {
            this.getTargetElement().style.cursor = 'pointer';
        } else {
            if(featuresToCleanStyle.length) {
                featuresToCleanStyle.forEach(function(feature) {
                    feature.setStyle(getFeatureStyle(feature, false));
                });
                featuresToCleanStyle = [];
            }
            this.getTargetElement().style.cursor = '';
        }
    });

    var featuresToCleanStyle = [];
    me.map.on('click', function(evt) {
        var features = [];
        this.forEachFeatureAtPixel(evt.pixel, function(feature) {
            features = features.concat(feature.get('features'));
        });
        showFeaturesPopup(features);
    });

    me.popupWrapper = document.getElementById('PopupWrapper');
    me.popupWrapper.addEventListener('click', function(e) {
        if(e.target.className === 'mask') {
            setPopupVisibility(false);
        }
    });

    function showFeaturesPopup(features) {
        var content = me.popupWrapper.querySelector('.content'),
            itemsHtml = '';
        if(!features.length) {
            return;
        };
        features.forEach(function(f) {
            var data = f.data;
            itemsHtml += '<a href=' + data.url + ' target="blank">' +
                data.subject +
            '</a>';
        });

        content.innerHTML = itemsHtml;
        setPopupVisibility(true);
    }
    function setPopupVisibility(isVisible) {
        me.popupWrapper.style.visibility = isVisible ? 'visible' : 'hidden';
    }
}());
