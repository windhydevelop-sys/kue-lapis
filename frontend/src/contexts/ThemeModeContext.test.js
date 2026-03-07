import React from 'react';
import { render } from '@testing-library/react';
import { ThemeModeProvider } from './ThemeModeContext';

describe('ThemeModeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
  });

  it('sets theme-original on first load', () => {
    render(
      <ThemeModeProvider>
        <div />
      </ThemeModeProvider>
    );
    expect(document.body.classList.contains('theme-original')).toBe(true);
  });

  it('restores theme-light-mono from localStorage', () => {
    localStorage.setItem('themeMode', 'lightMono');
    render(
      <ThemeModeProvider>
        <div />
      </ThemeModeProvider>
    );
    expect(document.body.classList.contains('theme-light-mono')).toBe(true);
  });
});

