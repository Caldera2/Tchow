import { MENU_CATEGORIES, MENU_ITEMS } from './menuData';

export const products = MENU_ITEMS;
export const categories = MENU_CATEGORIES;

export const faqs = [
  { id: 'ordering-1', group: 'Ordering', question: 'How far ahead can I place an order?', answer: 'Orders can be planned ahead in the frontend preview. Final cut-off times will be confirmed when live operations are connected.' },
  { id: 'delivery-1', group: 'Delivery', question: 'When will my delivery arrive?', answer: 'Delivery timing is estimated after your area and order details are reviewed.' },
  { id: 'boxes-1', group: 'Custom boxes', question: 'Can I create my own box?', answer: 'Yes. Use Build Your Box to choose a size, snacks, drink, and dessert.' },
  { id: 'catering-1', group: 'Catering', question: 'Do you cater for office events?', answer: 'The catering preview supports corporate breakfasts, meetings, celebrations, and private events.' },
  { id: 'payments-1', group: 'Payments', question: 'Can I pay online?', answer: 'Payment methods are coming soon. This prototype does not process payments.' },
  { id: 'dietary-1', group: 'Dietary requirements', question: 'Can I share dietary requirements?', answer: 'Add notes to an order or enquiry so requirements can be reviewed before fulfilment.' },
  { id: 'partnerships-1', group: 'Partnership enquiries', question: 'How do partnership conversations work?', answer: 'Submit preliminary interest for a future review workflow. No return is guaranteed and no investment is confirmed.' },
];

export const mockOrders = [
  { id: 'TC-42108', customer: 'Amaka Okafor', items: ['The Tchow Box'], total: 6500, status: 'Received for review', date: '20 Aug 2026' },
  { id: 'TC-42107', customer: 'Dami Adeyemi', items: ['Weekend Bliss Platter'], total: 8500, status: 'Preparing', date: '19 Aug 2026' },
  { id: 'TC-42106', customer: 'Nneka James', items: ['Classic Party Pack'], total: 18000, status: 'Ready for dispatch', date: '18 Aug 2026' },
];

export const mockCateringEnquiries = [
  { id: 'CE-1042', name: 'Amaka Okafor', event: 'Corporate breakfast', date: '28 Aug 2026', guests: 30, location: 'Ikeja', status: 'New' },
  { id: 'CE-1041', name: 'Dami Adeyemi', event: 'Birthday event', date: '04 Sep 2026', guests: 50, location: 'Lekki', status: 'Reviewing' },
];

export const mockPartnershipApplications = [
  { id: 'PA-204', name: 'Amaka Okafor', pathway: 'Strategic partnership', contribution: '₦500,000 - ₦2,000,000', date: '20 Aug 2026', status: 'New' },
  { id: 'PA-203', name: 'Dami Adeyemi', pathway: 'Equipment partnership', contribution: 'Commercial kitchen equipment', date: '14 Aug 2026', status: 'Under review' },
];

export const mockProfile = { name: 'Amaka Okafor', email: 'amaka@example.com', phone: '+234 800 000 0000', communication: 'Email', address: '12 Example Street, Ikeja, Lagos', dietaryNotes: '' };
