import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ModalPermisos from './ModalPermisos';

describe('ModalPermisos Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    userName: 'Matias'
  };

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(<ModalPermisos {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza correctamente el titulo y los accesos', () => {
    render(<ModalPermisos {...defaultProps} />);
    expect(screen.getByText('Permisos de Matias')).toBeDefined();
    expect(screen.getByText('Venta')).toBeDefined();
  });

  it('llama a la funcion onClose al hacer clic en el boton X', () => {
    render(<ModalPermisos {...defaultProps} />);
    const btnCerrar = screen.getByLabelText('Cerrar modal');
    fireEvent.click(btnCerrar);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('llama a la funcion onSave con los permisos al guardar', () => {
    render(<ModalPermisos {...defaultProps} />);
    const btnGuardar = screen.getByText('Guardar permisos');
    fireEvent.click(btnGuardar);
    expect(mockOnSave).toHaveBeenCalled();
  });
});