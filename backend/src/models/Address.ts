/**
 * Address Model
 * Represents saved addresses for users (shipping/billing)
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export type AddressType = 'shipping' | 'billing' | 'both';

export interface IAddressAttributes extends Timestamps {
    id: string;
    user_id: string;
    type: AddressType;
    label: string | null;
    full_name: string;
    phone: string;
    email: string | null;
    address_line1: string;
    address_line2: string | null;
    city: string;
    district: string | null;
    state: string | null;
    postal_code: string;
    country: string;
    is_default: boolean;
    notes: string | null;
}

export interface IAddressCreationAttributes extends Optional<IAddressAttributes, 'id' | 'type' | 'label' | 'email' | 'address_line2' | 'district' | 'state' | 'country' | 'is_default' | 'notes' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class Address extends Model<IAddressAttributes, IAddressCreationAttributes> implements IAddressAttributes {
    public id!: string;
    public user_id!: string;
    public type!: AddressType;
    public label!: string | null;
    public full_name!: string;
    public phone!: string;
    public email!: string | null;
    public address_line1!: string;
    public address_line2!: string | null;
    public city!: string;
    public district!: string | null;
    public state!: string | null;
    public postal_code!: string;
    public country!: string;
    public is_default!: boolean;
    public notes!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public toOrderFormat(): any {
        return {
            full_name: this.full_name,
            phone: this.phone,
            address_line1: this.address_line1,
            address_line2: this.address_line2,
            city: this.city,
            district: this.district,
            state: this.state,
            postal_code: this.postal_code,
            country: this.country,
            notes: this.notes,
        };
    }

    public getFormattedAddress(): string {
        const parts = [this.address_line1];
        if (this.address_line2) parts.push(this.address_line2);
        parts.push(`${this.city}${this.district ? ', ' + this.district : ''}${this.state ? ', ' + this.state : ''} ${this.postal_code}`);
        parts.push(this.country);
        return parts.join('\n');
    }

    // Static Methods
    public static async getDefaultByType(userId: string, type: string): Promise<Address | null> {
        return this.findOne({
            where: {
                user_id: userId,
                type: [type, 'both'],
                is_default: true,
            },
            order: [['updatedAt', 'DESC']],
        });
    }

    public static async getUserAddresses(userId: string): Promise<Address[]> {
        return this.findAll({
            where: { user_id: userId },
            order: [['is_default', 'DESC'], ['updatedAt', 'DESC']],
        });
    }

    public static async setAsDefault(addressId: string, userId: string): Promise<void> {
        const transaction = await sequelize.transaction();
        try {
            await this.update({ is_default: false }, { where: { user_id: userId }, transaction });
            await this.update({ is_default: true }, { where: { id: addressId, user_id: userId }, transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

Address.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
        type: { type: DataTypes.ENUM('shipping', 'billing', 'both'), defaultValue: 'shipping', allowNull: false },
        label: { type: DataTypes.STRING(100), allowNull: true },
        full_name: { type: DataTypes.STRING(200), allowNull: false },
        phone: { type: DataTypes.STRING(20), allowNull: false },
        email: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: true } },
        address_line1: { type: DataTypes.STRING(255), allowNull: false },
        address_line2: { type: DataTypes.STRING(255), allowNull: true },
        city: { type: DataTypes.STRING(100), allowNull: false },
        district: { type: DataTypes.STRING(100), allowNull: true },
        state: { type: DataTypes.STRING(100), allowNull: true },
        postal_code: { type: DataTypes.STRING(20), allowNull: false },
        country: { type: DataTypes.STRING(100), defaultValue: 'Turkey', allowNull: false },
        is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
        notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
        sequelize,
        modelName: 'Address',
        tableName: 'addresses',
        timestamps: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['user_id', 'is_default'] },
            { fields: ['type'] },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

// Hooks
Address.beforeCreate(async (address: Address) => {
    if (address.is_default) {
        await Address.update({ is_default: false }, { where: { user_id: address.user_id } });
    }
});

Address.beforeUpdate(async (address: Address) => {
    if (address.changed('is_default') && address.is_default) {
        await Address.update({ is_default: false }, { where: { user_id: address.user_id, id: { [Op.ne]: address.id } } });
    }
});
