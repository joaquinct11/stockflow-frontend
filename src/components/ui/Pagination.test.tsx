import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from './Pagination';

/**
 * F-18.3 — Tests del componente Pagination (compartido entre Facturación y GRE).
 *
 * T-F18.3-01  Muestra rango correcto de registros
 * T-F18.3-02  La página activa aparece resaltada (bg-primary)
 * T-F18.3-03  Anterior llama onPageChange con página - 1
 * T-F18.3-04  Siguiente llama onPageChange con página + 1
 * T-F18.3-05  Anterior se deshabilita en la primera página
 * T-F18.3-06  Siguiente se deshabilita en la última página
 * T-F18.3-07  Clic en número de página llama onPageChange con ese número
 * T-F18.3-08  Retorna null si totalPages <= 1
 * T-F18.3-09  Muestra elipsis cuando hay muchas páginas
 */
describe('Pagination — F-18.3', () => {
  const baseProps = {
    currentPage: 1,
    totalPages: 2,
    totalItems: 11,
    itemsPerPage: 10,
    onPageChange: vi.fn(),
  };

  it('T-F18.3-01: muestra rango correcto de registros (1–10 de 11)', () => {
    render(<Pagination {...baseProps} />);
    expect(screen.getByText('1–10')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText(/registros/)).toBeInTheDocument();
  });

  it('T-F18.3-02: la página activa aparece resaltada con bg-primary', () => {
    render(<Pagination {...baseProps} currentPage={1} />);
    const btn1 = screen.getByRole('button', { name: '1' });
    expect(btn1.className).toMatch(/bg-primary/);
    const btn2 = screen.getByRole('button', { name: '2' });
    expect(btn2.className).not.toMatch(/bg-primary/);
  });

  it('T-F18.3-03: Anterior llama onPageChange con currentPage - 1', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...baseProps} currentPage={2} totalPages={3} totalItems={25} onPageChange={onPageChange} />);
    const anterior = screen.getAllByRole('button').find(b => b.querySelector('svg'));
    // El primer botón con icono es "Anterior"
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[0]); // primer botón = Anterior
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('T-F18.3-04: Siguiente llama onPageChange con currentPage + 1', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...baseProps} currentPage={1} totalPages={3} totalItems={25} onPageChange={onPageChange} />);
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[buttons.length - 1]); // último botón = Siguiente
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('T-F18.3-05: Anterior se deshabilita en la primera página', () => {
    render(<Pagination {...baseProps} currentPage={1} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled(); // Anterior
  });

  it('T-F18.3-06: Siguiente se deshabilita en la última página', () => {
    render(<Pagination {...baseProps} currentPage={2} totalPages={2} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[buttons.length - 1]).toBeDisabled(); // Siguiente
  });

  it('T-F18.3-07: clic en número de página llama onPageChange con ese número', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...baseProps} totalPages={3} totalItems={25} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('T-F18.3-08: retorna null si totalPages <= 1', () => {
    const { container } = render(<Pagination {...baseProps} totalPages={1} />);
    expect(container.firstChild).toBeNull();
  });

  it('T-F18.3-09: muestra elipsis cuando hay muchas páginas', () => {
    render(<Pagination {...baseProps} currentPage={5} totalPages={10} totalItems={100} />);
    // Con currentPage=5, totalPages=10 se muestran elipsis
    const dots = screen.getAllByText('…');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });
});
