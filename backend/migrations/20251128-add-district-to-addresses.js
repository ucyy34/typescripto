'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('addresses', 'district', {
            type: Sequelize.STRING(100),
            allowNull: true,
            after: 'city'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('addresses', 'district');
    }
};
