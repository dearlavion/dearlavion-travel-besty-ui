import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { TravelComponent } from './travel/travel.component';
import { ShopComponent } from './shop/shop.component';
import { AboutComponent } from './about/about.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'travel', component: TravelComponent },
  { path: 'shop', component: ShopComponent },
  { path: 'about', component: AboutComponent },

  /* WILDCARD (must be last!!! will redirect to homepage) */
  { path: '**', redirectTo: '' },
];
