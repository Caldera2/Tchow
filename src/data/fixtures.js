// Development-only records. Production repositories must fail clearly when unconfigured.
export const FIXTURE_MODE = 'development-fixtures';
export const isFixtureData = (record) => Boolean(record && record.__fixture === true);
export { products, categories, faqs, mockOrders, mockCateringEnquiries, mockPartnershipApplications, mockProfile } from './mockData';
