/**
 * ShippingSupportRule Model
 * Global shipping support rules set by admin
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export type ShippingRuleCondition = 'cart_total' | 'multi_store' | 'first_order' | 'campaign';
export type ShippingRuleScope = 'all' | 'multi_store_only' | 'new_customers';

export interface IShippingSupportRuleAttributes extends Timestamps {
    id: string;
    name: string;
    description: string | null;
    condition_type: ShippingRuleCondition;
    threshold_amount: number | null;
    scope: ShippingRuleScope;
    platform_contribution: number;
    is_active: boolean;
    start_date: Date | null;
    end_date: Date | null;
    priority: number;
    created_by: string | null;
}

export interface IShippingSupportRuleCreationAttributes extends Optional<IShippingSupportRuleAttributes, 'id' | 'description' | 'threshold_amount' | 'scope' | 'platform_contribution' | 'is_active' | 'start_date' | 'end_date' | 'priority' | 'created_by' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class ShippingSupportRule extends Model<IShippingSupportRuleAttributes, IShippingSupportRuleCreationAttributes> implements IShippingSupportRuleAttributes {
    public id!: string;
    public name!: string;
    public description!: string | null;
    public condition_type!: ShippingRuleCondition;
    public threshold_amount!: number | null;
    public scope!: ShippingRuleScope;
    public platform_contribution!: number;
    public is_active!: boolean;
    public start_date!: Date | null;
    public end_date!: Date | null;
    public priority!: number;
    public created_by!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public appliesTo(cart: { total: number; storeCount: number; isNewCustomer?: boolean }): boolean {
        switch (this.condition_type) {
            case 'cart_total':
                return cart.total >= (Number(this.threshold_amount) || 0);
            case 'multi_store':
                return cart.storeCount > 1;
            case 'first_order':
                return cart.isNewCustomer === true;
            case 'campaign':
                return true;
            default:
                return false;
        }
    }

    // Static Methods
    public static async findActiveRules(): Promise<ShippingSupportRule[]> {
        const now = new Date();
        return this.findAll({
            where: {
                is_active: true,
                [Op.and]: [
                    { [Op.or]: [{ start_date: null }, { start_date: { [Op.lte]: now } }] },
                    { [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: now } }] },
                ],
            },
            order: [['priority', 'ASC']],
        });
    }
}

ShippingSupportRule.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        name: { type: DataTypes.STRING(200), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        condition_type: { type: DataTypes.ENUM('cart_total', 'multi_store', 'first_order', 'campaign'), allowNull: false },
        threshold_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        scope: { type: DataTypes.ENUM('all', 'multi_store_only', 'new_customers'), defaultValue: 'all' },
        platform_contribution: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100, validate: { min: 0, max: 100 } },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        start_date: { type: DataTypes.DATE, allowNull: true },
        end_date: { type: DataTypes.DATE, allowNull: true },
        priority: { type: DataTypes.INTEGER, defaultValue: 10 },
        created_by: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    },
    {
        sequelize,
        modelName: 'ShippingSupportRule',
        tableName: 'shipping_support_rules',
        timestamps: true,
        indexes: [
            { fields: ['is_active'] },
            { fields: ['condition_type'] },
            { fields: ['priority'] },
            { fields: ['start_date', 'end_date'] },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
