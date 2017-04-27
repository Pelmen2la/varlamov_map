var liveJournal = require('livejournal'),
    mongoose = require('mongoose'),
    request = require('request'),
    geocoder = require('geocoder'),
    fs = require('fs'),
    fastCsv = require('fast-csv'),
    Post = mongoose.model('post'),
    Country = mongoose.model('country'),
    City = mongoose.model('city');

function getPostsFromLivejournal(beforedate) {
    liveJournal.xmlrpc.getevents({
        journal: 'zyalt',
        auth_method: 'noauth',
        selecttype: 'lastn',
        howmany: 50,
        beforedate: beforedate
    }, function(err, val) {
        var posts = val ? val['events'] : [];
        posts.forEach(function(post) {
            Post.findOne({itemid: post.itemid}, function(err, data) {
                if(data) {
                    return;
                };
                var tags = post.props.taglist ? post.props.taglist.toLocaleLowerCase().split(',') : [],
                    findCondition = {nameLower: {$in: tags}};
                if(tags.length) {
                    Country.findOne(findCondition).exec(function(err, country) {
                        City.findOne(findCondition, function(err, city) {
                            if(city || country) {
                                post.cityName = city ? city.get('name') : '';
                                post.countryName = country ? country.get('name') : '';
                                if(city && !country) {
                                    Country.findOne({id: city.get('countryId')}, function(err, data) {
                                        post.countryName = data.get('name');
                                        (new Post(post)).save();
                                    });
                                } else {
                                    (new Post(post)).save();
                                }
                            }
                        });
                    });
                }
            });
        });
        if(posts.length) {
            getPostsFromLivejournal(posts[posts.length - 1].eventtime);
        } else {
            return;
        }
    });
};

function setPostsLocation(callback) {
    var locationCache = {};
    Post.find({}, function(err, data) {
        data.forEach(function(post) {
            var city = post.get('cityName'),
                address = post.get('countryName') + (city ? (' ' + city) : ''),
                setPostLocation = function(post, location) {
                    post.set('location', location);
                    post.save();
                };
            if(!post.get('location') || !post.get('location').lat || !post.get('location').lng) {
                if(locationCache[address]) {
                    setPostLocation(post, locationCache[address]);
                } else {
                    geocoder.geocode(address, function(err, data) {
                        var location = data && !data.error_message && data.results.length && data.results[0].geometry.location;
                        if(location) {
                            setPostLocation(post, location);
                            locationCache[address] = location;
                        }
                    });
                }
            }
        });
        callback();
    })
};

function generateCountriesAndCitiesFromCsv(callback) {
    var countriesCash = {};
    Country.remove({}, function() {
        City.remove({}, function() {
            fs.createReadStream(global.appRoot + '/server/data/countries.csv')
                .pipe(fastCsv())
                .on("data", function(data) {
                    var countryId = parseInt(data[0]),
                        countryName = data[2].replace(/"/g, '');
                    if(!isNaN(countryId)) {
                        (new Country({
                            id: countryId,
                            name: countryName,
                            nameLower: countryName.toLowerCase()
                        })).save();
                        countriesCash[countryId] = countryName;
                    }
                })
                .on("end", function() {
                    fs.createReadStream(global.appRoot + '/server/data/cities.csv')
                        .pipe(fastCsv())
                        .on("data", function(data) {
                            var countryId = parseInt(data[1]),
                                countryName = countriesCash[countryId],
                                cityId = parseInt(data[0]),
                                cityName = data[3].replace(/"/g, '');
                            if(!isNaN(cityId)) {
                                (new City({
                                    countryId: countryId,
                                    countryName: countryName,
                                    countryNameLower: countryName.toLocaleLowerCase(),
                                    id: cityId,
                                    name: cityName,
                                    nameLower: cityName.toLowerCase()
                                })).save();
                            }
                            ;
                        })
                        .on("end", function() {
                            callback();
                        });
                });
        });
    });
};

function getAddressLocation(address, callback) {
    request({
            method: 'GET',
            uri: 'http://maps.google.com/maps/api/geocode/json?address=' + address
        },
        function(err, response, body) {
            var data = JSON.parse(body).results[0];
            callback(!err && data ? data.geometry.location : {});
        }
    );
};


module.exports = {
    getPostsFromLivejournal: getPostsFromLivejournal,
    setPostsLocation: setPostsLocation,
    generateCountriesAndCitiesFromCsv: generateCountriesAndCitiesFromCsv
};