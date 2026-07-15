import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopNavigationComponent } from './common/top-navigation/top-navigation.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopNavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
