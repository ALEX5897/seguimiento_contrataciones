import mongoose from 'mongoose';

const actividadesSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
    },
    descripcion: {
        type: String,
        required: true,
    },
    fechaCreacion: {
        type: Date,
        default: Date.now,
    },
    estado: {
        type: String,
        enum: ['pendiente', 'en progreso', 'completado'],
        default: 'pendiente',
    },
});

const ActividadesModel = mongoose.model('Actividad', actividadesSchema);

export default ActividadesModel;