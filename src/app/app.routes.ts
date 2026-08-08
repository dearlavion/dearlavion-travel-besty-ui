import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { TravelComponent } from './travel/travel.component';
import { ShopComponent } from './shop/shop.component';
import { AboutComponent } from './about/about.component';
import { FaqComponent } from './faq/faq.component';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { ProductDetailComponent } from './product/product-detail.component';
import { MyKitComponent } from './my-kit/my-kit.component';
import { MyCollectionComponent } from './my-collection/my-collection.component';
import { SavedKitDetailComponent } from './my-collection/saved-kit-detail/saved-kit-detail.component';
import { CartComponent } from './cart/cart.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { AdminShellComponent } from './admin/admin-shell/admin-shell.component';
import { AdminProductListComponent } from './admin/product-list/admin-product-list.component';
import { AdminProductFormComponent } from './admin/product-form/admin-product-form.component';
import { AdminProductItemFormComponent } from './admin/product-item-form/admin-product-item-form.component';
import { AdminPopularKitsComponent } from './admin/popular-kits/admin-popular-kits.component';
import { AdminPopularKitFormComponent } from './admin/popular-kits/admin-popular-kit-form.component';
import { AdminInventoryComponent } from './admin/inventory/admin-inventory.component';
import { AdminPaymentsComponent } from './admin/payments/admin-payments.component';
import { AdminOrdersComponent } from './admin/orders/admin-orders.component';
import { AdminOrderDetailComponent } from './admin/orders/order-detail/admin-order-detail.component';
import { AdminStatisticsComponent } from './admin/statistics/admin-statistics.component';
import { AdminSettingsComponent } from './admin/settings/admin-settings.component';
import { AdminUserListComponent } from './admin/users/admin-user-list.component';
import { AdminUserFormComponent } from './admin/users/admin-user-form.component';
import { AdminKitSettingsComponent } from './admin/kit-settings/admin-kit-settings.component';
import { AdminMasterDataComponent } from './admin/master-data/admin-master-data.component';
import { AdminMasterDataCollectionComponent } from './admin/master-data/admin-master-data-collection.component';
import { AdminMasterDataItemFormComponent } from './admin/master-data/admin-master-data-item-form.component';
import { ProfileShellComponent } from './profile/profile-shell/profile-shell.component';
import { ProfileSettingsComponent } from './profile/settings/profile-settings.component';
import { TrackPackagesComponent } from './profile/track-packages/track-packages.component';
import { TrackPackageDetailComponent } from './profile/track-packages/order-detail/track-package-detail.component';
import { AddPaymentComponent } from './checkout/add-payment/add-payment.component';
import { requireLoginGuard } from './auth/require-login.guard';
import { requireAdminGuard } from './auth/require-admin.guard';
import { confirmLeaveMyKitGuard } from './my-kit/confirm-leave.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'travel', component: TravelComponent },
  { path: 'shop', component: ShopComponent },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: 'product/:id/items/:itemId', component: ProductDetailComponent },
  { path: 'my-kit', component: MyKitComponent, canDeactivate: [confirmLeaveMyKitGuard] },
  { path: 'my-kit/:savedId', component: MyKitComponent },
  { path: 'popular/:id', component: MyKitComponent },
  {
    path: 'profile',
    component: ProfileShellComponent,
    canActivate: [requireLoginGuard],
    children: [
      { path: '', redirectTo: 'collection', pathMatch: 'full' },
      { path: 'collection', component: MyCollectionComponent },
      { path: 'collection/:id', component: SavedKitDetailComponent },
      { path: 'orders', component: TrackPackagesComponent },
      { path: 'orders/:id', component: TrackPackageDetailComponent },
      { path: 'settings', component: ProfileSettingsComponent },
    ],
  },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent, canActivate: [requireLoginGuard] },
  { path: 'checkout/pay/:orderId', component: AddPaymentComponent, canActivate: [requireLoginGuard] },
  { path: 'about', component: AboutComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  {
    path: 'admin',
    component: AdminShellComponent,
    canActivate: [requireLoginGuard],
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      { path: 'products', component: AdminProductListComponent },
      { path: 'products/new', component: AdminProductFormComponent },
      { path: 'products/:id/edit', component: AdminProductFormComponent },
      { path: 'products/:productId/items/new', component: AdminProductItemFormComponent },
      { path: 'products/:productId/items/:itemId/edit', component: AdminProductItemFormComponent },
      { path: 'popular-kits', component: AdminPopularKitsComponent },
      { path: 'popular-kits/new', component: AdminPopularKitFormComponent },
      { path: 'popular-kits/:id/edit', component: AdminPopularKitFormComponent },
      { path: 'inventory', component: AdminInventoryComponent },
      { path: 'payments', component: AdminPaymentsComponent },
      { path: 'orders', component: AdminOrdersComponent },
      { path: 'orders/:id', component: AdminOrderDetailComponent },
      { path: 'statistics', component: AdminStatisticsComponent },
      { path: 'settings', component: AdminSettingsComponent },
      { path: 'users', component: AdminUserListComponent, canActivate: [requireAdminGuard] },
      { path: 'users/new', component: AdminUserFormComponent, canActivate: [requireAdminGuard] },
      { path: 'users/:username', component: AdminUserFormComponent, canActivate: [requireAdminGuard] },
      { path: 'kit-settings', component: AdminKitSettingsComponent, canActivate: [requireAdminGuard] },
      { path: 'master', component: AdminMasterDataComponent, canActivate: [requireAdminGuard] },
      { path: 'master/:collection', component: AdminMasterDataCollectionComponent, canActivate: [requireAdminGuard] },
      {
        path: 'master/:collection/:id/edit',
        component: AdminMasterDataItemFormComponent,
        canActivate: [requireAdminGuard],
      },
    ],
  },

  /* WILDCARD (must be last!!! will redirect to homepage) */
  { path: '**', redirectTo: '' },
];
