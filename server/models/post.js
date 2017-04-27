var mongoose = require('mongoose');

var Post = new mongoose.Schema({
    itemid: Number,
    eventtime: String,
    event_timestamp: Number,
    url: String,
    subject: String,
    cityName: String,
    countryName: String,
    props: {
        taglist: String,
        og_image: String
    },
    location: {
        lat: Number,
        lng: Number
    }
});

mongoose.model('post', Post);