import { Routes } from '@angular/router';
import { SearchComponent } from './components/search/search';

export const routes: Routes = [
  { path: '', component: SearchComponent },
  // { path: '**', redirectTo: '' }
];
