import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { TravelComponent } from './travel/travel.component';
import { ShopComponent } from './shop/shop.component';
import { AboutComponent } from './about/about.component';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { ProductDetailComponent } from './product/product-detail.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'travel', component: TravelComponent },
  { path: 'shop', component: ShopComponent },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: 'about', component: AboutComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },

  /* WILDCARD (must be last!!! will redirect to homepage) */
  { path: '**', redirectTo: '' },
];
