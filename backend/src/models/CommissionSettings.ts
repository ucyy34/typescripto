/**
 * CommissionSettings Model
 * Defines commission rates and rules for stores
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export type CommissionType = 'percentage' | 'fixed' | 'tiered' | 'category_based';

export interface ICommissionSettingsAttributes extends Timestamps {
    id: string;
    store_id: string | null;
    commission_type: CommissionType;
    default_rate: number;
    min_commission: number;
    max_commission: number | null;
    is_active: boolean;
    applied_from: Date;
    applied_until: Date | null;
    notes: string | null;
}

export interface ICommissionSettingsCreationAttributes extends Optional<ICommissionSettingsAttributes, 'id' | 'store_id' | 'commission_type' | 'default_rate' | 'min_commission' | 'max_commission' | 'is_active' | 'applied_from' | 'applied_until' | 'notes' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class CommissionSettings extends Model<ICommissionSettingsAttributes, ICommissionSettingsCreationAttributes> implements ICommissionSettingsAttributes {
    public id!: string;
    public store_id!: string | null;
    public commission_type!: CommissionType;
    public default_rate!: number;
    public min_commission!: number;
    public max_commission!: number | null;
    public is_active!: boolean;
    public applied_from!: Date;
    public applied_until!: Date | null;
    public notes!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public isValid(): boolean {
        if (!this.is_active) return false;
        const now = new Date();
        if (this.applied_from && now < this.applied_from) return false;
        if (this.applied_until && now > this.applied_until) return false;
        return true;
    }

    public calculateCommission(amount: number): number {
        let commission = 0;
        if (this.commission_type === 'percentage') {
            commission = amount * (Number(this.default_rate) / 100);
        } else if (this.commission_type === 'fixed') {
            commission = Number(this.default_rate);
        }
        if (this.min_commission && commission < Number(this.min_commission)) {
            commission = Number(this.min_commission);
        }
        if (this.max_commission && commission > Number(this.max_commission)) {
            commission = Number(this.max_commission);
        }
        return parseFloat(commission.toFixed(2));
    }

    // Static Methods
    public static async getActiveSettings(storeId: string): Promise<CommissionSettings | null> {
        let settings = await this.findOne({ where: { store_id: storeId, is_active: true }, order: [['createdAt', 'DESC']] });
        if (!settings) {
            settings = await this.findOne({ where: { store_id: null, is_active: true }, order: [['createdAt', 'DESC']] });
        }
        return settings;
    }

    public static async createDefaultSettings(): Promise<CommissionSettings> {
        return this.create({
            store_id: null,
            commission_type: 'percentage',
            default_rate: 15.00,
            min_commission: 5.00,
            max_commission: null,
            is_active: true,
            notes: 'Default global commission settings',
        });
    }
}

CommissionSettings.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        store_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'stores', key: 'id' }, onDelete: 'CASCADE' },
        commission_type: { type: DataTypes.ENUM('percentage', 'fixed', 'tiered', 'category_based'), defaultValue: 'percentage', allowNull: false },
        default_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 15.00, allowNull: false, validate: { min: 0, max: 100 } },
        min_commission: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
        max_commission: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        applied_from: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        applied_until: { type: DataTypes.DATE, allowNull: true },
        notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
        sequelize,
        modelName: 'CommissionSettings',
        tableName: 'commission_settings',
        timestamps: true,
        indexes: [
            { fields: ['store_id'] },
            { fields: ['is_active'] },
            { fields: ['applied_from', 'applied_until'] },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

// Hooks
CommissionSettings.beforeSave(async (settings: CommissionSettings) => {
    if (settings.commission_type === 'percentage' && (Number(settings.default_rate) < 0 || Number(settings.default_rate) > 100)) {
        throw new Error('Percentage commission rate must be between 0 and 100');
    }
    if (settings.min_commission && settings.max_commission && Number(settings.min_commission) > Number(settings.max_commission)) {
        throw new Error('Minimum commission cannot be greater than maximum');
    }
    if (settings.applied_from && settings.applied_until && settings.applied_from > settings.applied_until) {
        throw new Error('Start date cannot be after end date');
    }
});
