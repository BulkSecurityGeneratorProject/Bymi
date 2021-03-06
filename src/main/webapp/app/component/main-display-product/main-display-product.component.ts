import { IUser, User } from './../../core/user/user.model';
import { SearchService } from './../../search/search.service';
import { Component, OnInit } from '@angular/core';
import { Product, IProduct } from '../../shared/model/product.model';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { OrderLine, OrderLineStatus } from 'app/shared/model/order-line.model';
import { __await } from 'tslib';
import { PlacedOrder, OrderStatus } from 'app/shared/model/placed-order.model';
import * as moment from 'moment';

@Component({
  selector: 'jhi-main-display-product',
  templateUrl: './main-display-product.component.html',
  styleUrls: ['./main-display-product.component.scss']
})
export class MainDisplayProductComponent implements OnInit {
  public product: Product;

  constructor(private activatedRoute: ActivatedRoute, private router: Router, public search: SearchService) {}

  ngOnInit() {
    this.activatedRoute.params.subscribe((params: Params) => {
      const todoId: string = params['id'];
      if (todoId) {
        const promise: Promise<HttpResponse<IProduct>> = this.search.findProductById(Number(todoId));
        promise.then((res: HttpResponse<IProduct>) => {
          this.product = res.body;
        });
      } else {
        this.product = { name: 'error', price: 0 };
      }
    });
  }

  // verifier produit dispo, creer orderline, ajouter ol à placed order, s'il existe, sinon le créer aussi, mettre à jour le produit
  async addProductToBasket() {
    let productFromdDB: Product;
    let orders: PlacedOrder[];
    let basket: PlacedOrder = null;
    let orderLineToAdd: OrderLine = null;
    const currentUser: User = await this.search.getCurrentUser().then((res: HttpResponse<IUser>) => res.body);

    await this.search.findProductById(this.product.id).then((res: HttpResponse<IProduct>) => {
      productFromdDB = res.body;
    });
    if (productFromdDB.quantity > 0) {
      await this.search.findOrdersByUser().then((res: HttpResponse<PlacedOrder[]>) => (orders = res.body));

      orders.forEach(order => {
        if (order.status === OrderStatus.BASKET) {
          basket = order;
        }
      });

      if (basket === null) {
        basket = new PlacedOrder(undefined, moment(), Math.round(Math.random() * 10000), OrderStatus.BASKET, undefined, currentUser);
        await this.search.createPlacedOrder(basket).then((res: HttpResponse<PlacedOrder>) => (basket = res.body));
      }

      orderLineToAdd = new OrderLine(undefined, 1, moment(), OrderLineStatus.RESERVED, this.product, basket);
      await this.search.createOrderLine(orderLineToAdd);

      productFromdDB.quantity = productFromdDB.quantity - 1;
      this.search.updateProduct(productFromdDB);
    }
  }
}
