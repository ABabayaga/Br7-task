import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { HomePage } from './HomePage.js';

describe('HomePage', () => {
  it('shows a welcome message and a link to Projetos', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /bem-vindo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver projetos/i })).toHaveAttribute('href', '/projetos');
  });
});
