'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // CLEAN SLATE: Drop existing tables if they exist to ensure consistent schema
        // Cascade dropping is safest for dev environment reset
        await queryInterface.sequelize.query('DROP TABLE IF EXISTS "cart_items" CASCADE;');
        await queryInterface.sequelize.query('DROP TABLE IF EXISTS "carts" CASCADE;');

        // 1. Create Carts Table
        await queryInterface.createTable('carts', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            }
        });

        // 2. Create Cart Items Table
        await queryInterface.createTable('cart_items', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
            },
            cart_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'carts',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            product_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'products',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            quantity: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    min: 1,
                },
            },
            price_cents: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'Unit price in cents at time of adding',
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // 3. Add Unique Constraint
        await queryInterface.addConstraint('cart_items', {
            fields: ['cart_id', 'product_id'],
            type: 'unique',
            name: 'unique_cart_product',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('cart_items');
        await queryInterface.dropTable('carts');
    },
};
