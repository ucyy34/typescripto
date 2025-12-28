/**
 * User Model
 * Represents buyers, sellers, and admins in the marketplace
 */

import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcrypt';
import { sequelize } from '../config/sequelize';
import { UserRole, Timestamps } from './types/model.types';

export interface IUserAttributes extends Timestamps {
    id: string;
    email: string;
    password_hash: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    role: UserRole;
    avatar: string | null;
    is_verified: boolean;
    is_active: boolean;
    verification_token: string | null;
    reset_password_token: string | null;
    reset_password_expires: Date | null;
    last_login_at: Date | null;
    last_login_ip: string | null;
    refresh_token: string | null;
}

export interface IUserCreationAttributes extends Optional<IUserAttributes, 'id' | 'first_name' | 'last_name' | 'phone' | 'avatar' | 'is_verified' | 'is_active' | 'verification_token' | 'reset_password_token' | 'reset_password_expires' | 'last_login_at' | 'last_login_ip' | 'refresh_token' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class User extends Model<IUserAttributes, IUserCreationAttributes> implements IUserAttributes {
    public id!: string;
    public email!: string;
    public password_hash!: string;
    public first_name!: string | null;
    public last_name!: string | null;
    public phone!: string | null;
    public role!: UserRole;
    public avatar!: string | null;
    public is_verified!: boolean;
    public is_active!: boolean;
    public verification_token!: string | null;
    public reset_password_token!: string | null;
    public reset_password_expires!: Date | null;
    public last_login_at!: Date | null;
    public last_login_ip!: string | null;
    public refresh_token!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Associations
    // public readonly store?: Store; // To be typed later once Store is migrated
    // public readonly cart?: Cart;
    // public readonly orders?: Order[];

    // Instance Methods
    public async comparePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password_hash);
    }

    public getFullName(): string {
        if (this.first_name && this.last_name) {
            return `${this.first_name} ${this.last_name}`;
        }
        return this.first_name || this.last_name || this.email.split('@')[0];
    }

    public toSafeObject(): Omit<IUserAttributes, 'password_hash' | 'refresh_token' | 'verification_token' | 'reset_password_token'> {
        const { password_hash, refresh_token, verification_token, reset_password_token, ...safeUser } = this.toJSON();
        return safeUser;
    }

    // Static Methods
    public static async hashPassword(password: string): Promise<string> {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
        return bcrypt.hash(password, rounds);
    }

    public static async findByEmail(email: string): Promise<User | null> {
        return this.findOne({ where: { email: email.toLowerCase().trim() } });
    }

    public static async createAdmin(data: Partial<IUserAttributes>): Promise<User> {
        return this.create({
            ...data,
            role: 'admin',
            is_verified: true,
            is_active: true,
        } as IUserCreationAttributes);
    }
}

User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: {
                    msg: 'Must be a valid email address',
                },
            },
            set(value: string) {
                this.setDataValue('email', value.toLowerCase().trim());
            },
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        first_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        last_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            validate: {
                is: {
                    args: /^[+]?[0-9\s()-]+$/,
                    msg: 'Phone number must contain only numbers, spaces, and valid characters',
                },
            },
        },
        role: {
            type: DataTypes.ENUM('buyer', 'seller', 'admin'),
            defaultValue: 'buyer',
            allowNull: false,
        },
        avatar: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        verification_token: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        reset_password_token: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        reset_password_expires: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        last_login_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        last_login_ip: {
            type: DataTypes.STRING(45),
            allowNull: true,
        },
        refresh_token: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'users',
        indexes: [
            {
                unique: true,
                fields: ['email'],
            },
            {
                fields: ['role'],
            },
            {
                fields: ['is_active'],
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

// Hooks
User.beforeCreate(async (user: User) => {
    if (user.password_hash && !user.password_hash.startsWith('$2')) {
        user.password_hash = await User.hashPassword(user.password_hash);
    }
});

User.beforeUpdate(async (user: User) => {
    if (user.changed('password_hash') && !user.password_hash.startsWith('$2')) {
        user.password_hash = await User.hashPassword(user.password_hash);
    }
});
