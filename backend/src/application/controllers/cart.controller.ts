import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/CartService';
import {
    CartResponseDTO,
    AddToCartDTO,
    UpdateCartItemDTO,
    GuestKeyHeaderSchema,
    CartItemIdParamDTO,
    MergeCartDTO
} from '../schemas/cart.schema';
import { ICart } from '../../domain/types/cart.types';
import { AuthenticatedRequest } from '../../domain/types/common.types';
import { UnprocessableError } from '../../shared/errors';

const cartService = new CartService();

// Helper to convert domain to DTO (decimal conversion)
const toDTO = (cart: ICart): CartResponseDTO => {
    return {
        id: cart.id,
        userId: cart.userId,
        guestKey: cart.guestKey,
        totalQuantity: cart.totalQuantity,
        totalPrice: cart.totalPriceCents / 100, // Cents -> Decimal
        updatedAt: new Date(cart.updatedAt).toISOString(),
        items: cart.items.map(item => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.priceCents / 100, // Cents -> Decimal
            totalPrice: (item.totalPriceCents || 0) / 100,
            productTitle: item.productTitle || '',
            productSlug: item.productSlug || '',
            productImage: item.productImage
        }))
    };
};

export class CartController {

    // ==========================================
    // AUTHENTICATED ROUTES
    // ==========================================

    /**
     * GET /api/v2/cart
     */
    static async getCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            console.log('[Cart V2] getCart called for user:', req.user?.id);
            const cart = await cartService.getCart(req.user!.id);
            console.log('[Cart V2] getCart success, items:', cart.items.length);
            res.json(toDTO(cart));
        } catch (error: any) {
            console.error('[Cart V2] getCart ERROR:', error.message);
            // Write error to file for debugging
            const fs = require('fs');
            fs.writeFileSync('cart-error.log', `${new Date().toISOString()}: ${error.message}\n${error.stack}\n`, { flag: 'a' });
            next(error);
        }
    }

    /**
     * POST /api/v2/cart/items
     */
    static async addToCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const input: AddToCartDTO = req.body;
            const cart = await cartService.addItem({ ...input, userId: req.user!.id });
            res.status(200).json(toDTO(cart));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/v2/cart/items/:id
     */
    static async updateItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id }: CartItemIdParamDTO = req.params;
            const { quantity }: UpdateCartItemDTO = req.body;
            const cart = await cartService.updateItem({ userId: req.user!.id }, id, quantity);
            res.json(toDTO(cart));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v2/cart/items/:id
     */
    static async removeItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id }: CartItemIdParamDTO = req.params;
            const cart = await cartService.removeItem({ userId: req.user!.id }, id);
            res.json(toDTO(cart));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v2/cart
     */
    static async clearCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const cart = await cartService.clearCart({ userId: req.user!.id });
            res.json(toDTO(cart));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v2/cart/merge
     * Accepts guest key from X-Guest-Key header (preferred) OR body.guestKey
     */
    static async mergeCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            // Accept from header OR body (header takes precedence)
            const body: MergeCartDTO = req.body;
            const guestKey = req.header('X-Guest-Key') || body?.guestKey;

            // Validate via Zod
            const result = GuestKeyHeaderSchema.safeParse(guestKey);
            if (!result.success) {
                return res.status(422).json({
                    success: false,
                    message: 'Invalid or missing guest key',
                    errors: result.error.issues
                });
            }

            const cart = await cartService.mergeGuestCart(req.user!.id, result.data);

            return res.json({
                ...toDTO(cart),
                nextGuestKeyRequired: true,
                mergedItemsCount: cart.items.length
            });
        } catch (error: any) {
            console.error('[Cart V2] mergeCart ERROR:', error.message);
            const fs = require('fs');
            fs.writeFileSync('cart-error.log', `${new Date().toISOString()}: MERGE ${error.message}\n${error.stack}\n`, { flag: 'a' });
            return next(error);
        }
    }

    // ==========================================
    // GUEST ROUTES
    // ==========================================

    // Helper to validate and extract guest key
    private static extractGuestKey(req: Request): string {
        const guestKey = req.header('X-Guest-Key');
        const result = GuestKeyHeaderSchema.safeParse(guestKey);
        if (!result.success) {
            throw new UnprocessableError('Invalid or missing X-Guest-Key header');
        }
        return result.data;
    }

    /**
     * GET /api/v2/cart/guest
     */
    static async getGuestCart(req: Request, res: Response, next: NextFunction) {
        try {
            const guestKey = CartController.extractGuestKey(req);
            const cart = await cartService.getGuestCart(guestKey);
            res.json(toDTO(cart));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v2/cart/guest/items
     */
    static async addToGuestCart(req: Request, res: Response, next: NextFunction) {
        try {
            const guestKey = CartController.extractGuestKey(req);
            const input: AddToCartDTO = req.body;
            const cart = await cartService.addItem({ ...input, guestKey });
            res.status(200).json(toDTO(cart));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/v2/cart/guest/items/:id
     */
    static async updateGuestItem(req: Request, res: Response, next: NextFunction) {
        try {
            const guestKey = CartController.extractGuestKey(req);
            const { id }: CartItemIdParamDTO = req.params;
            const { quantity }: UpdateCartItemDTO = req.body;
            const cart = await cartService.updateItem({ guestKey }, id, quantity);
            res.json(toDTO(cart));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v2/cart/guest/items/:id
     */
    static async removeGuestItem(req: Request, res: Response, next: NextFunction) {
        try {
            const guestKey = CartController.extractGuestKey(req);
            const { id }: CartItemIdParamDTO = req.params;
            const cart = await cartService.removeItem({ guestKey }, id);
            res.json(toDTO(cart));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v2/cart/guest
     */
    static async clearGuestCart(req: Request, res: Response, next: NextFunction) {
        try {
            const guestKey = CartController.extractGuestKey(req);
            const cart = await cartService.clearCart({ guestKey });
            res.json(toDTO(cart));
        } catch (error) {
            next(error);
        }
    }
}
