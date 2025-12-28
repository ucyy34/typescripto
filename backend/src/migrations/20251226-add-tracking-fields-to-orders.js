'use strict';

/**
 * Migration: Add tracking fields to orders table
 * Phase 8.1: Fulfillment & Shipping V2
 * 
 * Adds: tracking_number, carrier, shipped_at, delivered_at
 * Also updates status ENUM to include: processing, shipped, delivered
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // 1. Add tracking columns
            await queryInterface.addColumn('orders', 'tracking_number', {
                type: Sequelize.STRING(100),
                allowNull: true,
                comment: 'Shipping tracking number',
            }, { transaction });

            await queryInterface.addColumn('orders', 'carrier', {
                type: Sequelize.STRING(100),
                allowNull: true,
                comment: 'Shipping carrier name',
            }, { transaction });

            await queryInterface.addColumn('orders', 'shipped_at', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'When order was shipped',
            }, { transaction });

            await queryInterface.addColumn('orders', 'delivered_at', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'When order was delivered',
            }, { transaction });

            // 2. Check if status column is ENUM type (Postgres)
            // If so, we need to add new enum values
            const dialect = queryInterface.sequelize.getDialect();

            if (dialect === 'postgres') {
                // Add new enum values to order_status type if it exists
                // Using raw SQL for enum modification
                await queryInterface.sequelize.query(`
                    DO $$ 
                    BEGIN
                        -- Add processing if not exists
                        BEGIN
                            ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'processing';
                        EXCEPTION WHEN duplicate_object THEN
                            NULL;
                        END;
                        
                        -- Add shipped if not exists
                        BEGIN
                            ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'shipped';
                        EXCEPTION WHEN duplicate_object THEN
                            NULL;
                        END;
                        
                        -- Add delivered if not exists
                        BEGIN
                            ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'delivered';
                        EXCEPTION WHEN duplicate_object THEN
                            NULL;
                        END;
                    END $$;
                `, { transaction });
            }

            // 3. Add index for shipped_at for delivery tracking queries
            await queryInterface.addIndex('orders', ['shipped_at'], {
                name: 'orders_shipped_at_idx',
                where: { shipped_at: { [Sequelize.Op.ne]: null } },
                transaction,
            });

            await transaction.commit();
            console.log('✅ Migration: Added tracking fields to orders table');
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            await queryInterface.removeIndex('orders', 'orders_shipped_at_idx', { transaction });
            await queryInterface.removeColumn('orders', 'delivered_at', { transaction });
            await queryInterface.removeColumn('orders', 'shipped_at', { transaction });
            await queryInterface.removeColumn('orders', 'carrier', { transaction });
            await queryInterface.removeColumn('orders', 'tracking_number', { transaction });

            await transaction.commit();
            console.log('✅ Migration rollback: Removed tracking fields from orders table');
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
