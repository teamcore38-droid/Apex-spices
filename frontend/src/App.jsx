import { Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import CategoriesPage from './pages/CategoriesPage'
import CategoryPage from './pages/CategoryPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AboutPage from './pages/AboutPage'
import NotFoundPage from './pages/NotFoundPage'
import RouteLoadingScreen from './components/RouteLoadingScreen'
import RouteErrorBoundary from './components/RouteErrorBoundary'
import CookieConsentBanner from './components/CookieConsentBanner'
import { lazyWithChunkRecovery } from './utils/chunkLoadRecovery'

const ProductPage = lazyWithChunkRecovery(() => import('./pages/ProductPage'))
const CheckoutPage = lazyWithChunkRecovery(() => import('./pages/CheckoutPage'))
const ProfilePage = lazyWithChunkRecovery(() => import('./pages/ProfilePage'))
const ForgotPasswordPage = lazyWithChunkRecovery(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazyWithChunkRecovery(() => import('./pages/ResetPasswordPage'))
const TrackOrderPage = lazyWithChunkRecovery(() => import('./pages/TrackOrderPage'))
const ContactPage = lazyWithChunkRecovery(() => import('./pages/ContactPage'))
const FAQPage = lazyWithChunkRecovery(() => import('./pages/FAQPage'))
const TermsPage = lazyWithChunkRecovery(() => import('./pages/TermsPage'))
const PrivacyPage = lazyWithChunkRecovery(() => import('./pages/PrivacyPage'))
const ReturnsPage = lazyWithChunkRecovery(() => import('./pages/ReturnsPage'))
const ShippingPage = lazyWithChunkRecovery(() => import('./pages/ShippingPage'))
const AdminDashboard = lazyWithChunkRecovery(() => import('./pages/AdminDashboard'))
const AdminCategoriesPage = lazyWithChunkRecovery(() => import('./pages/AdminCategoriesPage'))
const AdminMessagesPage = lazyWithChunkRecovery(() => import('./pages/AdminMessagesPage'))
const AdminCommercePage = lazyWithChunkRecovery(() => import('./pages/AdminCommercePage'))
const AdminVendorsPage = lazyWithChunkRecovery(() => import('./pages/AdminVendorsPage'))
const AdminProfessionalPage = lazyWithChunkRecovery(() => import('./pages/AdminProfessionalPage'))
const AdminMobilePage = lazyWithChunkRecovery(() => import('./pages/AdminMobilePage'))
const VendorOnboardingPage = lazyWithChunkRecovery(() => import('./pages/VendorOnboardingPage'))
const VendorDashboardPage = lazyWithChunkRecovery(() => import('./pages/VendorDashboardPage'))
const RFQPage = lazyWithChunkRecovery(() => import('./pages/RFQPage'))
const CustomerExperiencePage = lazyWithChunkRecovery(() => import('./pages/CustomerExperiencePage'))
const PrivacyCenterPage = lazyWithChunkRecovery(() => import('./pages/PrivacyCenterPage'))
const AddProductPage = lazyWithChunkRecovery(() => import('./pages/AddProductPage'))
const EditProductPage = lazyWithChunkRecovery(() => import('./pages/EditProductPage'))
const OrderSuccessPage = lazyWithChunkRecovery(() => import('./pages/OrderSuccessPage'))
const OrderInvoicePage = lazyWithChunkRecovery(() => import('./pages/OrderInvoicePage'))
const AdminOrderDetailPage = lazyWithChunkRecovery(() => import('./pages/AdminOrderDetailPage'))
const AdminPackingSlipPage = lazyWithChunkRecovery(() => import('./pages/AdminPackingSlipPage'))

const ShopRedirect = () => {
  const { search } = useLocation()
  return <Navigate to={`/products${search}`} replace />
}

const ScrollToTop = () => {
  const { hash, pathname, search } = useLocation()

  useEffect(() => {
    if (hash) {
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [hash, pathname, search])

  return null
}

function App() {
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToTop />
      <Header />
      <main className="flex-grow">
        <RouteErrorBoundary locationKey={location.key}>
          <Suspense fallback={<RouteLoadingScreen />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop/*" element={<ShopRedirect />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/account" element={<ProfilePage />} />
              <Route path="/track-order" element={<TrackOrderPage />} />
              <Route path="/rfq" element={<RFQPage />} />
              <Route path="/customer-experience" element={<CustomerExperiencePage />} />
              <Route path="/vendor/onboarding" element={<VendorOnboardingPage />} />
              <Route path="/vendor/dashboard" element={<VendorDashboardPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/privacy-center" element={<PrivacyCenterPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/shipping" element={<ShippingPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/messages" element={<AdminMessagesPage />} />
              <Route path="/admin/commerce" element={<AdminCommercePage />} />
              <Route path="/admin/vendors" element={<AdminVendorsPage />} />
              <Route path="/admin/professional" element={<AdminProfessionalPage />} />
              <Route path="/admin/mobile" element={<AdminMobilePage />} />
              <Route path="/admin/products/new" element={<AddProductPage />} />
              <Route path="/admin/product/:id/edit" element={<EditProductPage />} />
              <Route path="/order/:id/confirm" element={<OrderSuccessPage />} />
              <Route path="/orders/:id" element={<OrderSuccessPage />} />
              <Route path="/orders/:id/invoice" element={<OrderInvoicePage />} />
              <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
              <Route path="/admin/orders/:id/invoice" element={<OrderInvoicePage />} />
              <Route path="/admin/orders/:id/packing-slip" element={<AdminPackingSlipPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </main>
      <Footer />
      <CookieConsentBanner />
    </div>
  )
}

export default App
