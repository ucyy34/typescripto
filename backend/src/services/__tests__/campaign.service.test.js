const { StatusCodes } = require('http-status-codes');
const { ApiError } = require('../../middlewares/errorHandler');

const mockStoreModel = {
  findOne: jest.fn(),
};

const mockProductModel = {
  findAll: jest.fn(),
};

const mockCategoryModel = {
  findAll: jest.fn(),
};

const mockCampaignModel = {
  create: jest.fn(),
  findAndCountAll: jest.fn(),
  findByPk: jest.fn(),
  getActiveCampaigns: jest.fn(),
  getCampaignsForProduct: jest.fn(),
  increment: jest.fn(),
};

const mockOrderModel = {
  findAll: jest.fn(),
};

jest.mock('../../models', () => ({
  Campaign: mockCampaignModel,
  Store: mockStoreModel,
  Product: mockProductModel,
  Category: mockCategoryModel,
  User: {},
  Order: mockOrderModel,
}));

const campaignService = require('../campaign.service');

describe('CampaignService API health checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('seller campaigns without store_id are rejected with BAD_REQUEST', async () => {
    await expect(
      campaignService.createCampaign({}, 'seller-1', 'seller')
    ).rejects.toMatchObject({
      message: 'Sellers must specify a store for campaigns',
      statusCode: StatusCodes.BAD_REQUEST,
    });

    expect(mockStoreModel.findOne).not.toHaveBeenCalled();
  });

  test('seller listing campaigns without a store returns NOT_FOUND', async () => {
    mockStoreModel.findOne.mockResolvedValue(null);

    await expect(
      campaignService.getAllCampaigns({}, 'seller', 'seller-1')
    ).rejects.toMatchObject({
      message: 'Store not found',
      statusCode: StatusCodes.NOT_FOUND,
    });

    expect(mockStoreModel.findOne).toHaveBeenCalledTimes(1);
  });

  test('seller cannot view another store campaign', async () => {
    mockCampaignModel.findByPk.mockResolvedValue({ id: 'cmp-1', store_id: 'store-2' });
    mockStoreModel.findOne.mockResolvedValue({ id: 'store-1' });

    await expect(
      campaignService.getCampaignById('cmp-1', 'seller', 'seller-1')
    ).rejects.toMatchObject({
      message: 'You do not have permission to view this campaign',
      statusCode: StatusCodes.FORBIDDEN,
    });
  });

  test('non-ApiError failures bubble up as 500 ApiError envelopes', async () => {
    expect.assertions(3);
    const unexpectedError = new Error('database offline');
    mockCampaignModel.getActiveCampaigns.mockRejectedValue(unexpectedError);

    try {
      await campaignService.getActiveCampaigns({});
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        message: 'Failed to fetch active campaigns',
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        errors: unexpectedError.message,
      });
    }

    expect(mockCampaignModel.getActiveCampaigns).toHaveBeenCalledTimes(1);
  });
});
