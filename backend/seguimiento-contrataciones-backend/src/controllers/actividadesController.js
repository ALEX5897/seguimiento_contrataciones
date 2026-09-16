import ActividadesModel from '../models/actividadesModel.js';

export class ActividadesController {
    async createActivity(req, res) {
        try {
            const newActivity = await ActividadesModel.create(req.body);
            res.status(201).json(newActivity);
        } catch (error) {
            res.status(500).json({ message: 'Error creating activity', error });
        }
    }

    async getActivities(req, res) {
        try {
            const activities = await ActividadesModel.find();
            res.status(200).json(activities);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving activities', error });
        }
    }

    async updateActivity(req, res) {
        try {
            const updatedActivity = await ActividadesModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!updatedActivity) {
                return res.status(404).json({ message: 'Activity not found' });
            }
            res.status(200).json(updatedActivity);
        } catch (error) {
            res.status(500).json({ message: 'Error updating activity', error });
        }
    }

    async deleteActivity(req, res) {
        try {
            const deletedActivity = await ActividadesModel.findByIdAndDelete(req.params.id);
            if (!deletedActivity) {
                return res.status(404).json({ message: 'Activity not found' });
            }
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: 'Error deleting activity', error });
        }
    }
}