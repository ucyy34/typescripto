const { User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res) => {
    try {
        const { role, status, limit = 100, offset = 0 } = req.query;

        const where = {};

        // Filter by role if provided
        if (role) {
            where.role = role;
        }

        // Filter by status if provided (is_active)
        if (status) {
            where.is_active = status === 'active';
        }

        const users = await User.findAll({
            where,
            attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'createdAt', 'updatedAt'],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        const total = await User.count({ where });

        res.json({
            success: true,
            data: users,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('[User Controller] Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

/**
 * Get user by ID (admin only)
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id, {
            attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'createdAt', 'updatedAt']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('[User Controller] Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user',
            error: error.message
        });
    }
};

/**
 * Update user status (activate/suspend)
 */
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'is_active must be a boolean'
            });
        }

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent admin from deactivating themselves
        if (user.id === req.user.id && !is_active) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        user.is_active = is_active;
        await user.save();

        res.json({
            success: true,
            message: `User ${is_active ? 'activated' : 'suspended'} successfully`,
            data: {
                id: user.id,
                email: user.email,
                is_active: user.is_active
            }
        });
    } catch (error) {
        console.error('[User Controller] Error updating user status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user status',
            error: error.message
        });
    }
};

/**
 * Update user role (admin only)
 */
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const validRoles = ['buyer', 'seller', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent admin from changing their own role
        if (user.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot change your own role'
            });
        }

        user.role = role;
        await user.save();

        res.json({
            success: true,
            message: 'User role updated successfully',
            data: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('[User Controller] Error updating user role:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user role',
            error: error.message
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    updateUserRole
};
