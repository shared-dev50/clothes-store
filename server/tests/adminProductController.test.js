"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const adminProductController_1 = require("../src/controllers/adminProductController");
const db_1 = __importDefault(require("../src/config/db"));
describe('adminProductController.updateProduct', () => {
    let req;
    let res;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        res = {
            json: jsonMock,
            status: statusMock,
        };
    });
    afterAll(async () => {
        await db_1.default.$disconnect();
    });
    it('should update a product and reconcile variants', async () => {
        // 1. Setup data
        // Create category
        const category = await db_1.default.category.create({
            data: { name: 'Test Category', slug: 'test-category-' + Date.now() }
        });
        // Create product
        const product = await db_1.default.product.create({
            data: {
                name: 'Test Product',
                slug: 'test-product-' + Date.now(),
                description: 'Test',
                price: 100,
                categoryId: category.id,
                variants: {
                    create: [
                        { color: 'Red', size: 'M', sku: 'TEST-RED-M-' + Date.now(), stock: 10 },
                        { color: 'Blue', size: 'L', sku: 'TEST-BLU-L-' + Date.now(), stock: 5 },
                    ]
                }
            },
            include: { variants: true }
        });
        const redVariant = product.variants.find(v => v.color === 'Red');
        const blueVariant = product.variants.find(v => v.color === 'Blue');
        // Add an order referencing the Red variant
        const user = await db_1.default.user.create({
            data: { email: 'test@example.com-' + Date.now(), passwordHash: 'hash' }
        });
        const order = await db_1.default.order.create({
            data: {
                orderNumber: 'ORD-' + Date.now(),
                customerName: 'Test',
                customerEmail: 'test@example.com',
                customerPhone: '123',
                deliveryAddress: '123 Test St',
                county: 'Nairobi',
                subtotal: 100,
                deliveryFee: 0,
                total: 100,
                userId: user.id,
                items: {
                    create: [
                        {
                            productName: 'Test Product',
                            quantity: 1,
                            unitPrice: 100,
                            totalPrice: 100,
                            productId: product.id,
                            variantId: redVariant.id
                        }
                    ]
                }
            }
        });
        // 2. Perform update
        // Keep red (ordered), delete blue (unreferenced), add green (new)
        req = {
            params: { id: product.id },
            body: {
                name: 'Test Product Updated',
                description: 'Test',
                price: 150,
                categoryId: category.id,
                images: [],
                variants: [
                    // Keeping red, modifying stock
                    { id: redVariant.id, color: 'Red', size: 'M', sku: redVariant.sku, stock: 20 },
                    // New variant
                    { color: 'Green', size: 'S', sku: '', stock: 15 }
                    // Omitting blue to delete it
                ]
            }
        };
        await (0, adminProductController_1.updateProduct)(req, res);
        // 3. Assertions
        expect(jsonMock).toHaveBeenCalled();
        const responseData = jsonMock.mock.calls[0][0];
        expect(responseData).toBeDefined();
        // Refresh variants from DB
        const updatedVariants = await db_1.default.productVariant.findMany({
            where: { productId: product.id },
            orderBy: { color: 'asc' }
        });
        // Should have Red (kept) and Green (new)
        // Blue should be deleted
        expect(updatedVariants.length).toBe(2);
        const updatedRed = updatedVariants.find(v => v.color === 'Red');
        expect(updatedRed).toBeDefined();
        expect(updatedRed?.stock).toBe(20);
        expect(updatedRed?.id).toBe(redVariant.id); // ID must be preserved
        const newGreen = updatedVariants.find(v => v.color === 'Green');
        expect(newGreen).toBeDefined();
        expect(newGreen?.sku).toContain('TES-GRE-S-'); // Generated SKU
        expect(newGreen?.stock).toBe(15);
        const deletedBlue = await db_1.default.productVariant.findUnique({ where: { id: blueVariant.id } });
        expect(deletedBlue).toBeNull();
        // 4. Test removing referenced variant
        // Now try to update and remove Red (which is referenced by order)
        req.body.variants = [
            { id: newGreen.id, color: 'Green', size: 'S', sku: newGreen.sku, stock: 15 }
            // omitting red
        ];
        await (0, adminProductController_1.updateProduct)(req, res);
        // Red should NOT be deleted, but stock set to 0
        const finalVariants = await db_1.default.productVariant.findMany({
            where: { productId: product.id }
        });
        expect(finalVariants.length).toBe(2);
        const finalRed = finalVariants.find(v => v.id === redVariant.id);
        expect(finalRed).toBeDefined();
        expect(finalRed?.isArchived).toBe(true);
        expect(finalRed?.stock).toBe(20); // Should retain stock, just archived
        // 5. Test invalid variant ID
        req.body.variants = [
            { id: 'some-invalid-uuid', color: 'Purple', size: 'M', stock: 1, sku: '123' }
        ];
        jsonMock.mockClear();
        statusMock.mockClear();
        await (0, adminProductController_1.updateProduct)(req, res);
        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock.mock.calls[0][0].error).toContain('does not belong to this product');
    });
});
