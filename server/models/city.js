var mongoose = require('mongoose');

var City = new mongoose.Schema({
    countryName: String,
    countryNameLower: String,
    countryId: Number,
    name: String,
    nameLower: String,
    id: Number
});

mongoose.model('city', City);