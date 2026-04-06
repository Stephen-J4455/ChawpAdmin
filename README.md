# 🍽️ Chawp Admin Dashboard

A comprehensive admin dashboard for managing the Chawp food delivery platform. Built with React Native and Expo for cross-platform compatibility.

## 📱 Features

### 🏠 Dashboard

- **Real-time Statistics**: View total vendors, meals, orders, and users
- **Revenue Tracking**: Monitor total revenue across all orders
- **Order Status Overview**: See orders breakdown by status (pending, confirmed, preparing, etc.)
- **Recent Orders**: Quick view of the latest 10 orders

### 🏪 Vendor Management

- **CRUD Operations**: Create, Read, Update, and Delete vendors
- **Vendor Details**: Manage vendor information including:
  - Name, description, address
  - Contact information (phone, email)
  - Delivery time and distance
  - Status (active/inactive)
  - Ratings

### 🍽️ Meal Management

- **CRUD Operations**: Full meal management capabilities
- **Meal Information**:
  - Title, description, category
  - Price management
  - Vendor association
  - Status (available/unavailable)

### 📦 Orders Management

- **Order Viewing**: Browse all orders with filtering by status
- **Order Details**: View complete order information including:
  - Customer details
  - Vendor information
  - Delivery address
  - Order items
  - Total amount
- **Status Updates**: Change order status through the workflow:
  - Pending → Confirmed → Preparing → Ready → Out for Delivery → Delivered
  - Can also mark as Cancelled

### 👥 Users Management

- **User Profiles**: View all registered users
- **User Details**: See user information including:
  - Full name and username
  - Contact information
  - Address
  - Join date
- **Order History**: View complete order history for each user

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase project (uses same database as Chawp app)

### Installation

1. **Navigate to the project directory**:

   ```bash
   cd ChawpAdmin
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure Supabase**:

   - The app is already configured to use the same Supabase project as the Chawp app
   - Credentials are in `src/config/supabase.js`

4. **Start the development server**:

   ```bash
   npm start
   ```

5. **Run on your device**:
   - **iOS**: Press `i` in the terminal or scan QR code with Camera app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in the terminal

## 🔐 Authentication

The admin dashboard uses Supabase authentication. To access:

1. Create an admin account in Supabase
2. Use the email and password to sign in through the app
3. Currently, any authenticated user can access admin features
4. For production, implement role-based access control (RBAC)

### Creating an Admin Account

You can create an admin account through:

1. Supabase Dashboard → Authentication → Users → Add User
2. Or programmatically through the sign-up flow (currently commented out in production)

## 📁 Project Structure

```
ChawpAdmin/
├── App.js                          # Main app component with navigation
├── src/
│   ├── components/
│   │   └── AdminAuthScreen.js      # Login screen
│   ├── contexts/
│   │   └── AdminAuthContext.js     # Authentication state management
│   ├── config/
│   │   └── supabase.js            # Supabase configuration
│   ├── pages/
│   │   ├── DashboardPage.js       # Analytics dashboard
│   │   ├── VendorsManagementPage.js   # Vendor CRUD
│   │   ├── MealsManagementPage.js     # Meal CRUD
│   │   ├── OrdersManagementPage.js    # Order management
│   │   └── UsersManagementPage.js     # User viewing
│   ├── services/
│   │   └── adminApi.js            # API service functions
│   └── theme.js                   # Design system (colors, spacing, etc.)
└── assets/                        # Images and icons
```

## 🎨 Design System

The app uses a consistent design system defined in `src/theme.js`:

- **Colors**: Primary (Orange), Secondary (Navy), functional colors
- **Spacing**: Consistent spacing scale (xs to xxxl)
- **Typography**: Defined text styles (h1-h4, body, caption)
- **Shadows**: Elevation system for depth
- **Border Radius**: Consistent rounding values

## 🔌 API Integration

The app connects to Supabase with the following tables:

- `chawp_vendors` - Restaurant/vendor information
- `chawp_meals` - Food items
- `chawp_orders` - Order records
- `chawp_order_items` - Items within orders
- `chawp_user_profiles` - User information
- `chawp_reviews` - Ratings and reviews

All API functions are in `src/services/adminApi.js`.

## 🛠️ Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser

### Adding New Features

1. **New Page**: Create in `src/pages/`
2. **New Component**: Create in `src/components/`
3. **New API Function**: Add to `src/services/adminApi.js`
4. **Update Navigation**: Modify `App.js` to include new page

## 📊 Analytics & Metrics

The dashboard tracks:

- Total vendors (active and inactive)
- Total meals (available and unavailable)
- Total orders (all statuses)
- Total registered users
- Total revenue from all completed orders
- Order distribution by status

## 🔒 Security Considerations

For production deployment:

1. **Implement RBAC**: Add role checking to ensure only admins can access
2. **Secure API Keys**: Move Supabase keys to environment variables
3. **Add Audit Logs**: Track admin actions for accountability
4. **Rate Limiting**: Implement request throttling
5. **Input Validation**: Validate all user inputs
6. **SSL/TLS**: Ensure all API calls use HTTPS

## 🚀 Deployment

### Building for Production

**Android (APK/AAB)**:

```bash
expo build:android
```

**iOS (IPA)**:

```bash
expo build:ios
```

**Web**:

```bash
expo build:web
```

### Publishing Updates

```bash
expo publish
```

## 🤝 Contributing

This is an admin dashboard for the Chawp food delivery platform. When contributing:

1. Follow the existing code style
2. Use the theme system for consistency
3. Add proper error handling
4. Test on both iOS and Android
5. Update documentation for new features

## 📝 License

This project is part of the Chawp food delivery platform.

## 🆘 Support

For issues or questions:

1. Check the Chawp main app documentation
2. Review Supabase documentation
3. Check Expo documentation for platform-specific issues

## 🔄 Syncing with Main App

The admin dashboard shares the same database as the Chawp user app:

- Changes made in admin reflect immediately in user app
- Same Supabase project and credentials
- Consistent data models and API structure

---

**Built with ❤️ for Chawp Food Delivery Platform**
