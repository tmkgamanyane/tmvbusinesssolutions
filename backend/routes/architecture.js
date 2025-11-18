const express = require('express');
const { query } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all projects for user
router.get('/projects', auth.verifyToken, async (req, res) => {
    try {
        const projects = await query(
            `SELECT * FROM architecture_projects WHERE client_id = ? ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            data: projects
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Create new project
router.post('/projects', auth.verifyToken, async (req, res) => {
    try {
        const {
            project_type,
            project_name,
            location,
            size,
            budget,
            timeline,
            floors,
            rooms,
            additional_notes
        } = req.body;

        const result = await query(
            `INSERT INTO architecture_projects 
            (client_id, project_type, project_name, location, size, budget, timeline, floors, rooms, additional_notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, project_type, project_name, location, size, budget, timeline, floors, rooms, additional_notes]
        );

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            projectId: result.insertId
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Add project features
router.post('/projects/:id/features', auth.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { features } = req.body;

        // Verify project ownership
        const project = await query('SELECT id FROM architecture_projects WHERE id = ? AND client_id = ?', [id, req.user.id]);
        if (!project.length) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Insert features
        for (const feature of features) {
            await query(
                'INSERT INTO project_features (project_id, feature_name) VALUES (?, ?)',
                [id, feature]
            );
        }

        res.json({
            success: true,
            message: 'Features added successfully'
        });
    } catch (error) {
        console.error('Add features error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;