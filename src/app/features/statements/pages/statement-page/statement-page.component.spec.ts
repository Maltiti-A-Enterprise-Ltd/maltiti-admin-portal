import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { StatementPageComponent } from './statement-page.component';
import { StatementApiService } from '../../services/statement-api.service';
import { Statement } from '../../models/statement.model';

/**
 * Which ledger the page asks for. It opens on the customers who owe, since
 * that is the list someone is going to work through.
 */
describe('StatementPageComponent', () => {
  const statement = {
    openingBalance: 0,
    rows: [],
    totals: { charged: 0, paid: 0, closingBalance: 0 },
    customerId: null,
    customerName: 'Customers who owe',
    owingOnly: true,
    from: null,
    to: null,
    customerCount: 0,
  } as Statement;

  let api: jasmine.SpyObj<StatementApiService>;
  let page: StatementPageComponent;

  beforeEach(() => {
    api = jasmine.createSpyObj<StatementApiService>('StatementApiService', ['get', 'download']);
    api.get.and.returnValue(of(statement));

    TestBed.configureTestingModule({
      providers: [MessageService, { provide: StatementApiService, useValue: api }],
    });

    page = TestBed.runInInjectionContext(() => new StatementPageComponent());
  });

  it('opens on the customers who owe', () => {
    page.ngOnInit();

    expect(api.get).toHaveBeenCalledOnceWith(jasmine.objectContaining({ owingOnly: true }));
    expect(page.statement()).toEqual(statement);
    expect(page.isFiltered()).toBeFalse();
  });

  it('shows every customer once the box is unticked', () => {
    page.owingOnlyControl.setValue(false);
    page.load();

    expect(api.get.calls.mostRecent().args[0].owingOnly).toBeUndefined();
    expect(page.isFiltered()).toBeTrue();
  });

  // Looking one customer up should show them whatever they owe.
  it('does not narrow a single customer', () => {
    page.customerControl.setValue('c1');
    page.load();

    expect(api.get.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ customerId: 'c1', owingOnly: undefined }),
    );
  });

  it('goes back to the customers who owe when cleared', () => {
    page.owingOnlyControl.setValue(false);
    page.clearFilters();

    expect(page.owingOnlyControl.value).toBeTrue();
    expect(api.get.calls.mostRecent().args[0].owingOnly).toBeTrue();
  });
});
