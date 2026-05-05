import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class SwalService {
  success(message: string, title = 'Éxito'): void {
    Swal.fire({
      icon: 'success',
      title,
      text: message,
      confirmButtonColor: '#4a7c59',
      confirmButtonText: 'Aceptar',
      timer: 3000,
      timerProgressBar: true,
    });
  }

  error(message: string, title = 'Error'): void {
    Swal.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Aceptar',
    });
  }

  warning(message: string, title = 'Atención'): void {
    Swal.fire({
      icon: 'warning',
      title,
      text: message,
      confirmButtonColor: '#d97706',
      confirmButtonText: 'Aceptar',
    });
  }

  info(message: string, title = 'Información'): void {
    Swal.fire({
      icon: 'info',
      title,
      text: message,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Aceptar',
    });
  }

  async confirm(
    message: string,
    title = '¿Estás seguro?',
    confirmText = 'Sí, confirmar',
    cancelText = 'Cancelar'
  ): Promise<boolean> {
    const result = await Swal.fire({
      icon: 'warning',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b665c',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    });
    return result.isConfirmed;
  }
}
