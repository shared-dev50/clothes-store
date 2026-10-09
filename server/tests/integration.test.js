"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const productService_1 = require("../src/services/productService");
const orderController_1 = require("../src/controllers/orderController");
const db_1 = __importDefault(require("../src/config/db"));
describe('Customer facing constraints for archived variants', () => {
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
    it('should exclude archived variants from customer API', async () => {
        // 1. Setup data
        const category = await db_1.default.category.create({
            data: { name: 'Customer API Test Category', slug: 'cat-test-' + Date.now() }
        });
        const product = await db_1.default.product.create({
            data: {
                name: 'API Test Product',
                slug: 'api-test-prod-' + Date.now(),
                description: 'Test',
                price: 100,
                categoryId: category.id,
                variants: {
                    create: [
                        { color: 'Red', size: 'M', sku: 'API-RED-M', stock: 10, isArchived: false },
                        { color: 'Blue', size: 'L', sku: 'API-BLU-L', stock: 5, isArchived: true }, // archived!
                    ]
                }
            },
            include: { variants: true }
        });
        // 2. Fetch using productService
        const products = await (0, productService_1.getProducts)({});
        const fetchedProduct = products.find(p => p.id === product.id);
        expect(fetchedProduct).toBeDefined();
        expect(fetchedProduct?.variants.length).toBe(1);
        expect(fetchedProduct?.variants[0].color).toBe('Red');
        // 3. Fetch by slug
        const fetchedBySlug = await (0, productService_1.getProductBySlug)(product.slug);
        expect(fetchedBySlug).toBeDefined();
        expect(fetchedBySlug?.variants.length).toBe(1);
        expect(fetchedBySlug?.variants[0].color).toBe('Red');
    });
    it('should reject purchase of archived variants in checkout', async () => {
        const category = await db_1.default.category.create({
            data: { name: 'Checkout Test Category', slug: 'checkout-cat-test-' + Date.now() }
        });
        const product = await db_1.default.product.create({
            data: {
                name: 'Checkout Test Product',
                slug: 'checkout-test-prod-' + Date.now(),
                description: 'Test',
                price: 100,
                categoryId: category.id,
                variants: {
                    create: [
                        { color: 'Black', size: 'M', sku: 'CHK-BLK-M', stock: 10, isArchived: true }, // archived!
                    ]
                }
            },
            include: { variants: true }
        });
        const archivedVariant = product.variants[0];
        // Try to create an order
        req = {
            body: {
                items: [
                    { productId: product.id, variantId: archivedVariant.id, quantity: 1 }
                ],
                customerName: 'Test',
                customerEmail: 'test@example.com',
                customerPhone: '123',
                deliveryAddress: '123 Test St',
                county: 'Nairobi',
            }
        };
        await (0, orderController_1.createOrder)(req, res);
        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock.mock.calls[0][0].error).toContain('is no longer available');
    });
});
