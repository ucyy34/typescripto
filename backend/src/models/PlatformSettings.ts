/**
 * PlatformSettings Model
 * Stores platform-wide configuration settings
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export type SettingValueType = 'string' | 'number' | 'boolean' | 'json';

export interface IPlatformSettingsAttributes extends Timestamps {
    id: string;
    key: string;
    value: string | null;
    value_type: SettingValueType;
    description: string | null;
    updated_by: string | null;
}

export interface IPlatformSettingsCreationAttributes extends Optional<IPlatformSettingsAttributes, 'id' | 'value' | 'value_type' | 'description' | 'updated_by' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class PlatformSettings extends Model<IPlatformSettingsAttributes, IPlatformSettingsCreationAttributes> implements IPlatformSettingsAttributes {
    public id!: string;
    public key!: string;
    public value!: string | null;
    public value_type!: SettingValueType;
    public description!: string | null;
    public updated_by!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Static Methods
    public static async getValue(key: string, defaultValue: any = null): Promise<any> {
        const setting = await this.findOne({ where: { key } });
        if (!setting) return defaultValue;

        switch (setting.value_type) {
            case 'number': return parseFloat(setting.value!) || defaultValue;
            case 'boolean': return setting.value === 'true';
            case 'json': try { return JSON.parse(setting.value!); } catch { return defaultValue; }
            default: return setting.value;
        }
    }

    public static async setValue(key: string, value: any, valueType: SettingValueType = 'string', updatedBy: string | null = null): Promise<PlatformSettings> {
        const stringValue = valueType === 'json' ? JSON.stringify(value) : String(value);
        const [setting] = await this.upsert({ key, value: stringValue, value_type: valueType, updated_by: updatedBy });
        return setting;
    }

    public static async initializeDefaults(): Promise<void> {
        const defaults = [
            { key: 'default_shipping_cost', value: '35.00', value_type: 'number', description: 'Varsayılan platform kargo maliyeti (TL)' },
            { key: 'free_shipping_global_threshold', value: '500', value_type: 'number', description: 'Global ücretsiz kargo eşiği (TL)' },
        ];
        for (const setting of defaults) {
            const existing = await this.findOne({ where: { key: setting.key } });
            if (!existing) await this.create(setting as any);
        }
    }
}

PlatformSettings.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        value: { type: DataTypes.TEXT, allowNull: true },
        value_type: { type: DataTypes.ENUM('string', 'number', 'boolean', 'json'), defaultValue: 'string' },
        description: { type: DataTypes.TEXT, allowNull: true },
        updated_by: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    },
    {
        sequelize,
        modelName: 'PlatformSettings',
        tableName: 'platform_settings',
        timestamps: true,
        indexes: [{ unique: true, fields: ['key'] }],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
