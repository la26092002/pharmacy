const mongoose = require('mongoose');

const ActorSchema = new mongoose.Schema({
    nom: {
        type: String,
        require: true
    },
    prenom: {
        type: String,
        require: true
    },
    telephone: {
        type: String,
        require: true,
        unique: true
    },
    email: {
        type: String,
        require: true,
        unique: true
    },
    willaya: {
        type: String,
        require: true
    },
    category: {
        type: String,
        require: true
    },
    dataPdf: {
        type: String,
        require: true
    },
    password: {
        type: String,
        require: true
    },
    status: {
        type: Boolean,
        default: true,
    },
    subscribes: [
        {
            from: {
                type: Date,
                required: true
            },
            to: {
                type: Date,
                required: true
            },
        }
    ],
    date: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('actor', ActorSchema);