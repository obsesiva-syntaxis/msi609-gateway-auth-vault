import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { Protected } from './protected.decorator';
import { Roles } from './roles.decorator';

// Datos en memoria: el DELETE no persiste, solo demuestra la autorizacion.
const PRODUCTS = [
  { id: 1, name: 'Notebook', price: 900000 },
  { id: 2, name: 'Monitor', price: 250000 },
];

const ORDERS = [
  { id: 1001, status: 'paid' },
  { id: 1002, status: 'pending' },
];

@Controller()
export class BusinessController {
  @Get('health')
  health() {
    return { status: 'OK' };
  }

  @Get('products')
  @Protected()
  products(@Req() req: any) {
    return { authenticated_user: req.identity, products: PRODUCTS };
  }

  @Get('orders')
  @Protected()
  orders(@Req() req: any) {
    return { authenticated_user: req.identity, orders: ORDERS };
  }

  @Delete('products/:id')
  @Protected()
  @Roles('admin')
  deleteProduct(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    if (!PRODUCTS.some((p) => p.id === id)) {
      throw new NotFoundException('Producto no encontrado');
    }
    return { deleted: id, deleted_by: req.identity.username };
  }
}
